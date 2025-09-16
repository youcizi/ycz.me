/**
 * 分类管理模块
 * 负责分类的增删改查和状态管理
 */
import dataSyncService from '../services/DataSyncService.js';

class CategoryManager {
    constructor() {
        this.categories = [];
        this.currentCategory = null;
        this.listeners = new Map();
        this.isInitialized = false;
        this.isLoading = false;
    }

    /**
     * 初始化分类管理器
     */
    async init() {
        if (this.isInitialized) {
            return true;
        }

        try {
            console.log('初始化分类管理器...');
            await dataSyncService.init();
            await this.loadCategories();
            this.isInitialized = true;
            console.log('分类管理器初始化完成');
            return true;
        } catch (error) {
            console.error('分类管理器初始化失败:', error);
            throw error;
        }
    }

    /**
     * 加载所有分类
     */
    async loadCategories() {
        if (this.isLoading) {
            return this.categories;
        }

        this.isLoading = true;
        
        try {
            console.log('加载分类数据...');
            const categories = await dataSyncService.getCategories();
            
            // 按order字段排序
            this.categories = categories.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            // 如果没有当前分类，设置第一个分类为当前分类
            if (!this.currentCategory && this.categories.length > 0) {
                this.currentCategory = this.categories[0];
                console.log(`设置当前分类: ${this.currentCategory.name}`);
            }
            
            console.log(`加载分类完成: ${this.categories.length}个分类`);
            
            // 发射事件
            this.emit('categoriesLoaded', this.categories);
            if (this.currentCategory) {
                this.emit('currentCategoryChanged', this.currentCategory);
            }
            
            return this.categories;
        } catch (error) {
            console.error('加载分类失败:', error);
            this.categories = [];
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 获取所有分类
     */
    getCategories() {
        return [...this.categories]; // 返回副本，防止外部修改
    }

    /**
     * 获取当前选中的分类
     */
    getCurrentCategory() {
        return this.currentCategory;
    }

    /**
     * 设置当前分类
     */
    async setCurrentCategory(categoryId) {
        try {
            if (!categoryId) {
                console.warn('分类ID不能为空');
                return false;
            }

            const category = this.categories.find(cat => cat.id === categoryId);
            if (!category) {
                console.warn(`未找到分类: ${categoryId}`);
                return false;
            }

            if (this.currentCategory && this.currentCategory.id === categoryId) {
                console.log('分类未改变，跳过设置');
                return true;
            }

            this.currentCategory = category;
            console.log(`切换到分类: ${category.name}`);
            
            this.emit('currentCategoryChanged', this.currentCategory);
            return true;
        } catch (error) {
            console.error('设置当前分类失败:', error);
            return false;
        }
    }

    /**
     * 添加分类
     */
    async addCategory(categoryData) {
        try {
            await this.init();
            
            // 数据验证
            const validationErrors = this.validateCategory(categoryData);
            if (validationErrors.length > 0) {
                throw new Error(`数据验证失败: ${validationErrors.join(', ')}`);
            }
            
            // 检查重名
            const trimmedName = categoryData.name.trim();
            const existingCategory = this.categories.find(cat => 
                cat.name && cat.name.toLowerCase() === trimmedName.toLowerCase()
            );
            if (existingCategory) {
                throw new Error(`分类名称 "${trimmedName}" 已存在`);
            }
            
            // 准备分类数据
            const categoryToAdd = {
                ...categoryData,
                name: trimmedName,
                order: categoryData.order !== undefined ? categoryData.order : this.categories.length,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            console.log('添加分类:', categoryToAdd.name);
            
            // 添加到数据库
            const newCategory = await dataSyncService.addCategory(categoryToAdd);
            
            // 更新本地数据
            this.categories.push(newCategory);
            this.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            // 如果是第一个分类，设为当前分类
            if (this.categories.length === 1) {
                this.currentCategory = newCategory;
                console.log(`设置第一个分类为当前分类: ${newCategory.name}`);
            }
            
            console.log(`分类添加成功: ${newCategory.name}`);
            
            // 发射事件
            this.emit('categoryAdded', newCategory);
            this.emit('categoriesLoaded', this.categories);
            if (this.currentCategory && this.currentCategory.id === newCategory.id) {
                this.emit('currentCategoryChanged', this.currentCategory);
            }
            
            return newCategory;
        } catch (error) {
            console.error('添加分类失败:', error);
            throw error;
        }
    }

    /**
     * 更新分类
     */
    async updateCategory(categoryId, updates) {
        try {
            await this.init();
            
            if (!categoryId) {
                throw new Error('分类ID不能为空');
            }
            
            if (!updates || typeof updates !== 'object') {
                throw new Error('更新数据不能为空');
            }
            
            // 查找要更新的分类
            const existingCategory = this.getCategoryById(categoryId);
            if (!existingCategory) {
                throw new Error(`未找到分类: ${categoryId}`);
            }
            
            // 准备更新数据
            const updateData = { ...updates };
            if (updateData.name) {
                updateData.name = updateData.name.trim();
            }
            updateData.updatedAt = new Date().toISOString();
            
            // 合并数据进行验证
            const mergedData = { ...existingCategory, ...updateData };
            const validationErrors = this.validateCategory(mergedData);
            if (validationErrors.length > 0) {
                throw new Error(`数据验证失败: ${validationErrors.join(', ')}`);
            }
            
            // 检查重名（排除自己）
            if (updateData.name) {
                const duplicateCategory = this.categories.find(cat => 
                    cat.id !== categoryId && 
                    cat.name && cat.name.toLowerCase() === updateData.name.toLowerCase()
                );
                if (duplicateCategory) {
                    throw new Error(`分类名称 "${updateData.name}" 已存在`);
                }
            }
            
            console.log(`更新分类: ${existingCategory.name}`);
            
            // 更新数据库
            const updatedCategory = await dataSyncService.updateCategory(mergedData);
            
            // 更新本地数据
            const index = this.categories.findIndex(cat => cat.id === categoryId);
            if (index !== -1) {
                this.categories[index] = updatedCategory;
                this.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
            }
            
            // 如果更新的是当前分类，更新当前分类引用
            if (this.currentCategory && this.currentCategory.id === categoryId) {
                this.currentCategory = updatedCategory;
            }
            
            console.log(`分类更新成功: ${updatedCategory.name}`);
            
            // 发射事件
            this.emit('categoryUpdated', updatedCategory);
            this.emit('categoriesLoaded', this.categories);
            if (this.currentCategory && this.currentCategory.id === categoryId) {
                this.emit('currentCategoryChanged', this.currentCategory);
            }
            
            return updatedCategory;
        } catch (error) {
            console.error('更新分类失败:', error);
            throw error;
        }
    }

    /**
     * 删除分类
     */
    async deleteCategory(categoryId) {
        try {
            await this.init();
            
            if (!categoryId) {
                throw new Error('分类ID不能为空');
            }
            
            // 查找要删除的分类
            const categoryToDelete = this.getCategoryById(categoryId);
            if (!categoryToDelete) {
                throw new Error(`未找到分类: ${categoryId}`);
            }
            
            // 检查是否是最后一个分类
            if (this.categories.length <= 1) {
                throw new Error('不能删除最后一个分类，至少需要保留一个分类');
            }
            
            console.log(`删除分类: ${categoryToDelete.name}`);
            
            // 检查该分类下是否有网站
            const websites = await dataSyncService.getWebsitesByCategory(categoryId);
            if (websites && websites.length > 0) {
                // 可以选择阻止删除或者转移网站到其他分类
                console.warn(`分类 "${categoryToDelete.name}" 下还有 ${websites.length} 个网站`);
                // 这里可以根据需求决定是否允许删除
                // throw new Error(`分类 "${categoryToDelete.name}" 下还有网站，无法删除`);
            }
            
            // 删除数据库中的分类
            await dataSyncService.deleteCategory(categoryId);
            
            // 更新本地数据
            const deletedIndex = this.categories.findIndex(cat => cat.id === categoryId);
            if (deletedIndex !== -1) {
                this.categories.splice(deletedIndex, 1);
            }
            
            // 如果删除的是当前分类，切换到第一个分类
            if (this.currentCategory && this.currentCategory.id === categoryId) {
                this.currentCategory = this.categories.length > 0 ? this.categories[0] : null;
                console.log(`切换到新的当前分类: ${this.currentCategory ? this.currentCategory.name : '无'}`);
            }
            
            console.log(`分类删除成功: ${categoryToDelete.name}`);
            
            // 发射事件
            this.emit('categoryDeleted', categoryToDelete);
            this.emit('categoriesLoaded', this.categories);
            if (this.currentCategory) {
                this.emit('currentCategoryChanged', this.currentCategory);
            }
            
            return true;
        } catch (error) {
            console.error('删除分类失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID获取分类
     */
    getCategoryById(categoryId) {
        if (!categoryId) return null;
        return this.categories.find(cat => cat.id === categoryId) || null;
    }

    /**
     * 搜索分类
     */
    searchCategories(keyword) {
        if (!keyword || typeof keyword !== 'string') {
            return this.getCategories();
        }
        
        const searchTerm = keyword.toLowerCase().trim();
        if (!searchTerm) {
            return this.getCategories();
        }
        
        return this.categories.filter(category => {
            const nameMatch = category.name && category.name.toLowerCase().includes(searchTerm);
            const descMatch = category.description && category.description.toLowerCase().includes(searchTerm);
            return nameMatch || descMatch;
        });
    }

    /**
     * 重新排序分类
     */
    async reorderCategories(categoryIds) {
        try {
            await this.init();
            
            if (!Array.isArray(categoryIds)) {
                throw new Error('分类ID列表必须是数组');
            }
            
            console.log('重新排序分类:', categoryIds);
            
            // 更新每个分类的order属性
            const updatePromises = categoryIds.map(async (categoryId, index) => {
                const category = this.getCategoryById(categoryId);
                if (category) {
                    return this.updateCategory(categoryId, { order: index });
                }
                return null;
            });
            
            await Promise.all(updatePromises);
            
            // 重新加载分类以确保顺序正确
            await this.loadCategories();
            
            console.log('分类排序完成');
            
            return this.categories;
        } catch (error) {
            console.error('重新排序分类失败:', error);
            throw error;
        }
    }

    /**
     * 获取分类统计信息
     */
    async getCategoryStats(categoryId = null) {
        try {
            await this.init();
            
            if (categoryId) {
                // 获取单个分类的统计
                const category = this.getCategoryById(categoryId);
                if (!category) {
                    throw new Error(`未找到分类: ${categoryId}`);
                }
                
                const websites = await dataSyncService.getWebsitesByCategory(categoryId);
                return {
                    category,
                    websiteCount: websites ? websites.length : 0,
                    websites: websites || []
                };
            } else {
                // 获取所有分类的统计
                const stats = await Promise.all(
                    this.categories.map(async (category) => {
                        const websites = await dataSyncService.getWebsitesByCategory(category.id);
                        return {
                            category,
                            websiteCount: websites ? websites.length : 0
                        };
                    })
                );
                
                return {
                    totalCategories: this.categories.length,
                    categories: stats,
                    totalWebsites: stats.reduce((sum, stat) => sum + stat.websiteCount, 0)
                };
            }
        } catch (error) {
            console.error('获取分类统计失败:', error);
            throw error;
        }
    }

    /**
     * 验证分类数据
     */
    validateCategory(category) {
        const errors = [];
        
        if (!category) {
            errors.push('分类数据不能为空');
            return errors;
        }
        
        if (!category.name || typeof category.name !== 'string' || !category.name.trim()) {
            errors.push('分类名称不能为空');
        } else if (category.name.trim().length > 50) {
            errors.push('分类名称不能超过50个字符');
        }
        
        if (category.description && typeof category.description === 'string' && category.description.length > 200) {
            errors.push('分类描述不能超过200个字符');
        }
        
        if (category.icon && typeof category.icon === 'string' && category.icon.length > 50) {
            errors.push('分类图标不能超过50个字符');
        }
        
        if (category.color && typeof category.color === 'string' && !/^#[0-9A-Fa-f]{6}$/.test(category.color)) {
            errors.push('分类颜色格式不正确');
        }
        
        return errors;
    }

    /**
     * 事件监听
     */
    on(event, callback) {
        if (!event || typeof callback !== 'function') {
            console.warn('事件名称和回调函数不能为空');
            return;
        }
        
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        
        console.log(`添加事件监听: ${event}`);
    }

    /**
     * 移除事件监听
     */
    off(event, callback) {
        if (!event) {
            console.warn('事件名称不能为空');
            return;
        }
        
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            if (callback) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                    console.log(`移除事件监听: ${event}`);
                }
            } else {
                callbacks.length = 0;
                console.log(`清空事件监听: ${event}`);
            }
        }
    }

    /**
     * 触发事件
     */
    emit(event, data) {
        if (!event) {
            console.warn('事件名称不能为空');
            return;
        }
        
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            if (callbacks.length === 0) {
                return;
            }
            
            console.log(`发射事件: ${event}`, data ? `(${typeof data})` : '');
            
            callbacks.forEach((callback, index) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件回调执行失败 [${event}][${index}]:`, error);
                }
            });
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        console.log('清理CategoryManager资源');
        
        // 清理事件监听器
        this.listeners.clear();
        
        // 清理数据
        this.categories = [];
        this.currentCategory = null;
        this.isInitialized = false;
        this.isLoading = false;
        
        console.log('CategoryManager资源清理完成');
    }
}

// 导出单例实例
const categoryManager = new CategoryManager();
export default categoryManager;