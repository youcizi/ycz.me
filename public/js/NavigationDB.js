/**
 * NavigationDB - IndexedDB数据库管理类
 * 提供完整的本地数据存储解决方案，包括密码保护、数据加密、CRUD操作等功能
 */
class NavigationDB {
    constructor() {
        this.dbName = 'NavigationDB';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;
        
        // 对象存储名称
        this.stores = {
            SETTINGS: 'settings',
            WEBSITES: 'websites',
            CATEGORIES: 'categories',
            CACHE: 'cache',
            BACKUPS: 'backups',
            SESSIONS: 'sessions'
        };
        
        // 会话管理
        this.currentSession = null;
        this.sessionTimeout = 30 * 60 * 1000; // 30分钟
    }

    /**
     * 初始化数据库
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async init() {
        try {
            // 检查IndexedDB支持
            if (!window.indexedDB) {
                throw new Error('当前浏览器不支持IndexedDB');
            }

            this.db = await this._openDatabase();
            this.isInitialized = true;
            
            // 清理过期缓存和会话
            await this.clearExpiredCache();
            await this._clearExpiredSessions();
            
            // NavigationDB初始化成功
            return true;
        } catch (error) {
            // NavigationDB初始化失败
            throw error;
        }
    }

    /**
     * 检查数据库连接状态
     * @returns {boolean}
     */
    _isConnectionValid() {
        return this.db && this.isInitialized && this.db.objectStoreNames && this.db.objectStoreNames.length >= 0;
    }

    /**
     * 确保数据库连接有效
     * @returns {Promise<void>}
     */
    async _ensureConnection() {
        if (!this._isConnectionValid()) {
            // 数据库连接无效，重新初始化
            await this.init();
        }
    }

