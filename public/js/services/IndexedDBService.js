/**
 * IndexedDB 数据库服务
 * 负责管理本地数据存储
 */
class IndexedDBService {
    constructor() {
        this.dbName = 'NavigationDB';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * 初始化数据库
     */
    async init() {
        if (this.isInitialized && this.db) {
            return this.db;
        }

        try {
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onerror = () => {
                    console.error('数据库打开失败:', request.error);
                    reject(new Error('数据库打开失败: ' + request.error));
                };

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    try {
                        // 创建分类表
                        if (!db.objectStoreNames.contains('categories')) {
                            const categoryStore = db.createObjectStore('categories', {
                                keyPath: 'id',
                                autoIncrement: false
                            });
                            categoryStore.createIndex('name', 'name', { unique: true });
                            categoryStore.createIndex('order', 'order', { unique: false });
                        }

                        // 创建网站表
                        if (!db.objectStoreNames.contains('websites')) {
                            const websiteStore = db.createObjectStore('websites', {
                                keyPath: 'id',
                                autoIncrement: false
                            });
                            websiteStore.createIndex('categoryId', 'categoryId', { unique: false });
                            websiteStore.createIndex('name', 'name', { unique: false });
                            websiteStore.createIndex('url', 'url', { unique: false });
                        }

                        console.log('数据库结构创建完成');
                    } catch (error) {
                        console.error('数据库结构创建失败:', error);
                        throw error;
                    }
                };
            });

