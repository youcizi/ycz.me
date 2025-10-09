/**
 * 数据同步服务
 * 负责服务器数据获取和本地数据同步
 */
import indexedDBService from './IndexedDBService.js';
import { fetchDefaultData } from './DefaultDataProvider.js';

class DataSyncService {
    constructor() {
        this.isInitialized = false;
        this.isInitializing = false;
        // 默认数据改由 DefaultDataProvider 异步提供
        this.defaultData = {};
    }

    /**
     * 初始化数据同步服务
     */
    async init() {
        if (this.isInitialized) {
            return true;
        }

        if (this.isInitializing) {
            // 如果正在初始化，等待完成
            return new Promise((resolve) => {
                const checkInit = () => {
                    if (this.isInitialized) {
                        resolve(true);
                    } else {
                        setTimeout(checkInit, 100);
                    }
                };
                checkInit();
            });
        }

        this.isInitializing = true;

        try {
            console.log('开始初始化数据同步服务...');
            
            // 初始化IndexedDB
            await indexedDBService.init();
            
            // 检查是否有本地数据（分类、网站、筛选、搜索引擎）
            const [categories, websites, filters, engines] = await Promise.all([
                indexedDBService.getCategories(),
                indexedDBService.getWebsites(),
                indexedDBService.getFilters(),
                indexedDBService.getSearchEngines()
            ]);
            
            console.log(`本地数据检查: 分类${categories.length}个, 网站${websites.length}个, 筛选${filters.length}个, 搜索引擎${engines.length}个`);
            
            // 默认数据在 IndexedDB 首次建库时写入，此处不再自动写入，保持用户数据主导
            console.log('跳过默认数据加载：默认数据由数据库结构创建时写入');
            
            this.isInitialized = true;
            this.isInitializing = false;
            console.log('数据同步服务初始化完成');
            return true;
        } catch (error) {
            console.error('数据同步服务初始化失败:', error);
            this.isInitializing = false;
            throw error;
        }
    }

    /**
     * 检查本地是否有数据
     */
    async checkLocalData() {
        try {
            const categories = await dbService.getCategories();
            const websites = await dbService.getWebsites();
            return categories.length > 0 || websites.length > 0;
        } catch (error) {
            console.error('检查本地数据失败:', error);
            return false;
        }
    }

    /**
     * 从服务器同步数据
     */
    async syncFromServer() {
        try {
            console.log('正在从服务器获取数据...');
            
            // 获取分类数据
            const categoriesResponse = await fetch(`${this.apiBaseUrl}/categories`);
            if (categoriesResponse.ok) {
                const serverCategories = await categoriesResponse.json();
                await this.syncCategories(serverCategories);
            }
            
            // 获取网站数据
            const websitesResponse = await fetch(`${this.apiBaseUrl}/websites`);
            if (websitesResponse.ok) {
                const serverWebsites = await websitesResponse.json();
                await this.syncWebsites(serverWebsites);
            }
            
            console.log('服务器数据同步完成');
        } catch (error) {
            console.error('从服务器同步数据失败:', error);
            throw error;
        }
    }

    /**
     * 同步分类数据
     */
    async syncCategories(serverCategories) {
        if (!Array.isArray(serverCategories) || serverCategories.length === 0) {
            return;
        }
        
        for (const category of serverCategories) {
            try {
                await dbService.addCategory({
                    name: category.name,
                    icon: category.icon || '📁'
                });
            } catch (error) {
                console.warn('同步分类失败:', category.name, error);
            }
        }
    }

    /**
     * 同步网站数据
     */
    async syncWebsites(serverWebsites) {
        if (!Array.isArray(serverWebsites) || serverWebsites.length === 0) {
            return;
        }
        
        // 获取本地分类，建立映射关系
        const localCategories = await dbService.getCategories();
        const categoryMap = new Map();
        localCategories.forEach(cat => {
            categoryMap.set(cat.name, cat.id);
        });
        
        for (const website of serverWebsites) {
            try {
                // 查找对应的本地分类ID
                const categoryId = categoryMap.get(website.category) || localCategories[0]?.id;
                
                if (categoryId) {
                    await dbService.addWebsite({
                        title: website.title,
                        url: website.url,
                        description: website.description || '',
                        icon: website.icon || '🌐',
                        categoryId: categoryId
                    });
                }
            } catch (error) {
                console.warn('同步网站失败:', website.title, error);
            }
        }
    }

