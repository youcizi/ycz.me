/**
 * DataManager - 数据管理类
 * 负责数据的导入导出、备份恢复、数据统计等功能
 */
class DataManager {
    constructor() {
        this.version = '1.0.0';
        this.supportedFormats = ['json', 'csv', 'html'];
        this.maxBackupCount = 10; // 最大备份数量
        this.compressionEnabled = true;
        
        this.db = null;
        this.cryptoUtils = null;
    }

    /**
     * 设置NavigationDB实例
     * @param {NavigationDB} navigationDB NavigationDB实例
     */
    setNavigationDB(navigationDB) {
        this.db = navigationDB;
    }

    /**
     * 设置CryptoUtils实例
     * @param {CryptoUtils} cryptoUtils CryptoUtils实例
     */
    setCryptoUtils(cryptoUtils) {
        this.cryptoUtils = cryptoUtils;
    }

    /**
     * 初始化数据管理器
     * @param {NavigationDB} navigationDB NavigationDB实例
     * @param {CryptoUtils} cryptoUtils CryptoUtils实例
     */
    async init(navigationDB, cryptoUtils = null) {
        this.db = navigationDB;
        this.cryptoUtils = cryptoUtils;
        
        // 确保数据库已初始化
        if (!this.db.isInitialized) {
            await this.db.init();
        }
        
        console.log('[DataManager] 数据管理器初始化完成');
    }

    // ==================== 数据导出功能 ====================

    /**
     * 导出所有数据
     * @param {Object} options 导出选项
     * @returns {Promise<Object>} 导出结果
     */
    async exportAllData(options = {}) {
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
            console.log('[DataManager] 开始导出数据', { format, encrypt });

            // 收集所有数据
            const exportData = await this.collectExportData({
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
                    processedData = this.formatAsJSON(exportData, encrypt, password);
                    mimeType = 'application/json';
                    fileExtension = 'json';
                    break;
                case 'csv':
                    processedData = this.formatAsCSV(exportData);
                    mimeType = 'text/csv';
                    fileExtension = 'csv';
                    break;
                case 'html':
                    processedData = this.formatAsHTML(exportData);
                    mimeType = 'text/html';
                    fileExtension = 'html';
                    break;
                default:
                    throw new Error(`不支持的导出格式: ${format}`);
            }

            // 生成文件名
            const finalFilename = filename || this.generateExportFilename(fileExtension, encrypt);

            // 创建下载
            const result = {
                success: true,
                filename: finalFilename,
                size: new Blob([processedData]).size,
                format,
                encrypted: encrypt,
                timestamp: Date.now(),
                dataStats: this.getDataStats(exportData)
            };

            // 触发下载
            this.downloadFile(processedData, finalFilename, mimeType);

            console.log('[DataManager] 数据导出完成', result);
            return result;
        } catch (error) {
            console.error('[DataManager] 数据导出失败', error);
            throw error;
        }
    }

    /**
     * 收集导出数据
     * @param {Object} options 收集选项
     * @returns {Promise<Object>} 导出数据
     */
    async collectExportData(options = {}) {
        const {
            includeSettings = true,
            includeCache = false,
            includeBackups = false
        } = options;

        const exportData = {
            metadata: {
                version: this.version,
                exportTime: Date.now(),
                exportTimeISO: new Date().toISOString(),
                source: 'NavigationApp',
                format: 'NavigationDB Export'
            },
            websites: await this.db.getWebsites(),
            categories: await this.db.getCategories()
        };

        if (includeSettings) {
            exportData.settings = await this.db.getSettings();
        }

        if (includeCache) {
            exportData.cache = await this.getAllCacheData();
        }

        if (includeBackups) {
            exportData.backups = await this.getAllBackupData();
        }

        return exportData;
    }