    /**
     * 安全执行数据库操作
     * @param {Function} operation 数据库操作函数
     * @param {number} retries 重试次数
     * @returns {Promise<any>}
     */
    async _safeExecute(operation, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                await this._ensureConnection();
                return await operation();
            } catch (error) {
                if (i === retries) {
                    throw error;
                }
                // 数据库操作失败，重试
                // 重置连接状态
                this.isInitialized = false;
                this.db = null;
                await new Promise(resolve => setTimeout(resolve, 100 * (i + 1))); // 递增延迟
            }
        }
    }

    /**
     * 打开数据库连接
     * @returns {Promise<IDBDatabase>}
     */
    _openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this._createObjectStores(db);
            };
        });
    }

    /**
     * 创建对象存储和索引
     * @param {IDBDatabase} db 
     */
    _createObjectStores(db) {
        // 创建设置存储
        if (!db.objectStoreNames.contains(this.stores.SETTINGS)) {
            const settingsStore = db.createObjectStore(this.stores.SETTINGS, { keyPath: 'id' });
        }
        
        // 创建网站存储
        if (!db.objectStoreNames.contains(this.stores.WEBSITES)) {
            const websitesStore = db.createObjectStore(this.stores.WEBSITES, { keyPath: 'id' });
            websitesStore.createIndex('categoryId', 'categoryId', { unique: false });
            websitesStore.createIndex('name', 'name', { unique: false });
            websitesStore.createIndex('url', 'url', { unique: false });
            websitesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            websitesStore.createIndex('deleted', 'deleted', { unique: false });
        }
        
        // 创建分类存储
        if (!db.objectStoreNames.contains(this.stores.CATEGORIES)) {
            const categoriesStore = db.createObjectStore(this.stores.CATEGORIES, { keyPath: 'id' });
            categoriesStore.createIndex('name', 'name', { unique: false });
            categoriesStore.createIndex('order', 'order', { unique: false });
            categoriesStore.createIndex('deleted', 'deleted', { unique: false });
        }
        
        // 创建缓存存储
        if (!db.objectStoreNames.contains(this.stores.CACHE)) {
            const cacheStore = db.createObjectStore(this.stores.CACHE, { keyPath: 'id' });
            cacheStore.createIndex('key', 'key', { unique: true });
            cacheStore.createIndex('expiry', 'expiry', { unique: false });
            cacheStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
        
        // 创建备份历史存储
        if (!db.objectStoreNames.contains(this.stores.BACKUPS)) {
            const backupsStore = db.createObjectStore(this.stores.BACKUPS, { keyPath: 'id' });
            backupsStore.createIndex('createdAt', 'createdAt', { unique: false });
            backupsStore.createIndex('autoBackup', 'autoBackup', { unique: false });
        }
        
        // 创建会话存储
        if (!db.objectStoreNames.contains(this.stores.SESSIONS)) {
            const sessionsStore = db.createObjectStore(this.stores.SESSIONS, { keyPath: 'id' });
            sessionsStore.createIndex('expiresAt', 'expiresAt', { unique: false });
            sessionsStore.createIndex('active', 'active', { unique: false });
        }
    }

    /**
     * 插入初始数据
     */
    async insertInitialData() {
        try {
            // 检查是否已有设置数据
            const existingSettings = await this.getSettings();
            if (existingSettings) {
                return; // 已有数据，不需要插入初始数据
            }

            const transaction = this.db.transaction([this.stores.SETTINGS, this.stores.CATEGORIES], 'readwrite');
            
            // 插入默认设置
            const settingsStore = transaction.objectStore(this.stores.SETTINGS);
            const defaultSettings = {
                id: 'main',
                passwordHash: null,
                salt: null,
                autoBackup: true,
                backupInterval: 7 * 24 * 60 * 60 * 1000, // 7天
                sessionTimeout: 30 * 60 * 1000, // 30分钟
                encryptionEnabled: true,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            await this._promisifyRequest(settingsStore.add(defaultSettings));
            
            // 插入默认分类
            const categoriesStore = transaction.objectStore(this.stores.CATEGORIES);
            const defaultCategories = [
                { id: 'all', name: '全部', icon: '📋', order: 0, createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
                { id: 'search', name: '搜索引擎', icon: '🔍', order: 1, createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
                { id: 'social', name: '社交媒体', icon: '💬', order: 2, createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
                { id: 'tools', name: '工具', icon: '🔧', order: 3, createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
                { id: 'entertainment', name: '娱乐', icon: '🎮', order: 4, createdAt: Date.now(), updatedAt: Date.now(), deleted: false }
            ];
            
            for (const category of defaultCategories) {
                await this._promisifyRequest(categoriesStore.add(category));
            }
            
            // 初始数据插入成功
        } catch (error) {
            // 插入初始数据失败
            throw error;
        }
    }

    // ==================== 密码管理 ====================

    /**
     * 检查是否已设置密码
     * @returns {Promise<boolean>}
     */
    async hasPassword() {
        try {
            const settings = await this.getSettings();
            return settings && settings.passwordHash !== null;
        } catch (error) {
            // 检查密码状态失败
            return false;
        }
    }

    /**
     * 设置密码
     * @param {string} password 
     * @returns {Promise<boolean>}
     */
    async setPassword(password) {
        try {
            if (!password || password.length < 6) {
                throw new Error('密码长度至少6位');
            }

            // 生成盐值和密码哈希
            const salt = CryptoUtils.generateSalt();
            const passwordHash = await CryptoUtils.hashPassword(password, salt);
            
            // 更新设置
            const settings = await this.getSettings() || { id: 'main' };
            settings.passwordHash = passwordHash;
            settings.salt = Array.from(salt); // 转换为数组存储
            settings.updatedAt = Date.now();
            
            await this._updateSettings(settings);
            
            // 密码设置成功
            return true;
        } catch (error) {
            // 设置密码失败
            throw error;
        }
    }

    /**
     * 验证密码
     * @param {string} password 
     * @returns {Promise<boolean>}
     */
    async verifyPassword(password) {
        try {
            const settings = await this.getSettings();
            if (!settings || !settings.passwordHash) {
                return false;
            }

            const salt = new Uint8Array(settings.salt);
            const isValid = await CryptoUtils.verifyPassword(password, settings.passwordHash, salt);
            
            if (isValid) {
                // 创建会话
                await this._createSession();
            }
            
            return isValid;
        } catch (error) {
            // 验证密码失败
            return false;
        }
    }

    /**
     * 修改密码
     * @param {string} oldPassword 
     * @param {string} newPassword 
     * @returns {Promise<boolean>}
     */
    async changePassword(oldPassword, newPassword) {
        try {
            // 验证旧密码
            const isOldPasswordValid = await this.verifyPassword(oldPassword);
            if (!isOldPasswordValid) {
                throw new Error('旧密码不正确');
            }

            // 设置新密码
            return await this.setPassword(newPassword);
        } catch (error) {
            // 修改密码失败
            throw error;
        }
    }

    // ==================== 会话管理 ====================

    /**
     * 创建用户会话
     */
    async _createSession() {
        try {
            const sessionId = this._generateId();
            const session = {
                id: sessionId,
                sessionToken: this._generateSessionToken(),
                createdAt: Date.now(),
                expiresAt: Date.now() + this.sessionTimeout,
                active: true
            };

            const transaction = this.db.transaction([this.stores.SESSIONS], 'readwrite');
            const store = transaction.objectStore(this.stores.SESSIONS);
            await this._promisifyRequest(store.add(session));
            
            this.currentSession = session;
        } catch (error) {
            // 创建会话失败
        }
    }

    /**
     * 检查会话是否有效
     * @returns {boolean}
     */
    isSessionValid() {
        if (!this.currentSession) {
            return false;
        }
        
        return this.currentSession.active && Date.now() < this.currentSession.expiresAt;
    }

    /**
     * 清理过期会话
     */
    async _clearExpiredSessions() {
        try {
            const transaction = this.db.transaction([this.stores.SESSIONS], 'readwrite');
            const store = transaction.objectStore(this.stores.SESSIONS);
            const index = store.index('expiresAt');
            
            const range = IDBKeyRange.upperBound(Date.now());
            const cursor = await this._promisifyRequest(index.openCursor(range));
            
            if (cursor) {
                await this._promisifyRequest(cursor.delete());
                cursor.continue();
            }
        } catch (error) {
            // 清理过期会话失败
        }
    }

    // ==================== 网站数据操作 ====================

    /**
     * 获取网站列表
     * @param {string} categoryId 分类ID，为空则获取所有
     * @returns {Promise<Array>}
     */
    async getWebsites(categoryId = null) {
        return await this._safeExecute(async () => {
            const transaction = this.db.transaction([this.stores.WEBSITES], 'readonly');
            const store = transaction.objectStore(this.stores.WEBSITES);
            
            let websites;
            if (categoryId && categoryId !== 'all') {
                const index = store.index('categoryId');
                websites = await this._promisifyRequest(index.getAll(categoryId));
            } else {
                websites = await this._promisifyRequest(store.getAll());
            }
            
            // 过滤已删除的网站并按更新时间排序
            return websites
                .filter(website => !website.deleted)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }).catch(error => {
            // 获取网站列表失败
            return [];
        });
    }

    /**
     * 添加网站
     * @param {Object} websiteData 
     * @returns {Promise<string>} 网站ID
     */
    async addWebsite(websiteData) {
        return await this._safeExecute(async () => {
            const website = {
                id: this._generateId(),
                name: websiteData.name,
                description: websiteData.description || '',
                url: websiteData.url,
                icon: websiteData.icon || '🌐',
                categoryId: websiteData.categoryId || 'all',
                priceType: websiteData.priceType || 'free',
                visitCount: 0,
                lastVisited: null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                deleted: false
            };

            const transaction = this.db.transaction([this.stores.WEBSITES], 'readwrite');
            const store = transaction.objectStore(this.stores.WEBSITES);
            await this._promisifyRequest(store.add(website));
            
            // 网站添加成功
            return website.id;
        });
    }

    /**
     * 更新网站
     * @param {string} id 
     * @param {Object} websiteData 
     * @returns {Promise<boolean>}
     */
    async updateWebsite(id, websiteData) {
        return await this._safeExecute(async () => {
            const transaction = this.db.transaction([this.stores.WEBSITES], 'readwrite');
            const store = transaction.objectStore(this.stores.WEBSITES);
            
            const existingWebsite = await this._promisifyRequest(store.get(id));
            if (!existingWebsite) {
                throw new Error('网站不存在');
            }

            const updatedWebsite = {
                ...existingWebsite,
                ...websiteData,
                id: id, // 确保ID不被覆盖
                categoryId: websiteData.categoryId || existingWebsite.categoryId || 'all', // 确保categoryId字段正确保存
                updatedAt: Date.now()
            };
            
            console.log('IndexedDB更新网站数据:', {
                id,
                originalData: existingWebsite,
                newData: websiteData,
                finalData: updatedWebsite
            });

            await this._promisifyRequest(store.put(updatedWebsite));
            
            // 网站更新成功
            return true;
        });
    }

    /**
     * 删除网站（软删除）
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    async deleteWebsite(id) {
        return await this._safeExecute(async () => {
            const transaction = this.db.transaction([this.stores.WEBSITES], 'readwrite');
            const store = transaction.objectStore(this.stores.WEBSITES);
            
            const website = await this._promisifyRequest(store.get(id));
            if (!website) {
                throw new Error('网站不存在');
            }
            
            website.deleted = true;
            website.deletedAt = Date.now();
            website.updatedAt = Date.now();
            
            await this._promisifyRequest(store.put(website));
            // 网站删除成功
            return true;
        });
    }

    /**
     * 搜索网站
     * @param {string} query 
     * @returns {Promise<Array>}
     */
    async searchWebsites(query) {
        try {
            const websites = await this.getWebsites();
            const searchQuery = query.toLowerCase();
            
            return websites.filter(website => 
                website.name.toLowerCase().includes(searchQuery) ||
                website.description.toLowerCase().includes(searchQuery) ||
                website.url.toLowerCase().includes(searchQuery)
            );
        } catch (error) {
            // 搜索网站失败
            return [];
        }
    }

    // ==================== 分类数据操作 ====================

    /**
     * 获取分类列表
     * @returns {Promise<Array>}
     */
    async getCategories() {
        return await this._safeExecute(async () => {
            const transaction = this.db.transaction([this.stores.CATEGORIES], 'readonly');
            const store = transaction.objectStore(this.stores.CATEGORIES);
            const index = store.index('order');
            
            const categories = await this._promisifyRequest(index.getAll());
            
            // 过滤已删除的分类并按顺序排序
            return categories
                .filter(category => !category.deleted)
                .sort((a, b) => a.order - b.order);
        }).catch(error => {
            // 获取分类列表失败
            return [];
        });
    }

    /**
     * 添加分类
     * @param {Object} categoryData 
     * @returns {Promise<string>} 分类ID
     */
    async addCategory(categoryData) {
        try {
            const categories = await this.getCategories();
            const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) : 0;
            
            const category = {
                id: this._generateId(),
                name: categoryData.name,
                icon: categoryData.icon || '📁',
                color: categoryData.color || '#3b82f6',
                order: maxOrder + 1,
                websiteCount: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                deleted: false
            };

            const transaction = this.db.transaction([this.stores.CATEGORIES], 'readwrite');
            const store = transaction.objectStore(this.stores.CATEGORIES);
            await this._promisifyRequest(store.add(category));
            
            // 分类添加成功
            return category.id;
        } catch (error) {
            // 添加分类失败
            throw error;
        }
    }

    /**
     * 更新分类
     * @param {string} id 
     * @param {Object} categoryData 
     * @returns {Promise<boolean>}
     */
    async updateCategory(id, categoryData) {
        try {
            const transaction = this.db.transaction([this.stores.CATEGORIES], 'readwrite');
            const store = transaction.objectStore(this.stores.CATEGORIES);
            
            const existingCategory = await this._promisifyRequest(store.get(id));
            if (!existingCategory) {
                throw new Error('分类不存在');
            }

            const updatedCategory = {
                ...existingCategory,
                ...categoryData,
                id: id, // 确保ID不被覆盖
                updatedAt: Date.now()
            };

            await this._promisifyRequest(store.put(updatedCategory));
            
            // 分类更新成功
            return true;
        } catch (error) {
            // 更新分类失败
            throw error;
        }
    }

    /**
     * 删除分类（软删除）
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    async deleteCategory(id) {
        try {
            // 检查分类下是否有网站
            const websites = await this.getWebsites(id);
            if (websites.length > 0) {
                throw new Error('该分类下还有网站，无法删除');
            }

            return await this.updateCategory(id, { 
                deleted: true,
                deletedAt: Date.now()
            });
        } catch (error) {
            // 删除分类失败
            throw error;
        }
    }

    /**
     * 批量保存分类数据（用于从服务器同步）
     * @param {Array} categories 
     * @returns {Promise<boolean>}
     */
    async saveCategories(categories) {
        try {
            const transaction = this.db.transaction([this.stores.CATEGORIES], 'readwrite');
            const store = transaction.objectStore(this.stores.CATEGORIES);
            
            // 清空现有分类数据
            await this._promisifyRequest(store.clear());
            
            // 批量添加新分类数据
            for (const category of categories) {
                const categoryData = {
                    ...category,
                    id: category.id || this._generateId(), // 确保有id字段
                    updatedAt: Date.now(),
                    deleted: category.deleted || false
                };
                await this._promisifyRequest(store.add(categoryData));
            }
            
            // 批量保存分类数据成功
            return true;
        } catch (error) {
            // 批量保存分类数据失败
            throw error;
        }
    }

    /**
     * 批量保存网站数据（用于从服务器同步）
     * @param {Array} websites 
     * @returns {Promise<boolean>}
     */
    async saveWebsites(websites) {
        try {
            const transaction = this.db.transaction([this.stores.WEBSITES], 'readwrite');
            const store = transaction.objectStore(this.stores.WEBSITES);
            
            // 清空现有网站数据
            await this._promisifyRequest(store.clear());
            
            // 批量添加新网站数据
            for (const website of websites) {
                const websiteData = {
                    ...website,
                    id: website.id || this._generateId(), // 确保有id字段
                    updatedAt: Date.now(),
                    deleted: website.deleted || false
                };
                await this._promisifyRequest(store.add(websiteData));
            }
            
            // 批量保存网站数据成功
            return true;
        } catch (error) {
            // 批量保存网站数据失败
            throw error;
        }
    }

    // ==================== 缓存管理 ====================

    /**
     * 获取缓存
     * @param {string} key 
     * @returns {Promise<any>}
     */
    async getCache(key) {
        try {
            const transaction = this.db.transaction([this.stores.CACHE], 'readonly');
            const store = transaction.objectStore(this.stores.CACHE);
            const index = store.index('key');
            
            const cacheEntry = await this._promisifyRequest(index.get(key));
            
            if (!cacheEntry) {
                return null;
            }
            
            // 检查是否过期
            if (cacheEntry.expiry && Date.now() > cacheEntry.expiry) {
                await this._deleteCacheEntry(cacheEntry.id);
                return null;
            }
            
            // 更新访问时间
            await this._updateCacheAccess(cacheEntry.id);
            
            return JSON.parse(cacheEntry.value);
        } catch (error) {
            // 获取缓存失败
            return null;
        }
    }

    /**
     * 设置缓存
     * @param {string} key 
     * @param {any} value 
     * @param {number} expiry 过期时间（毫秒），可选
     */
    async setCache(key, value, expiry = null) {
        try {
            const cacheEntry = {
                id: this._generateId(),
                key: key,
                value: JSON.stringify(value),
                expiry: expiry ? Date.now() + expiry : null,
                size: JSON.stringify(value).length,
                accessCount: 1,
                lastAccessed: Date.now(),
                createdAt: Date.now()
            };

            const transaction = this.db.transaction([this.stores.CACHE], 'readwrite');
            const store = transaction.objectStore(this.stores.CACHE);
            
            // 删除已存在的同key缓存
            const index = store.index('key');
            const existingEntry = await this._promisifyRequest(index.get(key));
            if (existingEntry) {
                await this._promisifyRequest(store.delete(existingEntry.id));
            }
            
            await this._promisifyRequest(store.add(cacheEntry));
        } catch (error) {
            // 设置缓存失败
        }
    }

    /**
     * 清理过期缓存
     */
    async clearExpiredCache() {
        return await this._safeExecute(async () => {
            const transaction = this.db.transaction([this.stores.CACHE], 'readwrite');
            const store = transaction.objectStore(this.stores.CACHE);
            const index = store.index('expiry');
            
            const range = IDBKeyRange.upperBound(Date.now());
            const cursor = await this._promisifyRequest(index.openCursor(range));
            
            while (cursor) {
                if (cursor.value.expiry) { // 只删除有过期时间的缓存
                    await this._promisifyRequest(cursor.delete());
                }
                cursor.continue();
            }
        });
    }

    /**
     * 清空所有缓存
     */
    async clearCache() {
        try {
            const transaction = this.db.transaction([this.stores.CACHE], 'readwrite');
            const store = transaction.objectStore(this.stores.CACHE);
            await this._promisifyRequest(store.clear());
        } catch (error) {
            // 清空缓存失败
        }
    }

    // ==================== 设置管理 ====================

    /**
     * 获取设置
     * @returns {Promise<Object>}
     */
    async getSettings() {
        return await this._safeExecute(async () => {
            const transaction = this.db.transaction([this.stores.SETTINGS], 'readonly');
            const store = transaction.objectStore(this.stores.SETTINGS);
            return await this._promisifyRequest(store.get('main'));
        });
    }

    /**
     * 更新设置
     * @param {Object} settings 
     */
    async _updateSettings(settings) {
        return await this._safeExecute(async () => {
            const transaction = this.db.transaction([this.stores.SETTINGS], 'readwrite');
            const store = transaction.objectStore(this.stores.SETTINGS);
            await this._promisifyRequest(store.put(settings));
        });
    }

    // ==================== 统计信息 ====================

    /**
     * 获取存储信息
     * @returns {Promise<Object>}
     */
    async getStorageInfo() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage || 0,
                    available: estimate.quota || 0,
                    total: estimate.quota || 0,
                    percentage: estimate.quota ? (estimate.usage / estimate.quota * 100).toFixed(2) : 0
                };
            }
            return {
                used: 0,
                available: 0,
                total: 0,
                percentage: 0
            };
        } catch (error) {
            // 获取存储信息失败
            return { used: 0, available: 0, total: 0, percentage: 0 };
        }
    }

    /**
     * 获取数据统计
     * @returns {Promise<Object>}
     */
    async getDataStats() {
        try {
            const websites = await this.getWebsites();
            const categories = await this.getCategories();
            
            return {
                websites: websites.length,
                categories: categories.length,
                lastUpdated: Date.now(),
                totalSize: 0 // 可以后续计算实际大小
            };
        } catch (error) {
            // 获取数据统计失败
            return { websites: 0, categories: 0, lastUpdated: Date.now(), totalSize: 0 };
        }
    }

    // ==================== 工具方法 ====================

    /**
     * 生成唯一ID
     * @returns {string}
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 生成会话令牌
     * @returns {string}
     */
    _generateSessionToken() {
        return Math.random().toString(36).substr(2) + Date.now().toString(36);
    }

    /**
     * Promise化IndexedDB请求
     * @param {IDBRequest} request 
     * @returns {Promise}
     */
    _promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 删除缓存条目
     * @param {string} id 
     */
    async _deleteCacheEntry(id) {
        try {
            const transaction = this.db.transaction([this.stores.CACHE], 'readwrite');
            const store = transaction.objectStore(this.stores.CACHE);
            await this._promisifyRequest(store.delete(id));
        } catch (error) {
            // 删除缓存条目失败
        }
    }

    /**
     * 更新缓存访问信息
     * @param {string} id 
     */
    async _updateCacheAccess(id) {
        try {
            const transaction = this.db.transaction([this.stores.CACHE], 'readwrite');
            const store = transaction.objectStore(this.stores.CACHE);
            
            const entry = await this._promisifyRequest(store.get(id));
            if (entry) {
                entry.accessCount = (entry.accessCount || 0) + 1;
                entry.lastAccessed = Date.now();
                await this._promisifyRequest(store.put(entry));
            }
        } catch (error) {
            // 更新缓存访问信息失败
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
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationDB;
} else {
    window.NavigationDB = NavigationDB;
}