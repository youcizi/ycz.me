/**
 * 存储集成系统
 * 负责协调IndexedDB和localStorage之间的数据存储
 * 提供统一的存储接口和数据迁移功能
 */

class StorageIntegration {
    constructor() {
        this.navigationDB = null;
        this.passwordManager = null;
        this.dataManager = null;
        this.dataManagerUI = null;
        this.isIndexedDBEnabled = false;
        this.isInitialized = false;
    }

    /**
     * 初始化存储集成系统
     */
    async initialize() {
        try {
            // 开始初始化存储集成系统
            
            // 检查IndexedDB支持
            if (!this.checkIndexedDBSupport()) {
                // 浏览器不支持IndexedDB，使用localStorage模式
                this.isIndexedDBEnabled = false;
                this.isInitialized = true;
                return;
            }

            // 初始化NavigationDB
            this.navigationDB = new NavigationDB();
            await this.navigationDB.init();
            
            // 初始化密码管理器
            this.passwordManager = new PasswordManager();
            this.passwordManager.setNavigationDB(this.navigationDB);
            
            // 初始化数据管理器
            this.dataManager = new DataManager();
            this.dataManager.setNavigationDB(this.navigationDB);
            
            // 初始化数据管理界面
            this.dataManagerUI = new DataManagerUI();
            this.dataManagerUI.setDataManager(this.dataManager);
            
            // 检查是否需要密码验证
            await this.checkPasswordRequired();
            
            // 集成到现有应用
            this.integrateWithExistingApp();
            
            this.isIndexedDBEnabled = true;
            this.isInitialized = true;
            
            // 存储集成系统初始化完成
            
        } catch (error) {
            // 存储集成系统初始化失败
            this.isIndexedDBEnabled = false;
            this.isInitialized = true;
            throw error;
        }
    }

    /**
     * 检查IndexedDB支持
     */
    checkIndexedDBSupport() {
        return 'indexedDB' in window && window.indexedDB !== null;
    }



    /**
     * 检查是否需要密码验证
     */
    async checkPasswordRequired() {
        try {
            if (!this.navigationDB) return;
            
            const isPasswordSet = await this.navigationDB.hasPassword();
            if (isPasswordSet) {
                // 检测到密码保护，需要验证
                this.passwordManager.showPasswordVerification();
            }
        } catch (error) {
            // 检查密码状态失败
        }
    }

    /**
     * 集成到现有应用
     */
    integrateWithExistingApp() {
        try {
            // 扩展NavigationApp类
            this.extendNavigationApp();
            
            // 添加数据管理入口
            this.addDataManagementEntry();
            
            // 添加密码管理入口
            this.addPasswordManagementEntry();
            
        } catch (error) {
            // 集成到现有应用失败
        }
    }

    /**
     * 扩展NavigationApp类
     */
    extendNavigationApp() {
        if (typeof window.NavigationApp === 'undefined') {
            // NavigationApp未找到，跳过扩展
            return;
        }

        const originalApp = window.NavigationApp;
        const storageIntegration = this;

        // 扩展数据加载方法
        if (originalApp.prototype.loadWebsitesFromServer) {
            const originalLoadWebsites = originalApp.prototype.loadWebsitesFromServer;
            originalApp.prototype.loadWebsitesFromServer = async function(category) {
                if (storageIntegration.isIndexedDBEnabled && storageIntegration.navigationDB) {
                    try {
                        // 尝试从IndexedDB加载
                        const websites = await storageIntegration.navigationDB.getWebsitesByCategory(category);
                        if (websites.length > 0) {
                            return websites;
                        }
                    } catch (error) {
                        // 从IndexedDB加载失败，回退到服务器
                    }
                }
                // 回退到原始方法
                return originalLoadWebsites.call(this, category);
            };
        }

        // 扩展数据保存方法
        if (originalApp.prototype.setCachedWebsites) {
            const originalSetCached = originalApp.prototype.setCachedWebsites;
            originalApp.prototype.setCachedWebsites = async function(category, websites) {
                if (storageIntegration.isIndexedDBEnabled && storageIntegration.navigationDB) {
                    try {
                        // 同时保存到IndexedDB
                        for (const website of websites) {
                            await storageIntegration.navigationDB.addWebsite({
                                ...website,
                                category: category
                            });
                        }
                    } catch (error) {
                        // 保存到IndexedDB失败
                    }
                }
                // 调用原始方法
                return originalSetCached.call(this, category, websites);
            };
        }
    }

