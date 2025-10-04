/**
 * IndexedDB 数据库服务
 * 负责管理本地数据存储
 */
import { fetchDefaultData } from './DefaultDataProvider.js';
class IndexedDBService {
    constructor() {
        this.dbName = 'NavigationDB';
        this.dbVersion = 4;
        this.db = null;
        this.isInitialized = false;
        // 防止并发初始化导致未等待默认数据播种完成
        this.initPromise = null;
    }

    /**
     * 初始化数据库
     */
    async init() {
        if (this.isInitialized && this.db) {
            return this.db;
        }

        // 若已有进行中的初始化，复用同一Promise，确保并发等待播种
        if (this.initPromise) {
            return this.initPromise;
        }

        try {
            this.initPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                let needsSeeding = false;

                request.onerror = () => {
                    console.error('数据库打开失败:', request.error);
                    reject(new Error('数据库打开失败: ' + request.error));
                };

                request.onsuccess = async () => {
                    const db = request.result;
                    // 若为首次创建数据库，需要在成功打开后写入默认数据，再返回实例
                    if (needsSeeding) {
                        try {
                            const defaults = await fetchDefaultData();
                            const seedTxn = db.transaction(['categories','websites','filters','searchEngines'], 'readwrite');

                            const catStore = seedTxn.objectStore('categories');
                            for (const cat of (defaults.categories || [])) {
                                try { catStore.add(cat); } catch (e) { console.warn('默认分类插入失败:', cat && cat.name, e); }
                            }

                            const filterStore = seedTxn.objectStore('filters');
                            for (const filter of (defaults.filters || [])) {
                                try { filterStore.add(filter); } catch (e) { console.warn('默认筛选插入失败:', filter && filter.name, e); }
                            }

                            const engineStore = seedTxn.objectStore('searchEngines');
                            for (const engine of (defaults.searchEngines || [])) {
                                try { engineStore.add(engine); } catch (e) { console.warn('默认搜索引擎插入失败:', engine && engine.name, e); }
                            }

                            const siteStore = seedTxn.objectStore('websites');
                            for (const site of (defaults.websites || [])) {
                                try { siteStore.add(site); } catch (e) { console.warn('默认网站插入失败:', site && site.name, e); }
                            }

                            seedTxn.oncomplete = () => {
                                console.log('首次初始化默认数据写入完成');
                                resolve(db);
                            };
                            seedTxn.onerror = () => {
                                console.error('默认数据写入事务失败:', seedTxn.error);
                                // 即使写入失败也返回db，以便应用可运行
                                resolve(db);
                            };
                        } catch (seedErr) {
                            console.error('默认数据写入失败:', seedErr);
                            resolve(db);
                        }
                    } else {
                        resolve(db);
                    }
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    const oldVersion = event.oldVersion;
                    
                    try {
                        // 创建分类表
                        if (!db.objectStoreNames.contains('categories')) {
                            const categoryStore = db.createObjectStore('categories', {
                                keyPath: 'id',
                                autoIncrement: false
                            });
                            categoryStore.createIndex('name', 'name', { unique: true });
                            categoryStore.createIndex('order', 'order', { unique: false });
                            categoryStore.createIndex('parentId', 'parentId', { unique: false });
                        }
                        
                        // 版本2：添加parentId字段支持
                        if (oldVersion < 2) {
                            if (db.objectStoreNames.contains('categories')) {
                                // 为现有分类表添加parentId索引
                                const transaction = event.target.transaction;
                                const categoryStore = transaction.objectStore('categories');
                                if (!categoryStore.indexNames.contains('parentId')) {
                                    categoryStore.createIndex('parentId', 'parentId', { unique: false });
                                }
                            }
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

                        // 版本3：新增搜索引擎表
                        if (!db.objectStoreNames.contains('searchEngines')) {
                            const engineStore = db.createObjectStore('searchEngines', {
                                keyPath: 'id',
                                autoIncrement: false
                            });
                            engineStore.createIndex('name', 'name', { unique: true });
                            engineStore.createIndex('order', 'order', { unique: false });
                        }

                        // 版本4：新增筛选标签表（filters）
                        if (!db.objectStoreNames.contains('filters')) {
                            const filterStore = db.createObjectStore('filters', {
                                keyPath: 'id',
                                autoIncrement: false
                            });
                            filterStore.createIndex('key', 'key', { unique: true });
                            filterStore.createIndex('name', 'name', { unique: false });
                            filterStore.createIndex('order', 'order', { unique: false });
                        }

                        console.log('数据库结构创建完成');

                        // 首次创建数据库（oldVersion === 0）时，标记需要在打开成功后写入默认数据
                        if (oldVersion === 0) {
                            needsSeeding = true;
                        }
                    } catch (error) {
                        console.error('数据库结构创建失败:', error);
                        throw error;
                    }
                };
            });

            const db = await this.initPromise;
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

    // ==================== 搜索引擎操作 ====================

    /**
     * 获取所有搜索引擎
     */
    async getSearchEngines() {
        try {
            const engines = await this.executeTransaction('searchEngines', 'readonly', (store) => {
                return store.getAll();
            });
            return engines || [];
        } catch (error) {
            console.error('获取搜索引擎失败:', error);
            return [];
        }
    }

    // ==================== 筛选标签（filters）操作 ====================

    /**
     * 获取所有筛选标签
     */
    async getFilters() {
        try {
            const filters = await this.executeTransaction('filters', 'readonly', (store) => {
                return store.getAll();
            });
            return (filters || []).sort((a, b) => (a.order || 0) - (b.order || 0));
        } catch (error) {
            console.error('获取筛选标签失败:', error);
            return [];
        }
    }

    /**
     * 根据key获取筛选标签
     */
    async getFilterByKey(key) {
        try {
            const filters = await this.getFilters();
            return filters.find(f => f.key === key) || null;
        } catch (error) {
            console.error('根据key获取筛选标签失败:', error);
            return null;
        }
    }

    /**
     * 添加筛选标签
     */
    async addFilter(filter) {
        try {
            if (!filter || !filter.name || !filter.name.trim() || !filter.key || !filter.key.trim()) {
                throw new Error('筛选标签名称与key不能为空');
            }

            // 检查key是否重复
            const existing = await this.getFilters();
            const keyExists = existing.some(f => f.key.toLowerCase() === filter.key.trim().toLowerCase());
            if (keyExists) {
                throw new Error('筛选标签 key 已存在');
            }

            // 生成ID
            if (!filter.id) {
                filter.id = this.generateId();
            }

            const filterData = {
                id: filter.id,
                name: filter.name.trim(),
                key: filter.key.trim(),
                backgroundColor: filter.backgroundColor || '#3b82f6',
                order: filter.order || 0,
                createdAt: filter.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.executeTransaction('filters', 'readwrite', (store) => {
                return store.add(filterData);
            });

            return filterData;
        } catch (error) {
            console.error('添加筛选标签失败:', error);
            throw error;
        }
    }

    /**
     * 更新筛选标签
     */
    async updateFilter(filter) {
        try {
            if (!filter || !filter.id) {
                throw new Error('筛选标签ID不能为空');
            }

            if (!filter.name || !filter.name.trim() || !filter.key || !filter.key.trim()) {
                throw new Error('筛选标签名称与key不能为空');
            }

            // 获取现有数据
            const existing = await this.executeTransaction('filters', 'readonly', (store) => store.get(filter.id));
            if (!existing) {
                throw new Error('筛选标签不存在');
            }

            // 检查key是否与其他标签重复
            const all = await this.getFilters();
            const keyExists = all.some(f => f.key.toLowerCase() === filter.key.trim().toLowerCase() && f.id !== filter.id);
            if (keyExists) {
                throw new Error('筛选标签 key 已存在');
            }

            const updatedFilter = {
                ...existing,
                ...filter,
                name: filter.name.trim(),
                key: filter.key.trim(),
                updatedAt: new Date().toISOString()
            };

            await this.executeTransaction('filters', 'readwrite', (store) => {
                return store.put(updatedFilter);
            });

            return updatedFilter;
        } catch (error) {
            console.error('更新筛选标签失败:', error);
            throw error;
        }
    }

    /**
     * 删除筛选标签
     */
    async deleteFilter(id) {
        try {
            if (!id) {
                throw new Error('筛选标签ID不能为空');
            }

            await this.executeTransaction('filters', 'readwrite', (store) => {
                return store.delete(id);
            });

            return true;
        } catch (error) {
            console.error('删除筛选标签失败:', error);
            throw error;
        }
    }

    /**
     * 根据ID获取搜索引擎
     */
    async getSearchEngineById(id) {
        try {
            return await this.executeTransaction('searchEngines', 'readonly', (store) => {
                return store.get(id);
            });
        } catch (error) {
            console.error('获取搜索引擎失败:', error);
            return null;
        }
    }

    /**
     * 添加搜索引擎
     */
    async addSearchEngine(engine) {
        try {
            if (!engine || !engine.name || !engine.template) {
                throw new Error('搜索引擎名称与模板URL不能为空');
            }

            // 检查名称是否重复
            const existingEngines = await this.getSearchEngines();
            const nameExists = existingEngines.some(e => 
                e.name.toLowerCase() === engine.name.trim().toLowerCase() && e.id !== engine.id
            );
            if (nameExists) {
                throw new Error('搜索引擎名称已存在');
            }

            // 生成ID
            if (!engine.id) {
                engine.id = this.generateId();
            }

            const engineData = {
                id: engine.id,
                name: engine.name.trim(),
                template: engine.template.trim(), // 例如: https://www.google.com/search?q={q}
                icon: engine.icon || '🔍',
                order: engine.order || 0,
                createdAt: engine.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.executeTransaction('searchEngines', 'readwrite', (store) => {
                return store.add(engineData);
            });

            return engineData;
        } catch (error) {
            console.error('添加搜索引擎失败:', error);
            throw error;
        }
    }

    /**
     * 更新搜索引擎
     */
    async updateSearchEngine(engine) {
        try {
            if (!engine || !engine.id) {
                throw new Error('搜索引擎ID不能为空');
            }
            if (!engine.name || !engine.name.trim() || !engine.template || !engine.template.trim()) {
                throw new Error('搜索引擎名称与模板URL不能为空');
            }

            // 检查名称是否重复
            const existingEngines = await this.getSearchEngines();
            const nameExists = existingEngines.some(e => 
                e.name.toLowerCase() === engine.name.trim().toLowerCase() && e.id !== engine.id
            );
            if (nameExists) {
                throw new Error('搜索引擎名称已存在');
            }

            const engineData = {
                id: engine.id,
                name: engine.name.trim(),
                template: engine.template.trim(),
                icon: engine.icon || '🔍',
                order: engine.order || 0,
                createdAt: engine.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.executeTransaction('searchEngines', 'readwrite', (store) => {
                return store.put(engineData);
            });

            return engineData;
        } catch (error) {
            console.error('更新搜索引擎失败:', error);
            throw error;
        }
    }

    /**
     * 删除搜索引擎
     */
    async deleteSearchEngine(id) {
        try {
            if (!id) {
                throw new Error('搜索引擎ID不能为空');
            }
            await this.executeTransaction('searchEngines', 'readwrite', (store) => {
                return store.delete(id);
            });
            return true;
        } catch (error) {
            console.error('删除搜索引擎失败:', error);
            throw error;
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

            // 验证parentId（如果提供）
            if (category.parentId) {
                const parentCategory = await this.getCategoryById(category.parentId);
                if (!parentCategory) {
                    throw new Error('指定的父级分类不存在');
                }
                // 防止循环引用
                if (category.parentId === category.id) {
                    throw new Error('不能将分类设置为自己的子分类');
                }
            }

            // 设置默认值
            const categoryData = {
                id: category.id,
                name: category.name.trim(),
                icon: category.icon || '📁',
                color: category.color || '#3b82f6',
                description: category.description || '',
                order: category.order || 0,
                parentId: category.parentId || null,
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

            // 验证parentId（如果提供）
            if (category.parentId !== undefined) {
                if (category.parentId) {
                    const parentCategory = await this.getCategoryById(category.parentId);
                    if (!parentCategory) {
                        throw new Error('指定的父级分类不存在');
                    }
                    // 防止循环引用
                    if (category.parentId === category.id) {
                        throw new Error('不能将分类设置为自己的子分类');
                    }
                    // 防止设置为自己的子分类
                    const childCategories = await this.getChildCategories(category.id);
                    if (childCategories.some(child => child.id === category.parentId)) {
                        throw new Error('不能将分类设置为自己子分类的子分类');
                    }
                }
            }

            // 合并数据
            const updatedCategory = {
                ...existingCategory,
                ...category,
                name: category.name.trim(),
                parentId: category.parentId !== undefined ? category.parentId : existingCategory.parentId,
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

            // 获取所有子分类
            const childCategories = await this.getChildCategories(categoryId);
            
            // 递归删除所有子分类
            for (const childCategory of childCategories) {
                await this.deleteCategory(childCategory.id);
            }

            // 删除该分类下的所有网站
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

            // URL重复检查已移除，允许添加重复URL的网站

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
                paymentType: website.paymentType || '',
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
    async updateWebsite(websiteIdOrWebsite, websiteData = null) {
        try {
            let website;
            
            // 兼容两种调用方式：updateWebsite(website) 或 updateWebsite(id, websiteData)
            if (typeof websiteIdOrWebsite === 'string' && websiteData) {
                // 第二种方式：updateWebsite(id, websiteData)
                website = { ...websiteData, id: websiteIdOrWebsite };
            } else {
                // 第一种方式：updateWebsite(website)
                website = websiteIdOrWebsite;
            }
            
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

            // URL重复检查已移除，允许更新为重复URL的网站

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
                paymentType: website.paymentType || existingWebsite.paymentType || '',
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

    // ==================== 分类层级方法 ====================

    /**
     * 获取子分类
     */
    async getChildCategories(parentId) {
        try {
            const categories = await this.executeTransaction('categories', 'readonly', (store) => {
                const index = store.index('parentId');
                return index.getAll(parentId);
            });
            return categories || [];
        } catch (error) {
            console.error('获取子分类失败:', error);
            return [];
        }
    }

    /**
     * 获取顶级分类（没有父分类的分类）
     */
    async getTopLevelCategories() {
        try {
            const allCategories = await this.getCategories();
            return allCategories.filter(category => !category.parentId);
        } catch (error) {
            console.error('获取顶级分类失败:', error);
            return [];
        }
    }

    /**
     * 获取分类的所有祖先分类
     */
    async getCategoryAncestors(categoryId) {
        try {
            const ancestors = [];
            let currentCategory = await this.getCategoryById(categoryId);
            
            while (currentCategory && currentCategory.parentId) {
                const parent = await this.getCategoryById(currentCategory.parentId);
                if (parent) {
                    ancestors.unshift(parent);
                    currentCategory = parent;
                } else {
                    break;
                }
            }
            
            return ancestors;
        } catch (error) {
            console.error('获取祖先分类失败:', error);
            return [];
        }
    }

    /**
     * 获取分类的所有后代分类
     */
    async getCategoryDescendants(categoryId) {
        try {
            const descendants = [];
            const children = await this.getChildCategories(categoryId);
            
            for (const child of children) {
                descendants.push(child);
                const grandChildren = await this.getCategoryDescendants(child.id);
                descendants.push(...grandChildren);
            }
            
            return descendants;
        } catch (error) {
            console.error('获取后代分类失败:', error);
            return [];
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
            const stores = ['categories', 'websites', 'filters', 'searchEngines'];
            
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
            const [categories, websites, filters] = await Promise.all([
                this.getCategories(),
                this.getWebsites(),
                this.getFilters()
            ]);

            return {
                categoriesCount: categories.length,
                websitesCount: websites.length,
                filtersCount: filters.length,
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