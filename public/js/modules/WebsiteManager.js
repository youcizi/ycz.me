/**
 * 网站管理模块
 * 负责网站的增删改查和状态管理
 */
import dataSyncService from '../services/DataSyncService.js';
import categoryManager from './CategoryManager.js';

class WebsiteManager {
    constructor() {
        this.websites = [];
        this.filteredWebsites = [];
        this.currentCategory = null;
        this.searchKeyword = '';
        this.eventListeners = {};
        this.isInitialized = false;
        this.isLoading = false;
    }

    /**
     * 初始化
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            console.log('初始化WebsiteManager...');
            
            // 确保数据同步服务已初始化
            await dataSyncService.init();
            
            // 加载网站数据
            await this.loadWebsites();
            
            this.isInitialized = true;
            console.log('WebsiteManager初始化完成');
        } catch (error) {
            console.error('WebsiteManager初始化失败:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * 加载网站数据
     */
    async loadWebsites() {
        if (this.isLoading) {
            console.log('网站数据正在加载中，跳过重复加载');
            return;
        }
        
        try {
            this.isLoading = true;
            console.log('加载网站数据...');
            
            // 从数据同步服务获取网站数据
            const websites = await dataSyncService.getWebsites();
            this.websites = Array.isArray(websites) ? websites : [];
            
            console.log(`加载了 ${this.websites.length} 个网站`);
            
            // 应用当前筛选条件
            this.filterWebsites();
            
            // 发射事件
            this.emit('websitesLoaded', this.websites);
            this.emit('filteredWebsitesChanged', this.filteredWebsites);
            
        } catch (error) {
            console.error('加载网站数据失败:', error);
            this.websites = [];
            this.filteredWebsites = [];
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 获取所有网站
     */
    getWebsites() {
        return this.websites;
    }

    /**
     * 获取过滤后的网站
     */
    getFilteredWebsites() {
        return this.filteredWebsites;
    }

    /**
     * 筛选网站
     */
    filterWebsites() {
        try {
            let filtered = [...this.websites];
            
            console.log(`开始筛选网站，总数: ${this.websites.length}`);
            
            // 按分类筛选
            if (this.currentCategory && this.currentCategory.id) {
                filtered = filtered.filter(website => 
                    website.categoryId === this.currentCategory.id
                );
                console.log(`按分类 "${this.currentCategory.name}" 筛选后: ${filtered.length} 个`);
            }
            
            // 按关键词搜索
            if (this.searchKeyword && this.searchKeyword.trim()) {
                const keyword = this.searchKeyword.trim().toLowerCase();
                filtered = filtered.filter(website => {
                    const name = (website.name || '').toLowerCase();
                    const url = (website.url || '').toLowerCase();
                    const description = (website.description || '').toLowerCase();
                    
                    return name.includes(keyword) || 
                           url.includes(keyword) || 
                           description.includes(keyword);
                });
                console.log(`按关键词 "${keyword}" 搜索后: ${filtered.length} 个`);
            }
            
            // 按创建时间排序（最新的在前）
            filtered.sort((a, b) => {
                const timeA = new Date(a.createdAt || 0).getTime();
                const timeB = new Date(b.createdAt || 0).getTime();
                return timeB - timeA;
            });
            
            this.filteredWebsites = filtered;
            
            console.log(`筛选完成，结果: ${this.filteredWebsites.length} 个网站`);
            
            // 发射事件
            this.emit('filteredWebsitesChanged', this.filteredWebsites);
            
        } catch (error) {
            console.error('筛选网站失败:', error);
            this.filteredWebsites = [];
        }
    }

    /**
     * 设置搜索关键词
     */
    setSearchKeyword(keyword) {
        try {
            const oldKeyword = this.searchKeyword;
            this.searchKeyword = keyword || '';
            
            if (oldKeyword !== this.searchKeyword) {
                console.log(`搜索关键词变更: "${oldKeyword}" -> "${this.searchKeyword}"`);
                
                // 重新筛选网站
                this.filterWebsites();
                
                // 发射事件
                this.emit('searchKeywordChanged', this.searchKeyword);
            }
            
        } catch (error) {
            console.error('设置搜索关键词失败:', error);
        }
    }

    /**
     * 设置当前分类
     */
    setCurrentCategory(category) {
        try {
            const oldCategory = this.currentCategory;
            this.currentCategory = category;
            
            console.log(`切换分类: ${oldCategory ? oldCategory.name : '全部'} -> ${category ? category.name : '全部'}`);
            
            // 重新筛选网站
            this.filterWebsites();
            
            // 发射事件
            this.emit('currentCategoryChanged', category);
            
        } catch (error) {
            console.error('设置当前分类失败:', error);
        }
    }

    /**
     * 添加网站
     */
    async addWebsite(websiteData) {
        try {
            await this.init();
            
            // 数据验证
            const validationErrors = this.validateWebsite(websiteData);
            if (validationErrors.length > 0) {
                throw new Error(`数据验证失败: ${validationErrors.join(', ')}`);
            }
            
            // 标准化URL
            const normalizedUrl = this.normalizeUrl(websiteData.url);
            
            // 检查URL是否已存在
            const existingWebsite = this.websites.find(site => 
                site.url && site.url.toLowerCase() === normalizedUrl.toLowerCase()
            );
            if (existingWebsite) {
                throw new Error(`网站URL "${normalizedUrl}" 已存在`);
            }
            
            // 准备网站数据
            const websiteToAdd = {
                ...websiteData,
                name: websiteData.name.trim(),
                url: normalizedUrl,
                description: websiteData.description ? websiteData.description.trim() : '',
                favicon: websiteData.favicon || this.getFaviconUrl(normalizedUrl),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            console.log('添加网站:', websiteToAdd.name, websiteToAdd.url);
            
            // 添加到数据库
            const newWebsite = await dataSyncService.addWebsite(websiteToAdd);
            
            // 更新本地数据
            this.websites.push(newWebsite);
            this.filterWebsites();
            
            console.log(`网站添加成功: ${newWebsite.name}`);
            
            // 发射事件
            this.emit('websiteAdded', newWebsite);
            this.emit('websitesLoaded', this.websites);
            this.emit('filteredWebsitesChanged', this.filteredWebsites);
            
            return newWebsite;
        } catch (error) {
            console.error('添加网站失败:', error);
            throw error;
        }
    }

    /**
     * 更新网站
     */
    async updateWebsite(websiteId, updates) {
        try {
            await this.init();
            
            if (!websiteId) {
                throw new Error('网站ID不能为空');
            }
            
            if (!updates || typeof updates !== 'object') {
                throw new Error('更新数据不能为空');
            }
            
            // 查找要更新的网站
            const existingWebsite = this.getWebsiteById(websiteId);
            if (!existingWebsite) {
                throw new Error(`未找到网站: ${websiteId}`);
            }
            
            // 准备更新数据
            const updateData = { ...updates };
            if (updateData.name) {
                updateData.name = updateData.name.trim();
            }
            if (updateData.description) {
                updateData.description = updateData.description.trim();
            }
            if (updateData.url) {
                updateData.url = this.normalizeUrl(updateData.url);
            }
            updateData.updatedAt = new Date().toISOString();
            
            // 合并数据进行验证
            const mergedData = { ...existingWebsite, ...updateData };
            const validationErrors = this.validateWebsite(mergedData);
            if (validationErrors.length > 0) {
                throw new Error(`数据验证失败: ${validationErrors.join(', ')}`);
            }
            
            // 检查URL是否已存在（排除自己）
            // if (updateData.url) {
            //     const duplicateWebsite = this.websites.find(site => 
            //         site.id !== websiteId && 
            //         site.url && site.url.toLowerCase() === updateData.url.toLowerCase()
            //     );
            //     if (duplicateWebsite) {
            //         throw new Error(`网站URL "${updateData.url}" 已存在`);
            //     }
            // }
            
            console.log(`更新网站: ${existingWebsite.name}`);
            
            // 更新数据库
            const updatedWebsite = await dataSyncService.updateWebsite(mergedData);
            
            // 更新本地数据
            const index = this.websites.findIndex(site => site.id === websiteId);
            if (index !== -1) {
                this.websites[index] = updatedWebsite;
            }
            
            this.filterWebsites();
            
            console.log(`网站更新成功: ${updatedWebsite.name}`);
            
            // 发射事件
            this.emit('websiteUpdated', updatedWebsite);
            this.emit('websitesLoaded', this.websites);
            this.emit('filteredWebsitesChanged', this.filteredWebsites);
            
            return updatedWebsite;
        } catch (error) {
            console.error('更新网站失败:', error);
            throw error;
        }
    }

    /**
     * 删除网站
     */
    async deleteWebsite(websiteId) {
        try {
            await this.init();
            
            if (!websiteId) {
                console.warn('删除网站: 网站ID为空，跳过删除操作');
                return false;
            }
            
            // 查找要删除的网站
            const websiteToDelete = this.getWebsiteById(websiteId);
            if (!websiteToDelete) {
                console.warn(`删除网站: 网站 ${websiteId} 不存在或已被删除，跳过删除操作`);
                // 从本地数据中移除（如果存在）
                const deletedIndex = this.websites.findIndex(site => site.id === websiteId);
                if (deletedIndex !== -1) {
                    this.websites.splice(deletedIndex, 1);
                    this.filterWebsites();
                    this.emit('websitesLoaded', this.websites);
                    this.emit('filteredWebsitesChanged', this.filteredWebsites);
                }
                return false;
            }
            
            console.log(`删除网站: ${websiteToDelete.name}`);
            
            try {
                // 删除数据库中的网站
                await dataSyncService.deleteWebsite(websiteId);
            } catch (dbError) {
                // 如果数据库中不存在，记录警告但继续处理本地数据
                if (dbError.message && dbError.message.includes('网站不存在')) {
                    console.warn(`数据库中网站 ${websiteId} 不存在，仅清理本地数据`);
                } else {
                    throw dbError;
                }
            }
            
            // 更新本地数据
            const deletedIndex = this.websites.findIndex(site => site.id === websiteId);
            if (deletedIndex !== -1) {
                this.websites.splice(deletedIndex, 1);
            }
            
            this.filterWebsites();
            
            console.log(`网站删除成功: ${websiteToDelete.name}`);
            
            // 发射事件
            this.emit('websiteDeleted', websiteToDelete);
            this.emit('websitesLoaded', this.websites);
            this.emit('filteredWebsitesChanged', this.filteredWebsites);
            
            return true;
        } catch (error) {
            console.error('删除网站失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID获取网站
     */
    getWebsiteById(websiteId) {
        if (!websiteId) {
            return null;
        }
        return this.websites.find(website => website.id === websiteId) || null;
    }

    /**
     * 根据分类获取网站
     */
    getWebsitesByCategory(categoryId) {
        return this.websites.filter(website => website.categoryId === categoryId);
    }

    /**
     * 获取网站统计信息
     */
    async getWebsiteStats(categoryId = null) {
        try {
            await this.init();
            
            if (categoryId) {
                const categoryWebsites = this.websites.filter(website => 
                    website.categoryId === categoryId
                );
                return {
                    total: categoryWebsites.length,
                    categoryId: categoryId,
                    websites: categoryWebsites
                };
            }
            
            // 按分类统计
            const statsByCategory = {};
            this.websites.forEach(website => {
                const catId = website.categoryId || 'uncategorized';
                if (!statsByCategory[catId]) {
                    statsByCategory[catId] = 0;
                }
                statsByCategory[catId]++;
            });
            
            return {
                total: this.websites.length,
                byCategory: statsByCategory,
                websites: this.websites
            };
        } catch (error) {
            console.error('获取网站统计失败:', error);
            return {
                total: 0,
                byCategory: {},
                websites: []
            };
        }
    }

    /**
     * 搜索网站
     */
    searchWebsites(keyword, categoryId = null) {
        let results = [...this.websites];

        // 按分类过滤
        if (categoryId) {
            results = results.filter(website => website.categoryId === categoryId);
        }

        // 按关键词搜索
        if (keyword && keyword.trim() !== '') {
            const searchTerm = keyword.toLowerCase().trim();
            results = results.filter(website => 
                website.title.toLowerCase().includes(searchTerm) ||
                website.description.toLowerCase().includes(searchTerm) ||
                website.url.toLowerCase().includes(searchTerm)
            );
        }

        return results;
    }

    /**
     * 验证网站数据
     */
    validateWebsite(websiteData) {
        const errors = [];
        
        if (!websiteData || typeof websiteData !== 'object') {
            errors.push('网站数据不能为空');
            return errors;
        }
        
        // 验证名称
        if (!websiteData.name || typeof websiteData.name !== 'string' || websiteData.name.trim() === '') {
            errors.push('网站名称不能为空');
        } else if (websiteData.name.trim().length > 100) {
            errors.push('网站名称不能超过100个字符');
        }
        
        // 验证URL
        if (!websiteData.url || typeof websiteData.url !== 'string' || websiteData.url.trim() === '') {
            errors.push('网站URL不能为空');
        } else {
            const normalizedUrl = this.normalizeUrl(websiteData.url);
            if (!this.isValidUrl(normalizedUrl)) {
                errors.push('网站URL格式不正确');
            }
        }
        
        // 验证分类ID
        if (websiteData.categoryId && typeof websiteData.categoryId !== 'string') {
            errors.push('分类ID格式不正确');
        }
        
        // 验证描述
        if (websiteData.description && typeof websiteData.description !== 'string') {
            errors.push('网站描述格式不正确');
        } else if (websiteData.description && websiteData.description.trim().length > 500) {
            errors.push('网站描述不能超过500个字符');
        }
        
        return errors;
    }

    /**
     * 标准化URL
     */
    normalizeUrl(url) {
        if (!url || typeof url !== 'string') {
            return '';
        }
        
        let normalized = url.trim();
        
        // 如果没有协议，默认添加 https://
        if (!/^https?:\/\//i.test(normalized)) {
            normalized = 'https://' + normalized;
        }
        
        try {
            const urlObj = new URL(normalized);
            // 移除末尾的斜杠（除非是根路径）
            let href = urlObj.href;
            if (href.endsWith('/') && urlObj.pathname !== '/') {
                href = href.slice(0, -1);
            }
            return href;
        } catch (error) {
            console.warn('URL标准化失败:', url, error);
            return url;
        }
    }

    /**
     * 验证URL格式
     */
    isValidUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        
        try {
            const urlObj = new URL(url);
            // 只允许 http 和 https 协议
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * 获取网站图标URL
     */
    getFaviconUrl(url) {
        if (!url || typeof url !== 'string') {
            return '/favicon.ico';
        }
        
        try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
        } catch (error) {
            console.warn('获取favicon URL失败:', url, error);
            return '/favicon.ico';
        }
    }

    /**
     * 获取网站图标
     */
    getWebsiteIcon(url) {
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
        } catch {
            return '🌐';
        }
    }

    /**
     * 批量导入网站
     */
    async importWebsites(websites, categoryId) {
        const results = {
            success: [],
            failed: []
        };

        for (const websiteData of websites) {
            try {
                const website = await this.addWebsite({
                    ...websiteData,
                    categoryId: categoryId || websiteData.categoryId
                });
                results.success.push(website);
            } catch (error) {
                results.failed.push({
                    data: websiteData,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 事件监听
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    /**
     * 移除事件监听
     */
    off(event, callback) {
        if (this.eventListeners[event]) {
            const callbacks = this.eventListeners[event];
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     */
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('事件回调执行失败:', error);
                }
            });
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        this.eventListeners = {};
        this.websites = [];
        this.filteredWebsites = [];
        this.searchKeyword = '';
        this.currentCategory = null;
        this.isInitialized = false;
        this.isLoading = false;
    }
}

// 导出单例实例
const websiteManager = new WebsiteManager();
export default websiteManager;