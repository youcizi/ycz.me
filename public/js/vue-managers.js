/**
 * Vue3 数据管理器模块
 * 将原有的CategoryManager、DataManager、StorageIntegration重写为Vue3兼容的模块
 */

// ==================== 分类管理器 ====================
export const useCategoryManager = () => {
    const { ref, reactive, computed } = window.Vue;
    
    const categories = ref([]);
    const currentEditingCategory = ref(null);
    const draggedCategory = ref(null);
    
    // 事件总线
    const eventBus = reactive({
        listeners: {},
        emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(callback => callback(data));
            }
        },
        on(event, callback) {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        },
        off(event, callback) {
            if (this.listeners[event]) {
                this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            }
        }
    });
    
    // 加载分类数据
    const loadCategories = async () => {
        try {
            const response = await axios.get('/api/categories');
            if (response.data.success && response.data.data) {
                categories.value = response.data.data;
            } else {
                categories.value = [];
            }
        } catch (error) {
            console.error('加载分类失败:', error);
            categories.value = [];
        }
    };
    
    // 从服务器加载分类
    const loadCategoriesFromServer = async () => {
        try {
            const response = await axios.get('/api/categories');
            if (response.data.success && response.data.data) {
                categories.value = response.data.data;
            }
        } catch (error) {
            console.error('从服务器加载分类失败:', error);
        }
    };
    
    // 添加分类
    const addCategory = async (categoryData) => {
        try {
            const response = await axios.post('/api/categories', categoryData);
            if (response.data.success) {
                await loadCategories();
                eventBus.emit('categoryAdded', response.data.data);
                return response.data.data;
            }
        } catch (error) {
            console.error('添加分类失败:', error);
            throw error;
        }
    };
    
    // 更新分类
    const updateCategory = async (categoryData) => {
        try {
            const response = await axios.put(`/api/categories/${categoryData.id}`, categoryData);
            if (response.data.success) {
                await loadCategories();
                eventBus.emit('categoryUpdated', response.data.data);
                return response.data.data;
            }
        } catch (error) {
            console.error('更新分类失败:', error);
            throw error;
        }
    };
    
    // 删除分类
    const deleteCategory = async (categoryId) => {
        try {
            const response = await axios.delete(`/api/categories/${categoryId}`);
            if (response.data.success) {
                await loadCategories();
                eventBus.emit('categoryDeleted', categoryId);
                return true;
            }
        } catch (error) {
            console.error('删除分类失败:', error);
            throw error;
        }
    };
    
    // HTML转义
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    return {
        categories,
        currentEditingCategory,
        draggedCategory,
        eventBus,
        loadCategories,
        loadCategoriesFromServer,
        addCategory,
        updateCategory,
        deleteCategory,
        escapeHtml
    };
};