    /**
     * 加载默认数据
     */
    async loadDefaultData() {
        try {
            console.log('开始加载默认数据...');
            
            // 从提供者异步获取默认数据
            const defaultData = await fetchDefaultData();

            // 先添加默认分类
            const addedCategories = [];
            for (const category of (defaultData.categories || [])) {
                try {
                    const addedCategory = await indexedDBService.addCategory(category);
                    addedCategories.push(addedCategory);
                    console.log(`添加分类成功: ${category.name}`);
                } catch (error) {
                    console.error(`添加分类失败: ${category.name}`, error);
                }
            }
            
            // 再添加默认网站
            const addedWebsites = [];
            for (const website of (defaultData.websites || [])) {
                try {
                    const addedWebsite = await indexedDBService.addWebsite(website);
                    addedWebsites.push(addedWebsite);
                    console.log(`添加网站成功: ${website.name}`);
                } catch (error) {
                    console.error(`添加网站失败: ${website.name}`, error);
                }
            }

            // 添加默认筛选标签
            const addedFilters = [];
            for (const filter of (defaultData.filters || [])) {
                try {
                    const addedFilter = await indexedDBService.addFilter(filter);
                    addedFilters.push(addedFilter);
                    console.log(`添加筛选标签成功: ${filter.name}`);
                } catch (error) {
                    console.error(`添加筛选标签失败: ${filter.name}`, error);
                }
            }

            // 添加默认搜索引擎
            const addedEngines = [];
            for (const engine of (defaultData.searchEngines || [])) {
                try {
                    const addedEngine = await indexedDBService.addSearchEngine(engine);
                    addedEngines.push(addedEngine);
                    console.log(`添加搜索引擎成功: ${engine.name}`);
                } catch (error) {
                    console.error(`添加搜索引擎失败: ${engine.name}`, error);
                }
            }
            
            console.log(`默认数据加载完成: 分类${addedCategories.length}个, 网站${addedWebsites.length}个, 筛选${addedFilters.length}个, 搜索引擎${addedEngines.length}个`);
            return {
                categories: addedCategories,
                websites: addedWebsites,
                filters: addedFilters,
                searchEngines: addedEngines
            };
        } catch (error) {
            console.error('加载默认数据失败:', error);
            throw error;
        }
    }

    /**
     * 同步数据（预留接口）
     */
    async syncData() {
        try {
            await this.init();
            // 这里可以实现与服务器的数据同步逻辑
            // 目前只是本地数据管理
            console.log('数据同步完成');
            return true;
        } catch (error) {
            console.error('数据同步失败:', error);
            throw error;
        }
    }

    /**
     * 重置数据到默认状态
     */
    async resetToDefault() {
        try {
            console.log('重置数据到默认状态...');
            await indexedDBService.clearAllData();
            await this.loadDefaultData();
            console.log('数据重置完成');
            return true;
        } catch (error) {
            console.error('重置数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取数据统计信息
     */
    async getStats() {
        try {
            await this.init();
            return await indexedDBService.getStats();
        } catch (error) {
            console.error('获取统计信息失败:', error);
            return {
                categoriesCount: 0,
                websitesCount: 0,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    // ==================== 数据访问代理方法 ====================

    async getCategories() {
        await this.init();
        return indexedDBService.getCategories();
    }

    async getCategoryById(id) {
        await this.init();
        return indexedDBService.getCategoryById(id);
    }

    async getWebsites() {
        await this.init();
        return indexedDBService.getWebsites();
    }

    async getWebsiteById(id) {
        await this.init();
        return indexedDBService.getWebsiteById(id);
    }

    async getWebsitesByCategory(categoryId) {
        await this.init();
        return indexedDBService.getWebsitesByCategory(categoryId);
    }

    async addCategory(category) {
        await this.init();
        return indexedDBService.addCategory(category);
    }

    async addWebsite(website) {
        await this.init();
        return indexedDBService.addWebsite(website);
    }

    async updateCategory(category) {
        await this.init();
        return indexedDBService.updateCategory(category);
    }

    async updateWebsite(website) {
        await this.init();
        return indexedDBService.updateWebsite(website);
    }

    async deleteCategory(id) {
        await this.init();
        return indexedDBService.deleteCategory(id);
    }

    async deleteWebsite(id) {
        await this.init();
        return indexedDBService.deleteWebsite(id);
    }

    /**
     * 清理资源
     */
    destroy() {
        this.isInitialized = false;
        this.isInitializing = false;
        indexedDBService.close();
        console.log('数据同步服务已销毁');
    }
}

// 导出单例实例
const dataSyncService = new DataSyncService();
export default dataSyncService;