    /**
     * 添加数据管理入口
     */
    addDataManagementEntry() {
        try {
            // 在设置菜单中添加数据管理选项
            const settingsMenu = document.querySelector('.settings-menu, .user-menu, .nav-menu');
            if (settingsMenu) {
                const dataManagementItem = document.createElement('li');
                dataManagementItem.innerHTML = `
                    <a href="#" id="data-management-link" class="menu-item">
                        <i class="icon-database"></i>
                        <span>数据管理</span>
                    </a>
                `;
                settingsMenu.appendChild(dataManagementItem);

                // 绑定点击事件
                document.getElementById('data-management-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    if (this.dataManagerUI) {
                        this.dataManagerUI.show();
                    }
                });
            } else {
                // 如果没有找到设置菜单，在页面底部添加浮动按钮
                this.addFloatingDataManagementButton();
            }
        } catch (error) {
            // 添加数据管理入口失败
        }
    }

    /**
     * 添加浮动数据管理按钮
     */
    addFloatingDataManagementButton() {
        const floatingButton = document.createElement('div');
        floatingButton.id = 'floating-data-management';
        floatingButton.className = 'floating-button';
        floatingButton.innerHTML = `
            <button type="button" title="数据管理">
                <i class="icon-database"></i>
            </button>
        `;
        floatingButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            background: var(--primary-color, #007bff);
            border-radius: 50%;
            width: 56px;
            height: 56px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            transition: all 0.3s ease;
        `;

        floatingButton.addEventListener('click', () => {
            if (this.dataManagerUI) {
                this.dataManagerUI.show();
            }
        });

        document.body.appendChild(floatingButton);
    }

    /**
     * 添加密码管理入口
     */
    addPasswordManagementEntry() {
        try {
            // 在设置菜单中添加密码管理选项
            const settingsMenu = document.querySelector('.settings-menu, .user-menu, .nav-menu');
            if (settingsMenu) {
                const passwordManagementItem = document.createElement('li');
                passwordManagementItem.innerHTML = `
                    <a href="#" id="password-management-link" class="menu-item">
                        <i class="icon-lock"></i>
                        <span>密码管理</span>
                    </a>
                `;
                settingsMenu.appendChild(passwordManagementItem);

                // 绑定点击事件
                document.getElementById('password-management-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    if (this.passwordManager) {
                        this.passwordManager.showPasswordSettings();
                    }
                });
            }
        } catch (error) {
            // 添加密码管理入口失败
        }
    }

    /**
     * 获取存储适配器
     */
    getStorageAdapter() {
        if (this.isIndexedDBEnabled && this.navigationDB) {
            return new IndexedDBAdapter(this.navigationDB);
        } else {
            return new LocalStorageAdapter();
        }
    }

    /**
     * 销毁存储集成系统
     */
    destroy() {
        try {
            if (this.dataManagerUI) {
                this.dataManagerUI.destroy();
            }
            if (this.passwordManager) {
                this.passwordManager.destroy();
            }
            if (this.navigationDB) {
                this.navigationDB.close();
            }
            
            // 移除添加的UI元素
            const floatingButton = document.getElementById('floating-data-management');
            if (floatingButton) {
                floatingButton.remove();
            }
            
            this.isInitialized = false;
            // 存储集成系统已销毁
        } catch (error) {
            // 销毁存储集成系统失败
        }
    }
}

/**
 * IndexedDB存储适配器
 */
class IndexedDBAdapter {
    constructor(navigationDB) {
        this.navigationDB = navigationDB;
    }

    async getCategories() {
        return await this.navigationDB.getCategories();
    }

    async getWebsites(category) {
        return await this.navigationDB.getWebsitesByCategory(category);
    }

    async addWebsite(website) {
        return await this.navigationDB.addWebsite(website);
    }

    async updateWebsite(website) {
        return await this.navigationDB.updateWebsite(website);
    }

    async deleteWebsite(id) {
        return await this.navigationDB.deleteWebsite(id);
    }

    async addCategory(category) {
        return await this.navigationDB.addCategory(category);
    }

    async updateCategory(category) {
        return await this.navigationDB.updateCategory(category);
    }

    async deleteCategory(id) {
        return await this.navigationDB.deleteCategory(id);
    }
}

/**
 * localStorage存储适配器
 */
class LocalStorageAdapter {
    constructor() {
        this.prefix = 'nav_';
    }

    async getCategories() {
        try {
            const data = localStorage.getItem(this.prefix + 'categories');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            // 获取分类失败
            return [];
        }
    }

    async getWebsites(category) {
        try {
            const data = localStorage.getItem(this.prefix + 'websites_' + category);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            // 获取网站失败
            return [];
        }
    }

    async addWebsite(website) {
        try {
            const websites = await this.getWebsites(website.category);
            website.id = Date.now().toString();
            websites.push(website);
            localStorage.setItem(this.prefix + 'websites_' + website.category, JSON.stringify(websites));
            return website;
        } catch (error) {
            // 添加网站失败
            throw error;
        }
    }

    async updateWebsite(website) {
        try {
            const websites = await this.getWebsites(website.category);
            const index = websites.findIndex(w => w.id === website.id);
            if (index !== -1) {
                websites[index] = website;
                localStorage.setItem(this.prefix + 'websites_' + website.category, JSON.stringify(websites));
            }
            return website;
        } catch (error) {
            // 更新网站失败
            throw error;
        }
    }

    async deleteWebsite(id, category) {
        try {
            const websites = await this.getWebsites(category);
            const filteredWebsites = websites.filter(w => w.id !== id);
            localStorage.setItem(this.prefix + 'websites_' + category, JSON.stringify(filteredWebsites));
        } catch (error) {
            // 删除网站失败
            throw error;
        }
    }

    async addCategory(category) {
        try {
            const categories = await this.getCategories();
            category.id = Date.now().toString();
            categories.push(category);
            localStorage.setItem(this.prefix + 'categories', JSON.stringify(categories));
            return category;
        } catch (error) {
            // 添加分类失败
            throw error;
        }
    }

    async updateCategory(category) {
        try {
            const categories = await this.getCategories();
            const index = categories.findIndex(c => c.id === category.id);
            if (index !== -1) {
                categories[index] = category;
                localStorage.setItem(this.prefix + 'categories', JSON.stringify(categories));
            }
            return category;
        } catch (error) {
            // 更新分类失败
            throw error;
        }
    }

    async deleteCategory(id) {
        try {
            const categories = await this.getCategories();
            const filteredCategories = categories.filter(c => c.id !== id);
            localStorage.setItem(this.prefix + 'categories', JSON.stringify(filteredCategories));
        } catch (error) {
            // 删除分类失败
            throw error;
        }
    }
}

// 全局存储集成实例
let globalStorageIntegration = null;

/**
 * 初始化存储集成系统
 */
async function initializeStorageIntegration() {
    if (globalStorageIntegration && globalStorageIntegration.isInitialized) {
        // 存储集成系统已初始化
        return globalStorageIntegration;
    }

    globalStorageIntegration = new StorageIntegration();
    await globalStorageIntegration.initialize();
    
    // 将实例暴露到全局
    window.storageIntegration = globalStorageIntegration;
    
    return globalStorageIntegration;
}

/**
 * 获取存储集成实例
 */
function getStorageIntegration() {
    return globalStorageIntegration;
}

// 导出到全局
window.StorageIntegration = StorageIntegration;
window.IndexedDBAdapter = IndexedDBAdapter;
window.LocalStorageAdapter = LocalStorageAdapter;
window.initializeStorageIntegration = initializeStorageIntegration;
window.getStorageIntegration = getStorageIntegration;