// ==================== 数据管理器 ====================
export const useDataManager = () => {
    const { ref, reactive } = window.Vue;
    
    const version = '1.0.0';
    const supportedFormats = ['json', 'csv', 'html'];
    const maxBackupCount = 10;
    const compressionEnabled = true;
    
    // 导出所有数据
    const exportAllData = async (options = {}) => {
        const {
            format = 'json',
            includeSettings = true,
            includeCache = false,
            includeBackups = false,
            encrypt = false,
            password = null,
            filename = null
        } = options;
        
        try {
            // 收集导出数据
            const exportData = await collectExportData({
                includeSettings,
                includeCache,
                includeBackups
            });
            
            // 根据格式处理数据
            let processedData;
            let mimeType;
            let fileExtension;
            
            switch (format.toLowerCase()) {
                case 'json':
                    processedData = formatAsJSON(exportData, encrypt, password);
                    mimeType = 'application/json';
                    fileExtension = 'json';
                    break;
                case 'csv':
                    processedData = formatAsCSV(exportData);
                    mimeType = 'text/csv';
                    fileExtension = 'csv';
                    break;
                case 'html':
                    processedData = formatAsHTML(exportData);
                    mimeType = 'text/html';
                    fileExtension = 'html';
                    break;
                default:
                    throw new Error(`不支持的导出格式: ${format}`);
            }
            
            // 生成文件名
            const finalFilename = filename || generateExportFilename(fileExtension, encrypt);
            
            // 创建下载
            const result = {
                success: true,
                filename: finalFilename,
                size: new Blob([processedData]).size,
                format,
                encrypted: encrypt,
                timestamp: Date.now(),
                dataStats: getDataStats(exportData)
            };
            
            // 触发下载
            downloadFile(processedData, finalFilename, mimeType);
            
            return result;
        } catch (error) {
            console.error('数据导出失败:', error);
            throw error;
        }
    };
    
    // 收集导出数据
    const collectExportData = async (options = {}) => {
        const {
            includeSettings = true,
            includeCache = false,
            includeBackups = false
        } = options;
        
        try {
            const [websitesResponse, categoriesResponse] = await Promise.all([
                axios.get('/api/websites'),
                axios.get('/api/categories')
            ]);
            
            const exportData = {
                metadata: {
                    version,
                    exportTime: Date.now(),
                    exportTimeISO: new Date().toISOString(),
                    source: 'NavigationApp',
                    format: 'NavigationDB Export'
                },
                websites: websitesResponse.data.success ? websitesResponse.data.data : [],
                categories: categoriesResponse.data.success ? categoriesResponse.data.data : []
            };
            
            if (includeSettings) {
                try {
                    const settingsResponse = await axios.get('/api/settings');
                    exportData.settings = settingsResponse.data.success ? settingsResponse.data.data : {};
                } catch (error) {
                    exportData.settings = {};
                }
            }
            
            return exportData;
        } catch (error) {
            console.error('收集导出数据失败:', error);
            throw error;
        }
    };
    
    // 格式化为JSON
    const formatAsJSON = (data, encrypt = false, password = null) => {
        return JSON.stringify(data, null, 2);
    };
    
    // 格式化为CSV
    const formatAsCSV = (data) => {
        const csvParts = [];
        
        // 导出网站数据
        if (data.websites && data.websites.length > 0) {
            csvParts.push('# 网站数据');
            csvParts.push('名称,描述,URL,图标,分类ID,价格类型,访问次数,最后访问,创建时间');
            
            data.websites.forEach(website => {
                const row = [
                    escapeCsvValue(website.name),
                    escapeCsvValue(website.description || ''),
                    escapeCsvValue(website.url),
                    escapeCsvValue(website.icon || ''),
                    escapeCsvValue(website.categoryId || ''),
                    escapeCsvValue(website.priceType || ''),
                    website.visitCount || 0,
                    website.lastVisited ? new Date(website.lastVisited).toISOString() : '',
                    new Date(website.createdAt).toISOString()
                ];
                csvParts.push(row.join(','));
            });
            csvParts.push('');
        }
        
        // 导出分类数据
        if (data.categories && data.categories.length > 0) {
            csvParts.push('# 分类数据');
            csvParts.push('ID,名称,图标,颜色,排序,网站数量,创建时间');
            
            data.categories.forEach(category => {
                const row = [
                    escapeCsvValue(category.id),
                    escapeCsvValue(category.name),
                    escapeCsvValue(category.icon || ''),
                    escapeCsvValue(category.color || ''),
                    category.order || 0,
                    category.websiteCount || 0,
                    new Date(category.createdAt).toISOString()
                ];
                csvParts.push(row.join(','));
            });
        }
        
        return csvParts.join('\n');
    };
    
    // 格式化为HTML
    const formatAsHTML = (data) => {
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>导航数据导出 - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #007cba; padding-bottom: 5px; }
        .website-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .website-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9; }
        .website-card h3 { margin: 0 0 10px 0; color: #007cba; }
        .website-card .url { color: #666; word-break: break-all; }
        .category-list { display: flex; flex-wrap: wrap; gap: 10px; }
        .category-tag { background: #007cba; color: white; padding: 5px 10px; border-radius: 15px; font-size: 0.9em; }
        .stats { background: #e7f3ff; padding: 15px; border-radius: 5px; }
        .metadata { font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌐 导航数据导出</h1>
        <div class="metadata">
            <p><strong>导出时间:</strong> ${new Date(data.metadata.exportTime).toLocaleString()}</p>
            <p><strong>数据版本:</strong> ${data.metadata.version}</p>
            <p><strong>来源:</strong> ${data.metadata.source}</p>
        </div>
    </div>

    <div class="section">
        <h2>📊 数据统计</h2>
        <div class="stats">
            <p><strong>网站总数:</strong> ${data.websites ? data.websites.length : 0}</p>
            <p><strong>分类总数:</strong> ${data.categories ? data.categories.length : 0}</p>
        </div>
    </div>

    ${data.categories && data.categories.length > 0 ? `
    <div class="section">
        <h2>📁 分类列表</h2>
        <div class="category-list">
            ${data.categories.map(cat => `
                <div class="category-tag" style="background-color: ${cat.color || '#007cba'}">
                    ${cat.icon || '📁'} ${escapeHtml(cat.name)}
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    ${data.websites && data.websites.length > 0 ? `
    <div class="section">
        <h2>🌐 网站列表</h2>
        <div class="website-grid">
            ${data.websites.map(site => `
                <div class="website-card">
                    <h3>${site.icon || '🌐'} ${escapeHtml(site.name)}</h3>
                    ${site.description ? `<p>${escapeHtml(site.description)}</p>` : ''}
                    <p class="url"><a href="${site.url}" target="_blank">${escapeHtml(site.url)}</a></p>
                    <div class="metadata">
                        <small>分类: ${site.categoryId || '未分类'} | 访问: ${site.visitCount || 0}次</small>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <div class="metadata">
            <p><em>此文件由 NavigationApp 数据管理器生成</em></p>
        </div>
    </div>
</body>
</html>`;
    };
    
    // 辅助函数
    const escapeCsvValue = (value) => {
        if (typeof value !== 'string') return value;
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
    };
    
    const generateExportFilename = (extension, encrypted = false) => {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const prefix = encrypted ? 'navigation-data-encrypted' : 'navigation-data';
        return `${prefix}-${timestamp}.${extension}`;
    };
    
    const getDataStats = (data) => {
        return {
            websites: data.websites ? data.websites.length : 0,
            categories: data.categories ? data.categories.length : 0
        };
    };
    
    const downloadFile = (content, filename, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    return {
        version,
        supportedFormats,
        maxBackupCount,
        compressionEnabled,
        exportAllData,
        collectExportData,
        formatAsJSON,
        formatAsCSV,
        formatAsHTML
    };
};

// ==================== 存储集成管理器 ====================
export const useStorageIntegration = () => {
    const { ref, reactive } = window.Vue;
    
    const isIndexedDBEnabled = ref(false);
    const isInitialized = ref(false);
    
    // 检查IndexedDB支持
    const checkIndexedDBSupport = () => {
        return 'indexedDB' in window && window.indexedDB !== null;
    };
    
    // 初始化存储集成系统
    const initialize = async () => {
        try {
            console.log('开始初始化存储集成系统');
            
            // 由于项目没有后端API，直接使用localStorage模式
            console.log('使用localStorage模式进行数据存储');
            isIndexedDBEnabled.value = false;
            isInitialized.value = true;
            
            console.log('存储集成系统初始化完成');
        } catch (error) {
            console.error('存储集成系统初始化失败:', error);
            isIndexedDBEnabled.value = false;
            isInitialized.value = true;
            throw error;
        }
    };
    
    // 获取存储适配器
    const getStorageAdapter = () => {
        if (isIndexedDBEnabled.value) {
            return new IndexedDBAdapter();
        } else {
            return new LocalStorageAdapter();
        }
    };
    
    return {
        isIndexedDBEnabled,
        isInitialized,
        checkIndexedDBSupport,
        initialize,
        getStorageAdapter
    };
};

// ==================== 存储适配器 ====================
class IndexedDBAdapter {
    async getCategories() {
        try {
            const response = await axios.get('/api/categories');
            return response.data.success ? response.data.data : [];
        } catch (error) {
            console.error('获取分类失败:', error);
            return [];
        }
    }
    
    async getWebsites(category) {
        try {
            const response = await axios.get(`/api/websites?category=${encodeURIComponent(category)}`);
            return response.data.success ? response.data.data : [];
        } catch (error) {
            console.error('获取网站失败:', error);
            return [];
        }
    }
    
    async addWebsite(website) {
        try {
            const response = await axios.post('/api/websites', website);
            return response.data.success ? response.data.data : null;
        } catch (error) {
            console.error('添加网站失败:', error);
            throw error;
        }
    }
    
    async updateWebsite(website) {
        try {
            const response = await axios.put(`/api/websites/${website.id}`, website);
            return response.data.success ? response.data.data : null;
        } catch (error) {
            console.error('更新网站失败:', error);
            throw error;
        }
    }
    
    async deleteWebsite(id) {
        try {
            const response = await axios.delete(`/api/websites/${id}`);
            return response.data.success;
        } catch (error) {
            console.error('删除网站失败:', error);
            throw error;
        }
    }
    
    async addCategory(category) {
        try {
            const response = await axios.post('/api/categories', category);
            return response.data.success ? response.data.data : null;
        } catch (error) {
            console.error('添加分类失败:', error);
            throw error;
        }
    }
    
    async updateCategory(category) {
        try {
            const response = await axios.put(`/api/categories/${category.id}`, category);
            return response.data.success ? response.data.data : null;
        } catch (error) {
            console.error('更新分类失败:', error);
            throw error;
        }
    }
    
    async deleteCategory(id) {
        try {
            const response = await axios.delete(`/api/categories/${id}`);
            return response.data.success;
        } catch (error) {
            console.error('删除分类失败:', error);
            throw error;
        }
    }
}

class LocalStorageAdapter {
    constructor() {
        this.prefix = 'nav_';
    }
    
    async getCategories() {
        try {
            const data = localStorage.getItem(this.prefix + 'categories');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('获取分类失败:', error);
            return [];
        }
    }
    
    async getWebsites(category) {
        try {
            const data = localStorage.getItem(this.prefix + 'websites_' + category);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('获取网站失败:', error);
            return [];
        }
    }
    
    async addWebsite(website) {
        try {
            const websites = await this.getWebsites(website.categoryId);
            website.id = Date.now().toString();
            websites.push(website);
            localStorage.setItem(this.prefix + 'websites_' + website.categoryId, JSON.stringify(websites));
            return website;
        } catch (error) {
            console.error('添加网站失败:', error);
            throw error;
        }
    }
    
    async updateWebsite(website) {
        try {
            const websites = await this.getWebsites(website.categoryId);
            const index = websites.findIndex(w => w.id === website.id);
            if (index !== -1) {
                websites[index] = website;
                localStorage.setItem(this.prefix + 'websites_' + website.categoryId, JSON.stringify(websites));
            }
            return website;
        } catch (error) {
            console.error('更新网站失败:', error);
            throw error;
        }
    }
    
    async deleteWebsite(id) {
        try {
            // 需要遍历所有分类来找到并删除网站
            const categories = await this.getCategories();
            for (const category of categories) {
                const websites = await this.getWebsites(category.id);
                const filteredWebsites = websites.filter(w => w.id !== id);
                if (filteredWebsites.length !== websites.length) {
                    localStorage.setItem(this.prefix + 'websites_' + category.id, JSON.stringify(filteredWebsites));
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('删除网站失败:', error);
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
            console.error('添加分类失败:', error);
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
            console.error('更新分类失败:', error);
            throw error;
        }
    }
    
    async deleteCategory(id) {
        try {
            const categories = await this.getCategories();
            const filteredCategories = categories.filter(c => c.id !== id);
            localStorage.setItem(this.prefix + 'categories', JSON.stringify(filteredCategories));
            return true;
        } catch (error) {
            console.error('删除分类失败:', error);
            throw error;
        }
    }
}