    /**
     * 格式化为JSON
     * @param {Object} data 数据
     * @param {boolean} encrypt 是否加密
     * @param {string} password 密码
     * @returns {string} JSON字符串
     */
    formatAsJSON(data, encrypt = false, password = null) {
        let jsonString = JSON.stringify(data, null, 2);

        if (encrypt && password && this.cryptoUtils) {
            try {
                const encryptedData = this.cryptoUtils.encryptJSON(data, password);
                jsonString = JSON.stringify({
                    encrypted: true,
                    version: this.version,
                    data: encryptedData
                }, null, 2);
            } catch (error) {
                console.error('[DataManager] 数据加密失败', error);
                throw new Error('数据加密失败: ' + error.message);
            }
        }

        return jsonString;
    }

    /**
     * 格式化为CSV
     * @param {Object} data 数据
     * @returns {string} CSV字符串
     */
    formatAsCSV(data) {
        const csvParts = [];

        // 导出网站数据
        if (data.websites && data.websites.length > 0) {
            csvParts.push('# 网站数据');
            csvParts.push('名称,描述,URL,图标,分类ID,价格类型,访问次数,最后访问,创建时间');
            
            data.websites.forEach(website => {
                const row = [
                    this.escapeCsvValue(website.name),
                    this.escapeCsvValue(website.description || ''),
                    this.escapeCsvValue(website.url),
                    this.escapeCsvValue(website.icon || ''),
                    this.escapeCsvValue(website.categoryId || ''),
                    this.escapeCsvValue(website.priceType || ''),
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
                    this.escapeCsvValue(category.id),
                    this.escapeCsvValue(category.name),
                    this.escapeCsvValue(category.icon || ''),
                    this.escapeCsvValue(category.color || ''),
                    category.order || 0,
                    category.websiteCount || 0,
                    new Date(category.createdAt).toISOString()
                ];
                csvParts.push(row.join(','));
            });
        }

        return csvParts.join('\n');
    }