            this.db = db;
            this.isInitialized = true;
            console.log('数据库初始化成功');
            return this.db;
        } catch (error) {
            console.error('数据库初始化失败:', error);
            throw error;
        }
    }

    /**
     * 执行事务操作
     */
    async executeTransaction(storeName, mode, operation) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], mode);
                const store = transaction.objectStore(storeName);

                transaction.onerror = () => {
                    console.error('事务执行失败:', transaction.error);
                    reject(new Error('事务执行失败: ' + transaction.error));
                };

                transaction.onabort = () => {
                    console.error('事务被中止');
                    reject(new Error('事务被中止'));
                };

                const request = operation(store);
                
                if (request && typeof request.then === 'function') {
                    // 如果operation返回Promise
                    request.then(resolve).catch(reject);
                } else if (request && request.onsuccess !== undefined) {
                    // 如果operation返回IDBRequest
                    request.onsuccess = (event) => {
                        resolve(event.target.result);
                    };
                    request.onerror = () => {
                        reject(new Error('请求执行失败: ' + request.error));
                    };
                } else {
                    // 如果operation直接返回结果
                    resolve(request);
                }
            } catch (error) {
                console.error('事务操作异常:', error);
                reject(error);
            }
        });
    }

    // ==================== 分类操作 ====================

    /**
     * 获取所有分类
     */
    async getCategories() {
        try {
            const categories = await this.executeTransaction('categories', 'readonly', (store) => {
                return store.getAll();
            });
            return categories || [];
        } catch (error) {
            console.error('获取分类失败:', error);
            return [];
        }
    }

    /**
     * 根据ID获取分类
     */
    async getCategoryById(id) {
        try {
            return await this.executeTransaction('categories', 'readonly', (store) => {
                return store.get(id);
            });
        } catch (error) {
            console.error('获取分类失败:', error);
            return null;
        }
    }

    /**
     * 添加分类
     */
    async addCategory(category) {
        try {
            // 数据验证
            if (!category || !category.name || !category.name.trim()) {
                throw new Error('分类名称不能为空');
            }

            // 检查名称是否重复
            const existingCategories = await this.getCategories();
            const nameExists = existingCategories.some(cat => 
                cat.name.toLowerCase() === category.name.trim().toLowerCase() && cat.id !== category.id
            );
            
            if (nameExists) {
                throw new Error('分类名称已存在');
            }

            // 生成ID
            if (!category.id) {
                category.id = this.generateId();
            }

            // 设置默认值
            const categoryData = {
                id: category.id,
                name: category.name.trim(),
                icon: category.icon || 'folder',
                color: category.color || '#3b82f6',
                description: category.description || '',
                order: category.order || 0,
                createdAt: category.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.executeTransaction('categories', 'readwrite', (store) => {
                return store.add(categoryData);
            });

            return categoryData;
        } catch (error) {
            console.error('添加分类失败:', error);
            throw error;
        }
    }

    /**
     * 更新分类
     */
    async updateCategory(category) {
        try {
            if (!category || !category.id) {
                throw new Error('分类ID不能为空');
            }

            if (!category.name || !category.name.trim()) {
                throw new Error('分类名称不能为空');
            }

            // 检查名称是否重复
            const existingCategories = await this.getCategories();
            const nameExists = existingCategories.some(cat => 
                cat.name.toLowerCase() === category.name.trim().toLowerCase() && cat.id !== category.id
            );
            
            if (nameExists) {
                throw new Error('分类名称已存在');
            }

            // 获取现有分类数据
            const existingCategory = await this.getCategoryById(category.id);
            if (!existingCategory) {
                throw new Error('分类不存在');
            }

            // 合并数据
            const updatedCategory = {
                ...existingCategory,
                ...category,
                name: category.name.trim(),
                updatedAt: new Date().toISOString()
            };

            await this.executeTransaction('categories', 'readwrite', (store) => {
                return store.put(updatedCategory);
            });

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
            if (!categoryId) {
                throw new Error('分类ID不能为空');
            }

            // 检查分类是否存在
            const category = await this.getCategoryById(categoryId);
            if (!category) {
                throw new Error('分类不存在');
            }

            // 先删除该分类下的所有网站
            const websites = await this.getWebsitesByCategory(categoryId);
            for (const website of websites) {
                await this.deleteWebsite(website.id);
            }

            // 删除分类
            await this.executeTransaction('categories', 'readwrite', (store) => {
                return store.delete(categoryId);
            });

            return true;
        } catch (error) {
            console.error('删除分类失败:', error);
            throw error;
        }
    }

    // ==================== 网站操作 ====================

    /**
     * 获取所有网站
     */
    async getWebsites() {
        try {
            const websites = await this.executeTransaction('websites', 'readonly', (store) => {
                return store.getAll();
            });
            return websites || [];
        } catch (error) {
            console.error('获取网站失败:', error);
            return [];
        }
    }

    /**
     * 根据ID获取网站
     */
    async getWebsiteById(id) {
        try {
            return await this.executeTransaction('websites', 'readonly', (store) => {
                return store.get(id);
            });
        } catch (error) {
            console.error('获取网站失败:', error);
            return null;
        }
    }

    /**
     * 根据分类获取网站
     */
    async getWebsitesByCategory(categoryId) {
        try {
            const websites = await this.executeTransaction('websites', 'readonly', (store) => {
                const index = store.index('categoryId');
                return index.getAll(categoryId);
            });
            return websites || [];
        } catch (error) {
            console.error('获取分类网站失败:', error);
            return [];
        }
    }

    /**
     * 添加网站
     */
    async addWebsite(website) {
        try {
            // 数据验证
            if (!website || !website.name || !website.name.trim()) {
                throw new Error('网站名称不能为空');
            }

            if (!website.url || !website.url.trim()) {
                throw new Error('网站URL不能为空');
            }

            if (!website.categoryId) {
                throw new Error('必须指定分类');
            }

            // 验证分类是否存在
            const category = await this.getCategoryById(website.categoryId);
            if (!category) {
                throw new Error('指定的分类不存在');
            }

            // 检查URL是否重复
            const existingWebsites = await this.getWebsites();
            const urlExists = existingWebsites.some(site => 
                site.url.toLowerCase() === website.url.trim().toLowerCase() && site.id !== website.id
            );
            
            if (urlExists) {
                throw new Error('网站URL已存在');
            }

            // 生成ID
            if (!website.id) {
                website.id = this.generateId();
            }

            // 设置默认值
            const websiteData = {
                id: website.id,
                name: website.name.trim(),
                url: website.url.trim(),
                categoryId: website.categoryId,
                icon: website.icon || '',
                description: website.description || '',
                order: website.order || 0,
                createdAt: website.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.executeTransaction('websites', 'readwrite', (store) => {
                return store.add(websiteData);
            });

            return websiteData;
        } catch (error) {
            console.error('添加网站失败:', error);
            throw error;
        }
    }

    /**
     * 更新网站
     */
    async updateWebsite(website) {
        try {
            if (!website || !website.id) {
                throw new Error('网站ID不能为空');
            }

            if (!website.name || !website.name.trim()) {
                throw new Error('网站名称不能为空');
            }

            if (!website.url || !website.url.trim()) {
                throw new Error('网站URL不能为空');
            }

            // 验证分类是否存在
            if (website.categoryId) {
                const category = await this.getCategoryById(website.categoryId);
                if (!category) {
                    throw new Error('指定的分类不存在');
                }
            }

            // 检查URL是否重复
            const existingWebsites = await this.getWebsites();
            const urlExists = existingWebsites.some(site => 
                site.url.toLowerCase() === website.url.trim().toLowerCase() && site.id !== website.id
            );
            
            if (urlExists) {
                throw new Error('网站URL已存在');
            }

            // 获取现有网站数据
            const existingWebsite = await this.getWebsiteById(website.id);
            if (!existingWebsite) {
                throw new Error('网站不存在');
            }

            // 合并数据
            const updatedWebsite = {
                ...existingWebsite,
                ...website,
                name: website.name.trim(),
                url: website.url.trim(),
                updatedAt: new Date().toISOString()
            };

            await this.executeTransaction('websites', 'readwrite', (store) => {
                return store.put(updatedWebsite);
            });

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
            if (!websiteId) {
                throw new Error('网站ID不能为空');
            }

            // 检查网站是否存在
            const website = await this.getWebsiteById(websiteId);
            if (!website) {
                throw new Error('网站不存在');
            }

            await this.executeTransaction('websites', 'readwrite', (store) => {
                return store.delete(websiteId);
            });

            return true;
        } catch (error) {
            console.error('删除网站失败:', error);
            throw error;
        }
    }

    // ==================== 工具方法 ====================

    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 清空所有数据
     */
    async clearAllData() {
        try {
            const stores = ['categories', 'websites'];
            
            for (const storeName of stores) {
                await this.executeTransaction(storeName, 'readwrite', (store) => {
                    return store.clear();
                });
            }
            
            console.log('所有数据已清空');
            return true;
        } catch (error) {
            console.error('清空数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取数据库统计信息
     */
    async getStats() {
        try {
            const [categories, websites] = await Promise.all([
                this.getCategories(),
                this.getWebsites()
            ]);

            return {
                categoriesCount: categories.length,
                websitesCount: websites.length,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('获取统计信息失败:', error);
            return {
                categoriesCount: 0,
                websitesCount: 0,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
            console.log('数据库连接已关闭');
        }
    }
}

// 导出单例实例
const indexedDBService = new IndexedDBService();
export default indexedDBService;