    /**
     * 格式化为HTML
     * @param {Object} data 数据
     * @returns {string} HTML字符串
     */
    formatAsHTML(data) {
        const html = `
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
                    ${cat.icon || '📁'} ${this.escapeHtml(cat.name)}
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
                    <h3>${site.icon || '🌐'} ${this.escapeHtml(site.name)}</h3>
                    ${site.description ? `<p>${this.escapeHtml(site.description)}</p>` : ''}
                    <p class="url"><a href="${site.url}" target="_blank">${this.escapeHtml(site.url)}</a></p>
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

        return html;
    }

    // ==================== 数据导入功能 ====================

    /**
     * 导入数据
     * @param {File|string} fileOrData 文件对象或数据字符串
     * @param {Object} options 导入选项
     * @returns {Promise<Object>} 导入结果
     */
    async importData(fileOrData, options = {}) {
        const {
            mergeMode = 'skip', // skip, overwrite, merge
            validateData = true,
            createBackup = true,
            password = null
        } = options;

        try {
            console.log('[DataManager] 开始导入数据');

            // 创建备份
            let backupId = null;
            if (createBackup) {
                backupId = await this.createAutoBackup('导入前备份');
            }

            // 读取数据
            let importData;
            if (typeof fileOrData === 'string') {
                importData = fileOrData;
            } else {
                importData = await this.readFile(fileOrData);
            }

            // 解析数据
            const parsedData = await this.parseImportData(importData, password);

            // 验证数据
            if (validateData) {
                const validation = this.validateImportData(parsedData);
                if (!validation.valid) {
                    throw new Error('数据验证失败: ' + validation.errors.join(', '));
                }
            }

            // 执行导入
            const importResult = await this.performImport(parsedData, mergeMode);

            const result = {
                success: true,
                backupId,
                imported: importResult,
                timestamp: Date.now()
            };

            console.log('[DataManager] 数据导入完成', result);
            return result;
        } catch (error) {
            console.error('[DataManager] 数据导入失败', error);
            throw error;
        }
    }

    /**
     * 解析导入数据
     * @param {string} data 数据字符串
     * @param {string} password 解密密码
     * @returns {Promise<Object>} 解析后的数据
     */
    async parseImportData(data, password = null) {
        try {
            const jsonData = JSON.parse(data);

            // 检查是否为加密数据
            if (jsonData.encrypted && jsonData.data) {
                if (!password) {
                    throw new Error('数据已加密，需要提供密码');
                }
                
                if (!this.cryptoUtils) {
                    throw new Error('加密工具未初始化');
                }

                // 解密数据
                const decryptedData = this.cryptoUtils.decryptJSON(jsonData.data, password);
                return decryptedData;
            }

            return jsonData;
        } catch (error) {
            if (error.name === 'SyntaxError') {
                throw new Error('数据格式错误，请确保是有效的JSON文件');
            }
            throw error;
        }
    }

    /**
     * 验证导入数据
     * @param {Object} data 数据对象
     * @returns {Object} 验证结果
     */
    validateImportData(data) {
        const errors = [];
        const warnings = [];

        // 检查基本结构
        if (!data || typeof data !== 'object') {
            errors.push('数据格式无效');
            return { valid: false, errors, warnings };
        }

        // 检查元数据
        if (!data.metadata) {
            warnings.push('缺少元数据信息');
        }

        // 验证网站数据
        if (data.websites) {
            if (!Array.isArray(data.websites)) {
                errors.push('网站数据格式错误');
            } else {
                data.websites.forEach((website, index) => {
                    if (!website.name || !website.url) {
                        errors.push(`网站 ${index + 1} 缺少必要字段（名称或URL）`);
                    }
                    if (website.url && !this.isValidURL(website.url)) {
                        warnings.push(`网站 ${index + 1} 的URL格式可能无效: ${website.url}`);
                    }
                });
            }
        }

        // 验证分类数据
        if (data.categories) {
            if (!Array.isArray(data.categories)) {
                errors.push('分类数据格式错误');
            } else {
                data.categories.forEach((category, index) => {
                    if (!category.name) {
                        errors.push(`分类 ${index + 1} 缺少名称`);
                    }
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 执行导入
     * @param {Object} data 数据对象
     * @param {string} mergeMode 合并模式
     * @returns {Promise<Object>} 导入结果
     */
    async performImport(data, mergeMode) {
        const result = {
            categories: { added: 0, updated: 0, skipped: 0 },
            websites: { added: 0, updated: 0, skipped: 0 },
            settings: { updated: false }
        };

        // 导入分类
        if (data.categories && Array.isArray(data.categories)) {
            for (const category of data.categories) {
                const importResult = await this.importCategory(category, mergeMode);
                result.categories[importResult.action]++;
            }
        }

        // 导入网站
        if (data.websites && Array.isArray(data.websites)) {
            for (const website of data.websites) {
                const importResult = await this.importWebsite(website, mergeMode);
                result.websites[importResult.action]++;
            }
        }

        // 导入设置
        if (data.settings && mergeMode !== 'skip') {
            await this.importSettings(data.settings);
            result.settings.updated = true;
        }

        return result;
    }

    /**
     * 导入单个分类
     * @param {Object} category 分类数据
     * @param {string} mergeMode 合并模式
     * @returns {Promise<Object>} 导入结果
     */
    async importCategory(category, mergeMode) {
        try {
            const existingCategories = await this.db.getCategories();
            const existing = existingCategories.find(c => c.id === category.id || c.name === category.name);

            if (existing) {
                if (mergeMode === 'skip') {
                    return { action: 'skipped', category: existing };
                } else if (mergeMode === 'overwrite' || mergeMode === 'merge') {
                    const updatedCategory = mergeMode === 'merge' 
                        ? { ...existing, ...category, updatedAt: Date.now() }
                        : { ...category, id: existing.id, updatedAt: Date.now() };
                    
                    await this.db.updateCategory(existing.id, updatedCategory);
                    return { action: 'updated', category: updatedCategory };
                }
            } else {
                // 确保有唯一ID
                if (!category.id) {
                    category.id = this.generateId();
                }
                category.createdAt = category.createdAt || Date.now();
                category.updatedAt = Date.now();
                
                await this.db.addCategory(category);
                return { action: 'added', category };
            }
        } catch (error) {
            console.error('[DataManager] 导入分类失败', error);
            throw error;
        }
    }

    /**
     * 导入单个网站
     * @param {Object} website 网站数据
     * @param {string} mergeMode 合并模式
     * @returns {Promise<Object>} 导入结果
     */
    async importWebsite(website, mergeMode) {
        try {
            const existingWebsites = await this.db.getWebsites();
            const existing = existingWebsites.find(w => 
                w.id === website.id || 
                (w.name === website.name && w.url === website.url)
            );

            if (existing) {
                if (mergeMode === 'skip') {
                    return { action: 'skipped', website: existing };
                } else if (mergeMode === 'overwrite' || mergeMode === 'merge') {
                    const updatedWebsite = mergeMode === 'merge'
                        ? { ...existing, ...website, updatedAt: Date.now() }
                        : { ...website, id: existing.id, updatedAt: Date.now() };
                    
                    await this.db.updateWebsite(existing.id, updatedWebsite);
                    return { action: 'updated', website: updatedWebsite };
                }
            } else {
                // 确保有唯一ID
                if (!website.id) {
                    website.id = this.generateId();
                }
                website.createdAt = website.createdAt || Date.now();
                website.updatedAt = Date.now();
                
                await this.db.addWebsite(website);
                return { action: 'added', website };
            }
        } catch (error) {
            console.error('[DataManager] 导入网站失败', error);
            throw error;
        }
    }

    /**
     * 导入设置
     * @param {Object} settings 设置数据
     */
    async importSettings(settings) {
        try {
            const currentSettings = await this.db.getSettings() || { id: 'main' };
            const updatedSettings = { ...currentSettings, ...settings, updatedAt: Date.now() };
            await this.db._updateSettings(updatedSettings);
        } catch (error) {
            console.error('[DataManager] 导入设置失败', error);
            throw error;
        }
    }

    // ==================== 备份管理功能 ====================

    /**
     * 创建手动备份
     * @param {string} description 备份描述
     * @param {Object} options 备份选项
     * @returns {Promise<string>} 备份ID
     */
    async createManualBackup(description = '手动备份', options = {}) {
        return await this.createBackup(description, false, options);
    }

    /**
     * 创建自动备份
     * @param {string} description 备份描述
     * @param {Object} options 备份选项
     * @returns {Promise<string>} 备份ID
     */
    async createAutoBackup(description = '自动备份', options = {}) {
        return await this.createBackup(description, true, options);
    }

    /**
     * 创建备份
     * @param {string} description 备份描述
     * @param {boolean} autoBackup 是否为自动备份
     * @param {Object} options 备份选项
     * @returns {Promise<string>} 备份ID
     */
    async createBackup(description, autoBackup = false, options = {}) {
        try {
            console.log('[DataManager] 创建备份', { description, autoBackup });

            // 收集备份数据
            const backupData = await this.collectExportData({
                includeSettings: true,
                includeCache: false,
                includeBackups: false
            });

            // 压缩数据（如果启用）
            let processedData = backupData;
            if (this.compressionEnabled && options.compress !== false) {
                processedData = this.compressData(backupData);
            }

            // 创建备份记录
            const backup = {
                id: this.generateId(),
                description,
                autoBackup,
                data: processedData,
                compressed: this.compressionEnabled && options.compress !== false,
                size: this.estimateDataSize(processedData),
                createdAt: Date.now(),
                version: this.version
            };

            // 保存备份
            const transaction = this.db.db.transaction([this.db.stores.BACKUPS], 'readwrite');
            const store = transaction.objectStore(this.db.stores.BACKUPS);
            await this.db._promisifyRequest(store.add(backup));

            // 清理旧备份
            await this.cleanupOldBackups();

            console.log('[DataManager] 备份创建完成', { id: backup.id, size: backup.size });
            return backup.id;
        } catch (error) {
            console.error('[DataManager] 创建备份失败', error);
            throw error;
        }
    }

    /**
     * 获取备份列表
     * @returns {Promise<Array>} 备份列表
     */
    async getBackupList() {
        try {
            const transaction = this.db.db.transaction([this.db.stores.BACKUPS], 'readonly');
            const store = transaction.objectStore(this.db.stores.BACKUPS);
            const backups = await this.db._promisifyRequest(store.getAll());

            // 按创建时间倒序排列
            return backups
                .map(backup => ({
                    id: backup.id,
                    description: backup.description,
                    autoBackup: backup.autoBackup,
                    size: backup.size,
                    compressed: backup.compressed,
                    createdAt: backup.createdAt,
                    version: backup.version
                }))
                .sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error('[DataManager] 获取备份列表失败', error);
            throw error;
        }
    }

    /**
     * 恢复备份
     * @param {string} backupId 备份ID
     * @param {Object} options 恢复选项
     * @returns {Promise<Object>} 恢复结果
     */
    async restoreBackup(backupId, options = {}) {
        const {
            createBackupBeforeRestore = true,
            clearExistingData = false
        } = options;

        try {
            console.log('[DataManager] 开始恢复备份', { backupId });

            // 创建恢复前备份
            let preRestoreBackupId = null;
            if (createBackupBeforeRestore) {
                preRestoreBackupId = await this.createAutoBackup('恢复前备份');
            }

            // 获取备份数据
            const transaction = this.db.db.transaction([this.db.stores.BACKUPS], 'readonly');
            const store = transaction.objectStore(this.db.stores.BACKUPS);
            const backup = await this.db._promisifyRequest(store.get(backupId));

            if (!backup) {
                throw new Error('备份不存在');
            }

            // 解压数据（如果需要）
            let backupData = backup.data;
            if (backup.compressed) {
                backupData = this.decompressData(backup.data);
            }

            // 清空现有数据（如果需要）
            if (clearExistingData) {
                await this.clearAllData();
            }

            // 执行恢复
            const restoreResult = await this.performImport(backupData, 'overwrite');

            const result = {
                success: true,
                backupId,
                preRestoreBackupId,
                restored: restoreResult,
                timestamp: Date.now()
            };

            console.log('[DataManager] 备份恢复完成', result);
            return result;
        } catch (error) {
            console.error('[DataManager] 备份恢复失败', error);
            throw error;
        }
    }

    /**
     * 删除备份
     * @param {string} backupId 备份ID
     * @returns {Promise<boolean>} 删除结果
     */
    async deleteBackup(backupId) {
        try {
            const transaction = this.db.db.transaction([this.db.stores.BACKUPS], 'readwrite');
            const store = transaction.objectStore(this.db.stores.BACKUPS);
            await this.db._promisifyRequest(store.delete(backupId));
            
            console.log('[DataManager] 备份删除完成', { backupId });
            return true;
        } catch (error) {
            console.error('[DataManager] 删除备份失败', error);
            throw error;
        }
    }

    /**
     * 清理旧备份
     */
    async cleanupOldBackups() {
        try {
            const backups = await this.getBackupList();
            
            // 分别处理自动备份和手动备份
            const autoBackups = backups.filter(b => b.autoBackup).sort((a, b) => b.createdAt - a.createdAt);
            const manualBackups = backups.filter(b => !b.autoBackup).sort((a, b) => b.createdAt - a.createdAt);

            // 保留最新的备份，删除超出限制的旧备份
            const maxAutoBackups = Math.floor(this.maxBackupCount * 0.7); // 70%给自动备份
            const maxManualBackups = this.maxBackupCount - maxAutoBackups;

            const toDelete = [
                ...autoBackups.slice(maxAutoBackups),
                ...manualBackups.slice(maxManualBackups)
            ];

            for (const backup of toDelete) {
                await this.deleteBackup(backup.id);
            }

            if (toDelete.length > 0) {
                console.log('[DataManager] 清理旧备份完成', { deleted: toDelete.length });
            }
        } catch (error) {
            console.error('[DataManager] 清理旧备份失败', error);
        }
    }

    // ==================== 工具方法 ====================

    /**
     * 读取文件
     * @param {File} file 文件对象
     * @returns {Promise<string>} 文件内容
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    /**
     * 下载文件
     * @param {string} content 文件内容
     * @param {string} filename 文件名
     * @param {string} mimeType MIME类型
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * 生成导出文件名
     * @param {string} extension 文件扩展名
     * @param {boolean} encrypted 是否加密
     * @returns {string} 文件名
     */
    generateExportFilename(extension, encrypted = false) {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
        const encryptedSuffix = encrypted ? '_encrypted' : '';
        
        return `navigation_export_${dateStr}_${timeStr}${encryptedSuffix}.${extension}`;
    }

    /**
     * 获取数据统计
     * @param {Object} data 数据对象
     * @returns {Object} 统计信息
     */
    getDataStats(data) {
        return {
            websites: data.websites ? data.websites.length : 0,
            categories: data.categories ? data.categories.length : 0,
            hasSettings: !!data.settings,
            hasCache: !!data.cache,
            hasBackups: !!data.backups
        };
    }

    /**
     * 转义CSV值
     * @param {string} value 值
     * @returns {string} 转义后的值
     */
    escapeCsvValue(value) {
        if (typeof value !== 'string') {
            return value;
        }
        
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return '"' + value.replace(/"/g, '""') + '"';
        }
        
        return value;
    }

    /**
     * 转义HTML
     * @param {string} text 文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 验证URL
     * @param {string} url URL字符串
     * @returns {boolean} 是否有效
     */
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 压缩数据
     * @param {Object} data 数据
     * @returns {Object} 压缩后的数据
     */
    compressData(data) {
        // 简单的数据压缩：移除不必要的字段
        const compressed = JSON.parse(JSON.stringify(data));
        
        // 移除一些可选字段以减少大小
        if (compressed.websites) {
            compressed.websites.forEach(website => {
                if (website.visitCount === 0) delete website.visitCount;
                if (!website.lastVisited) delete website.lastVisited;
                if (!website.description) delete website.description;
            });
        }
        
        return compressed;
    }

    /**
     * 解压数据
     * @param {Object} data 压缩的数据
     * @returns {Object} 解压后的数据
     */
    decompressData(data) {
        // 恢复默认值
        const decompressed = JSON.parse(JSON.stringify(data));
        
        if (decompressed.websites) {
            decompressed.websites.forEach(website => {
                if (website.visitCount === undefined) website.visitCount = 0;
                if (website.description === undefined) website.description = '';
            });
        }
        
        return decompressed;
    }

    /**
     * 估算数据大小
     * @param {Object} data 数据
     * @returns {number} 大小（字节）
     */
    estimateDataSize(data) {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch {
            return 0;
        }
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 获取所有缓存数据
     * @returns {Promise<Array>} 缓存数据
     */
    async getAllCacheData() {
        try {
            const transaction = this.db.db.transaction([this.db.stores.CACHE], 'readonly');
            const store = transaction.objectStore(this.db.stores.CACHE);
            return await this.db._promisifyRequest(store.getAll());
        } catch (error) {
            console.error('[DataManager] 获取缓存数据失败', error);
            return [];
        }
    }

    /**
     * 获取所有备份数据
     * @returns {Promise<Array>} 备份数据
     */
    async getAllBackupData() {
        try {
            return await this.getBackupList();
        } catch (error) {
            console.error('[DataManager] 获取备份数据失败', error);
            return [];
        }
    }

    /**
     * 清空所有数据
     */
    async clearAllData() {
        try {
            // 清空网站数据
            const websites = await this.db.getWebsites();
            for (const website of websites) {
                await this.db.deleteWebsite(website.id);
            }

            // 清空分类数据
            const categories = await this.db.getCategories();
            for (const category of categories) {
                await this.db.deleteCategory(category.id);
            }

            // 清空设置（保留基本设置）
            await this.db._updateSettings({ id: 'main', createdAt: Date.now(), updatedAt: Date.now() });

            console.log('[DataManager] 所有数据清空完成');
        } catch (error) {
            console.error('[DataManager] 清空数据失败', error);
            throw error;
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
} else {
    window.DataManager = DataManager;
}