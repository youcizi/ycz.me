// 数据管理页面 Vue 应用
const { createApp } = Vue;

// IndexedDB 服务将在页面加载后动态导入

const DataManagerApp = {
    data() {
        return {
            // 文件处理相关
            selectedFile: null,
            isDragOver: false,
            isImporting: false,
            isExporting: false,
            
            // 数据预览
            previewData: null,
            
            // 状态消息
            statusMessage: null,
            
            // 统计信息
            websiteCount: 0,
            categoryCount: 0,
            filterCount: 0,
            engineCount: 0,
            
            // IndexedDB 服务实例
            dbService: null,
            // DataSync 服务实例
            dataSync: null,
            
            // 导入警告状态
            importWarningShown: false,
            // 恢复默认警告状态
            restoreWarningShown: false,
            // 后台接口管理
            apiUrlInput: '',
            effectiveApiLabel: '使用站点默认接口',

            // 同步到后台
            syncApiUrlInput: '',
            effectiveSyncLabel: '未设置',
            syncSelectedExcel: null,
            isSyncing: false
        };
    },
    
    async mounted() {
        try {
            // 动态导入 IndexedDB 服务（导入的是实例，不是类）
            const { default: indexedDBService } = await import('./services/IndexedDBService.js');
            
            // 使用导入的服务实例
            this.dbService = indexedDBService;
            await this.dbService.init();

            // 动态导入 DataSync 服务
            const { default: dataSyncService } = await import('./services/DataSyncService.js');
            this.dataSync = dataSyncService;
            // 读取自定义默认API地址
            const { default: configService } = await import('./services/ConfigService.js');
            const saved = configService.getCustomDefaultApiUrl();
            this.apiUrlInput = saved || '';
            this.updateEffectiveApiLabel();

            // 初始化同步接口
            const syncSaved = configService.getSyncApiUrl();
            this.syncApiUrlInput = syncSaved || '';
            this.updateEffectiveSyncLabel();
            
            // 加载统计信息
            await this.loadStats();
        } catch (error) {
            console.error('初始化失败:', error);
            this.showStatus('初始化失败: ' + error.message, 'error');
        }
    },
    
    methods: {
        // 加载统计信息
        async loadStats() {
            try {
                const websites = await this.dbService.getWebsites();
                const categories = await this.dbService.getCategories();
                const filters = await this.dbService.getFilters();
                const searchEngines = await this.dbService.getSearchEngines();
                
                this.websiteCount = websites.length;
                this.categoryCount = categories.length;
                this.filterCount = Array.isArray(filters) ? filters.length : 0;
                this.engineCount = Array.isArray(searchEngines) ? searchEngines.length : 0;
            } catch (error) {
                console.error('加载统计信息失败:', error);
            }
        },

        // 拖拽处理
        handleFileDrop(event) {
            event.preventDefault();
            this.isDragOver = false;
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        },

        // ================= 后台接口管理 =================
        updateEffectiveApiLabel() {
            const url = (this.apiUrlInput || '').trim();
            this.effectiveApiLabel = url ? `自定义接口：${url}` : '使用站点默认接口';
        },
        async saveApiUrl() {
            try {
                const { default: configService } = await import('./services/ConfigService.js');
                const v = configService.setCustomDefaultApiUrl(this.apiUrlInput || '');
                this.apiUrlInput = v;
                this.updateEffectiveApiLabel();
                this.showStatus('接口地址已保存', 'success');
            } catch (e) {
                console.error('保存接口地址失败', e);
                this.showStatus('保存接口地址失败: ' + (e.message || e), 'error');
            }
        },
        async clearApiUrl() {
            try {
                const { default: configService } = await import('./services/ConfigService.js');
                configService.clearCustomDefaultApiUrl();
                this.apiUrlInput = '';
                this.updateEffectiveApiLabel();
                this.showStatus('已清除自定义接口', 'success');
            } catch (e) {
                console.error('清除接口地址失败', e);
                this.showStatus('清除接口地址失败: ' + (e.message || e), 'error');
            }
        },
        
        // ================= 同步到后台 =================
        updateEffectiveSyncLabel() {
            const url = (this.syncApiUrlInput || '').trim();
            this.effectiveSyncLabel = url ? url : '未设置';
        },
        async saveSyncApiUrl() {
            try {
                const { default: configService } = await import('./services/ConfigService.js');
                const v = configService.setSyncApiUrl(this.syncApiUrlInput || '');
                this.syncApiUrlInput = v;
                this.updateEffectiveSyncLabel();
                this.showStatus('同步接口地址已保存', 'success');
            } catch (e) {
                console.error('保存同步接口失败', e);
                this.showStatus('保存同步接口失败: ' + (e.message || e), 'error');
            }
        },
        async clearSyncApiUrl() {
            try {
                const { default: configService } = await import('./services/ConfigService.js');
                configService.clearSyncApiUrl();
                this.syncApiUrlInput = '';
                this.updateEffectiveSyncLabel();
                this.showStatus('已清除同步接口地址', 'success');
            } catch (e) {
                console.error('清除同步接口失败', e);
                this.showStatus('清除同步接口失败: ' + (e.message || e), 'error');
            }
        },
        async collectAllDataForSync() {
            const [categories, websites, filters, searchEngines] = await Promise.all([
                this.dbService.getCategories(),
                this.dbService.getWebsites(),
                this.dbService.getFilters(),
                this.dbService.getSearchEngines()
            ]);
            return {
                categories,
                websites,
                filters,
                searchEngines,
                timestamp: Date.now()
            };
        },
        async syncToBackendJson() {
            const url = (this.syncApiUrlInput || '').trim();
            if (!url) {
                this.showStatus('请先设置同步API地址', 'error');
                return;
            }
            try {
                this.isSyncing = true;
                const payload = await this.collectAllDataForSync();
                const res = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
                this.showStatus(`同步完成：HTTP ${res.status}`, 'success');
            } catch (e) {
                console.error('同步失败', e);
                this.showStatus('同步失败: ' + (e?.response?.data?.message || e.message || '未知错误'), 'error');
            } finally {
                this.isSyncing = false;
            }
        },
        syncHandleExcelSelect(event) {
            const file = event.target.files && event.target.files[0];
            if (file) {
                this.syncSelectedExcel = file;
                this.showStatus('已选择文件：' + file.name, 'info');
            }
        },
        async syncUploadExcelToBackend() {
            const url = (this.syncApiUrlInput || '').trim();
            if (!url) {
                this.showStatus('请先设置同步API地址', 'error');
                return;
            }
            if (!this.syncSelectedExcel) {
                this.showStatus('请先选择Excel文件', 'error');
                return;
            }
            try {
                this.isSyncing = true;
                const formData = new FormData();
                formData.append('file', this.syncSelectedExcel);
                const res = await axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                this.showStatus(`上传完成：HTTP ${res.status}`, 'success');
            } catch (e) {
                console.error('上传失败', e);
                this.showStatus('上传失败: ' + (e?.response?.data?.message || e.message || '未知错误'), 'error');
            } finally {
                this.isSyncing = false;
            }
        },
        async testFetchDefaultApi() {
            try {
                const { fetchDefaultData } = await import('./services/DefaultDataProvider.js');
                const data = await fetchDefaultData();
                const cats = Array.isArray(data.categories) ? data.categories.length : 0;
                const sites = Array.isArray(data.websites) ? data.websites.length : 0;
                const filters = Array.isArray(data.filters) ? data.filters.length : 0;
                const engines = Array.isArray(data.searchEngines) ? data.searchEngines.length : 0;
                this.showStatus(`测试成功：分类${cats}、网站${sites}、筛选${filters}、搜索引擎${engines}`, 'success');
            } catch (e) {
                console.error('测试默认接口失败', e);
                this.showStatus('测试失败: ' + (e.message || e), 'error');
            }
        },
        
        // 文件选择处理
        handleFileSelect(event) {
            const file = event.target.files[0];
            if (file) {
                this.handleFileSelection(file);
            }
        },
        
        handleFileSelection(file) {
            // 验证文件类型
            const allowedTypes = ['.json', '.xlsx', '.xls'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!allowedTypes.includes(fileExtension)) {
                this.showStatus('不支持的文件格式，请选择 JSON 或 Excel 文件', 'error');
                return;
            }
            
            this.selectedFile = file;
            this.showStatus(`已选择文件: ${file.name}`, 'info');
        },
        
        // 清除文件
        clearFile() {
            this.selectedFile = null;
            this.previewData = null;
            if (this.$refs.fileInput) {
                this.$refs.fileInput.value = '';
            }
            this.showStatus('已清除选择的文件', 'info');
        },
        
        // 格式化文件大小
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // 恢复默认数据（弹窗确认）
        async restoreDefault() {
            // 直接弹出复用的警告弹窗
            this.showRestoreWarning();
        },
        
        // 导入数据
        async importData() {
            if (!this.selectedFile) {
                this.showStatus('请先选择文件', 'error');
                return;
            }
            
            // 检查是否已经显示过警告
            if (!this.importWarningShown) {
                // 第一次点击，显示警告
                this.showImportWarning();
                this.importWarningShown = true;
                return;
            }
            
            // 第二次确认，执行导入
            this.isImporting = true;
            
            try {
                // 根据文件类型选择读取方法
                const fileExtension = '.' + this.selectedFile.name.split('.').pop().toLowerCase();
                let data;
                
                if (fileExtension === '.json') {
                    data = await this.readJSONFile(this.selectedFile);
                } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
                    data = await this.readExcelFile(this.selectedFile);
                } else {
                    throw new Error('不支持的文件格式');
                }
                
                // 验证数据格式
                const validationResult = this.validateImportData(data);
                if (!validationResult.valid) {
                    this.showStatus('数据格式验证失败: ' + validationResult.message, 'error');
                    this.importWarningShown = false; // 重置警告状态
                    return;
                }
                
                this.showStatus('正在清空现有数据...', 'info');
                
                // 清空现有数据
                await this.dbService.clearAllData();
                
                this.showStatus('正在导入新数据...', 'info');
                
                // 直接导入数据
                let importedWebsites = 0;
                let importedCategories = 0;
                let importedFilters = 0;
                let importedEngines = 0;
                let skippedDuplicateFilters = 0;
                let skippedDuplicateEngines = 0;
                
                // 导入分类数据
                if (data.categories && data.categories.length > 0) {
                    for (const category of data.categories) {
                        await this.dbService.addCategory(category);
                        importedCategories++;
                    }
                }
                
                // 导入网站数据
                if (data.websites && data.websites.length > 0) {
                    for (const website of data.websites) {
                        // 标准化网站数据格式
                        const websiteData = {
                            ...website,
                            name: website.name || website.title, // 兼容title字段
                            id: website.id || this.generateId()
                        };
                        
                        try {
                            await this.dbService.addWebsite(websiteData);
                            importedWebsites++;
                        } catch (error) {
                            console.warn(`导入网站失败: ${websiteData.name}`, error);
                            // 继续导入其他网站
                        }
                    }
                }

                // 导入筛选标签（按 key 去重）
                if (data.filters && data.filters.length > 0) {
                    const seenKeys = new Set();
                    for (const tag of data.filters) {
                        const keyLower = (tag.key || '').trim().toLowerCase();
                        if (!keyLower) continue;
                        if (seenKeys.has(keyLower)) { skippedDuplicateFilters++; continue; }
                        seenKeys.add(keyLower);

                        const tagData = {
                            id: tag.id || this.generateId(),
                            name: tag.name,
                            key: tag.key,
                            backgroundColor: tag.backgroundColor || '#3b82f6',
                            order: tag.order || 0
                        };
                        try {
                            await this.dbService.addFilter(tagData);
                            importedFilters++;
                        } catch (error) {
                            // 如果因重复 key 失败，尝试更新现有标签
                            if (String(error.message || '').includes('key 已存在')) {
                                try {
                                    const existingFilters = await this.dbService.getFilters();
                                    const exist = existingFilters.find(f => (f.key || '').toLowerCase() === keyLower);
                                    if (exist) {
                                        await this.dbService.updateFilter({ ...exist, ...tagData, id: exist.id });
                                        importedFilters++;
                                    }
                                } catch (e2) {
                                    console.warn(`更新筛选标签失败: ${tagData.name}`, e2);
                                }
                            } else {
                                console.warn(`导入筛选标签失败: ${tagData.name}`, error);
                            }
                        }
                    }
                }

                // 导入搜索引擎（按名称去重）
                if (data.searchEngines && data.searchEngines.length > 0) {
                    const seenNames = new Set();
                    for (const engine of data.searchEngines) {
                        const nameLower = (engine.name || '').trim().toLowerCase();
                        const template = (engine.template || '').trim();
                        if (!nameLower || !template) continue;
                        if (seenNames.has(nameLower)) { skippedDuplicateEngines++; continue; }
                        seenNames.add(nameLower);

                        const engineData = {
                            id: engine.id || this.generateId(),
                            name: engine.name,
                            template: template,
                            order: engine.order || 0
                        };
                        try {
                            await this.dbService.addSearchEngine(engineData);
                            importedEngines++;
                        } catch (error) {
                            // 如果因为名称重复失败，尝试更新现有的同名引擎
                            if (String(error.message || '').includes('名称已存在')) {
                                try {
                                    const existingEngines = await this.dbService.getSearchEngines();
                                    const exist = existingEngines.find(e => (e.name || '').toLowerCase() === nameLower);
                                    if (exist) {
                                        await this.dbService.updateSearchEngine({ ...exist, ...engineData, id: exist.id });
                                        importedEngines++;
                                    }
                                } catch (e2) {
                                    console.warn(`更新搜索引擎失败: ${engineData.name}`, e2);
                                }
                            } else {
                                console.warn(`导入搜索引擎失败: ${engineData.name}`, error);
                            }
                        }
                    }
                }
                
                // 更新统计信息
                await this.loadStats();
                
                this.showStatus(`导入成功！导入了 ${importedWebsites} 个网站，${importedCategories} 个分类，${importedFilters} 个筛选标签（去重跳过 ${skippedDuplicateFilters}），${importedEngines} 个搜索引擎（去重跳过 ${skippedDuplicateEngines}）。正在刷新页面...`, 'success');
                this.clearFile();
                
                // 重置警告状态
                this.importWarningShown = false;
                
                // 刷新页面显示
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                
            } catch (error) {
                console.error('导入失败:', error);
                this.showStatus('导入失败: ' + error.message, 'error');
                this.importWarningShown = false; // 重置警告状态
            } finally {
                this.isImporting = false;
            }
        },

        // 显示恢复默认警告（使用通用弹窗）
        showRestoreWarning() {
            this.showWarningModal({
                overlayId: 'restoreWarningOverlay',
                title: '恢复默认数据警告',
                description: '此操作将清空当前数据库并写入系统默认数据！',
                confirmText: '确认恢复',
                onConfirm: async () => {
                    await this.proceedRestoreDefault();
                }
            });
        },

        // 取消恢复
        cancelRestore() {
            const overlay = document.getElementById('restoreWarningOverlay');
            if (overlay) {
                overlay.remove();
            }
            this.restoreWarningShown = false;
            this.showStatus('恢复操作已取消', 'info');
        },

        // 执行恢复默认流程
        async proceedRestoreDefault() {
            this.isImporting = true;
            try {
                // 确保 DataSync 服务可用
                if (!this.dataSync) {
                    const { default: dataSyncService } = await import('./services/DataSyncService.js');
                    this.dataSync = dataSyncService;
                }
                await this.dataSync.resetToDefault();
                this.showStatus('已恢复为默认数据', 'success');
                await this.loadStats();
            } catch (error) {
                console.error('恢复默认失败:', error);
                this.showStatus('恢复默认失败: ' + error.message, 'error');
            } finally {
                this.isImporting = false;
            }
        },

        // 读取 JSON 文件
        readJSONFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        resolve(data);
                    } catch (error) {
                        reject(new Error('JSON 文件格式错误'));
                    }
                };
                reader.onerror = () => reject(new Error('文件读取失败'));
                reader.readAsText(file);
            });
        },
        
        // 读取 Excel 文件
        async readExcelFile(file) {
            // 确保 SheetJS 库已加载
            if (!window.XLSX) {
                await this.loadSheetJS();
            }
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = window.XLSX.read(data, { type: 'array' });
                        
                        // 解析工作表数据
                        const result = {
                            websites: [],
                            categories: [],
                            filters: [],
                            searchEngines: []
                        };
                        
                        // 查找网站数据工作表
                        const websiteSheetName = workbook.SheetNames.find(name => 
                            name.includes('网站') || name.toLowerCase().includes('website')
                        ) || workbook.SheetNames[0];
                        
                        if (websiteSheetName && workbook.Sheets[websiteSheetName]) {
                            const websiteSheet = workbook.Sheets[websiteSheetName];
                            const websiteData = window.XLSX.utils.sheet_to_json(websiteSheet);
                            
                            result.websites = websiteData.map(row => ({
                                id: row['ID'] || row['网站ID'] || this.generateId(),
                                name: row['网站名称'] || row['名称'] || row['name'] || row['title'],
                                url: row['网站URL'] || row['URL'] || row['url'],
                                categoryId: row['分类ID'] || row['categoryId'] || null,
                                icon: row['图标'] || row['icon'] || '',
                                description: row['描述'] || row['description'] || '',
                                paymentType: row['付费类型'] || row['paymentType'] || 'free',
                                order: parseInt(row['排序'] || row['order']) || 0
                            })).filter(website => website.name && website.url);
                        }
                        
                        // 查找分类数据工作表
                        const categorySheetName = workbook.SheetNames.find(name => 
                            name.includes('分类') || name.toLowerCase().includes('category')
                        );
                        
                        if (categorySheetName && workbook.Sheets[categorySheetName]) {
                            const categorySheet = workbook.Sheets[categorySheetName];
                            const categoryData = window.XLSX.utils.sheet_to_json(categorySheet);
                            
                            result.categories = categoryData.map(row => ({
                                id: row['分类ID'] || row['ID'] || row['id'] || this.generateId(),
                                name: row['分类名称'] || row['名称'] || row['name'],
                                parentId: row['父级ID'] || row['parentId'] || null,
                                icon: row['图标'] || row['icon'] || '',
                                color: row['颜色'] || row['color'] || '#3498db',
                                description: row['描述'] || row['description'] || '',
                                order: parseInt(row['排序'] || row['order']) || 0
                            })).filter(category => category.name);
                        }

                        // 查找筛选标签工作表
                        const filterSheetName = workbook.SheetNames.find(name =>
                            name.includes('筛选') || name.includes('标签') || name.toLowerCase().includes('filter')
                        );

                        if (filterSheetName && workbook.Sheets[filterSheetName]) {
                            const filterSheet = workbook.Sheets[filterSheetName];
                            const filterData = window.XLSX.utils.sheet_to_json(filterSheet);

                            result.filters = filterData.map(row => ({
                                id: row['ID'] || row['id'] || this.generateId(),
                                name: row['名称'] || row['name'],
                                key: row['Key'] || row['key'],
                                backgroundColor: row['背景色'] || row['backgroundColor'] || '#3b82f6',
                                order: parseInt(row['排序'] || row['order']) || 0
                            })).filter(tag => tag.name && tag.key);
                        }

                        // 查找搜索引擎工作表
                        const engineSheetName = workbook.SheetNames.find(name =>
                            name.includes('引擎') || name.toLowerCase().includes('engine')
                        );

                        if (engineSheetName && workbook.Sheets[engineSheetName]) {
                            const engineSheet = workbook.Sheets[engineSheetName];
                            const engineData = window.XLSX.utils.sheet_to_json(engineSheet);

                            result.searchEngines = engineData.map(row => ({
                                id: row['ID'] || row['id'] || this.generateId(),
                                name: row['引擎名称'] || row['名称'] || row['name'],
                                template: row['搜索模板'] || row['模板'] || row['template'],
                                order: parseInt(row['排序'] || row['order']) || 0
                            })).filter(engine => engine.name && engine.template);
                        }
                        
                        resolve(result);
                    } catch (error) {
                        reject(new Error('Excel 文件解析失败: ' + error.message));
                    }
                };
                reader.onerror = () => reject(new Error('文件读取失败'));
                reader.readAsArrayBuffer(file);
            });
        },
        

        
        // 验证导入数据格式
        validateImportData(data) {
            if (!data || typeof data !== 'object') {
                return { valid: false, message: '数据格式错误' };
            }
            
            // 检查必要的字段
            if (!data.websites && !data.categories && !data.filters && !data.searchEngines) {
                return { valid: false, message: '数据中至少包含 websites、categories、filters 或 searchEngines 之一' };
            }
            
            // 验证网站数据格式
            if (data.websites && Array.isArray(data.websites)) {
                for (const website of data.websites) {
                    // 兼容不同的字段名：title/name, url
                    const hasName = website.name || website.title;
                    const hasUrl = website.url;
                    
                    if (!hasName || !hasUrl) {
                        return { valid: false, message: '网站数据缺少必要字段 (name/title, url)' };
                    }
                }
            }
            
            // 验证分类数据格式
            if (data.categories && Array.isArray(data.categories)) {
                for (const category of data.categories) {
                    if (!category.name) {
                        return { valid: false, message: '分类数据缺少必要字段 (name)' };
                    }
                }
            }
            
            return { valid: true };
        },
        

        
        // 导出数据（用于备份等场景）
        async exportData() {
            this.isExporting = true;
            
            try {
                // 获取所有数据
                const websites = await this.dbService.getWebsites();
                const categories = await this.dbService.getCategories();
                const filters = await this.dbService.getFilters();
                const searchEngines = await this.dbService.getSearchEngines();
                
                const exportData = {
                    websites,
                    categories,
                    filters,
                    searchEngines,
                    exportTime: new Date().toISOString(),
                    version: '1.0'
                };
                
                this.exportAsJSONInternal(exportData);
                this.showStatus('数据导出成功', 'success');
                
            } catch (error) {
                console.error('导出失败:', error);
                this.showStatus('导出失败: ' + error.message, 'error');
            } finally {
                this.isExporting = false;
            }
        },
        
        // 导出为 JSON（按钮点击方法）
        async exportAsJSON() {
            this.isExporting = true;
            
            try {
                // 获取所有数据
                const websites = await this.dbService.getWebsites();
                const categories = await this.dbService.getCategories();
                const filters = await this.dbService.getFilters();
                const searchEngines = await this.dbService.getSearchEngines();
                
                const exportData = {
                    websites,
                    categories,
                    filters,
                    searchEngines,
                    exportTime: new Date().toISOString(),
                    version: '1.0'
                };
                
                // 导出JSON文件
                const jsonString = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `website-data-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                URL.revokeObjectURL(url);
                
                this.showStatus('JSON文件导出成功', 'success');
                
            } catch (error) {
                console.error('导出JSON失败:', error);
                this.showStatus('导出JSON失败: ' + error.message, 'error');
            } finally {
                this.isExporting = false;
            }
        },
        
        // 导出为 JSON（内部方法，用于备份等场景）
        exportAsJSONInternal(data) {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `website-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        },
        
        // 导出为 Excel
        async exportExcel() {
            this.isExporting = true;
            
            try {
                // 获取所有数据
                const websites = await this.dbService.getWebsites();
                const categories = await this.dbService.getCategories();
                const filters = await this.dbService.getFilters();
                const searchEngines = await this.dbService.getSearchEngines();
                
                // 动态加载 SheetJS
                if (!window.XLSX) {
                    await this.loadSheetJS();
                }
                
                // 创建工作簿
                const wb = window.XLSX.utils.book_new();
                
                // 创建网站工作表
                const websiteData = websites.map(website => ({
                    '网站名称': website.name,
                    '网站URL': website.url,
                    '分类ID': website.categoryId,
                    '图标': website.icon || '',
                    '描述': website.description || '',
                    '付费类型': website.paymentType || '',
                    '排序': website.order || 0,
                    '创建时间': website.createdAt,
                    '更新时间': website.updatedAt,
                    'ID': website.id
                }));
                
                const websiteWS = window.XLSX.utils.json_to_sheet(websiteData);
                window.XLSX.utils.book_append_sheet(wb, websiteWS, '网站数据');
                
                // 创建分类工作表
                const categoryData = categories.map(category => ({
                    '分类名称': category.name,
                    '分类ID': category.id,
                    '父级ID': category.parentId || '',
                    '图标': category.icon || '',
                    '颜色': category.color || '',
                    '描述': category.description || '',
                    '排序': category.order || 0,
                    '创建时间': category.createdAt,
                    '更新时间': category.updatedAt
                }));
                
                const categoryWS = window.XLSX.utils.json_to_sheet(categoryData);
                window.XLSX.utils.book_append_sheet(wb, categoryWS, '分类数据');

                // 创建筛选标签工作表
                const filterData = (filters || []).map(tag => ({
                    '名称': tag.name,
                    'Key': tag.key,
                    '背景色': tag.backgroundColor || '#3b82f6',
                    '排序': tag.order || 0,
                    '创建时间': tag.createdAt,
                    '更新时间': tag.updatedAt,
                    'ID': tag.id
                }));
                const filterWS = window.XLSX.utils.json_to_sheet(filterData);
                window.XLSX.utils.book_append_sheet(wb, filterWS, '筛选标签');

                // 创建搜索引擎工作表
                const engineData = (searchEngines || []).map(engine => ({
                    '引擎名称': engine.name,
                    '搜索模板': engine.template,
                    '排序': engine.order || 0,
                    '创建时间': engine.createdAt,
                    '更新时间': engine.updatedAt,
                    'ID': engine.id
                }));
                const engineWS = window.XLSX.utils.json_to_sheet(engineData);
                window.XLSX.utils.book_append_sheet(wb, engineWS, '搜索引擎');
                
                // 导出文件
                const fileName = `website-data-${new Date().toISOString().split('T')[0]}.xlsx`;
                window.XLSX.writeFile(wb, fileName);
                
                this.showStatus('Excel文件导出成功', 'success');
                
            } catch (error) {
                console.error('导出Excel失败:', error);
                this.showStatus('导出Excel失败: ' + error.message, 'error');
            } finally {
                this.isExporting = false;
            }
        },
        
        // 动态加载 SheetJS 库
        loadSheetJS() {
            return new Promise((resolve, reject) => {
                if (window.XLSX) {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('SheetJS库加载失败'));
                document.head.appendChild(script);
            });
        },
        
        // 生成唯一ID
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        },
        

        
        // 显示状态消息
        showStatus(message, type = 'info') {
            // 添加加载图标
            let icon = '';
            switch(type) {
                case 'success':
                    icon = '✅ ';
                    break;
                case 'error':
                    icon = '❌ ';
                    break;
                case 'info':
                    icon = 'ℹ️ ';
                    break;
                case 'warning':
                    icon = '⚠️ ';
                    break;
                default:
                    icon = '';
            }
            
            this.statusMessage = {
                text: icon + message,
                type: type
            };
            
            // 自动清除消息（除了info类型）
            if (type !== 'info') {
                setTimeout(() => {
                    this.statusMessage = null;
                }, type === 'success' ? 3000 : 5000);
            }
        },

        // 通用警告弹窗（传入标题、确认按钮文案与确认回调）
        showWarningModal({ overlayId = 'commonWarningOverlay', title = '操作警告', description = '', confirmText = '确认', onConfirm }) {
            // 若已存在同名弹窗，先移除
            const existingOverlay = document.getElementById(overlayId);
            if (existingOverlay) {
                existingOverlay.remove();
            }

            const warningHtml = `
                <div class="import-warning-overlay" id="${overlayId}">
                    <div class="import-warning-dialog">
                        <div class="warning-icon">⚠️</div>
                        <h3>${title}</h3>
                        <div class="warning-content">
                             ${description ? `<p><strong>⚠️ ${description}</strong></p>` : ''}
                             <div class="warning-details">
                                 <h4>📋 操作详情：</h4>
                                 <ul>
                                     <li>🗑️ 现有数据将被删除或覆盖</li>
                                     <li>🚫 此操作无法撤销</li>
                                     <li>💾 建议在操作前先导出当前数据作为备份</li>
                                 </ul>
                             </div>
                             <div class="confirmation-steps">
                                 <h4>✅ 确认步骤：</h4>
                                 <p>1. 点击"先备份数据"保存当前数据（推荐）</p>
                                 <p>2. 或点击"取消"终止操作</p>
                                 <p>3. 如确定继续，请点击"${confirmText}"按钮</p>
                             </div>
                         </div>
                        <div class="warning-actions">
                            <button class="btn-cancel">取消</button>
                            <button class="btn-backup">先备份数据</button>
                            <button class="btn-confirm">${confirmText}</button>
                        </div>
                    </div>
                </div>
            `;

            // 添加弹窗到页面
            document.body.insertAdjacentHTML('beforeend', warningHtml);
            const overlayEl = document.getElementById(overlayId);

            // 绑定事件
            const cancelBtn = overlayEl?.querySelector('.btn-cancel');
            const backupBtn = overlayEl?.querySelector('.btn-backup');
            const confirmBtn = overlayEl?.querySelector('.btn-confirm');

            cancelBtn?.addEventListener('click', () => {
                overlayEl.remove();
                if (overlayId === 'importWarningOverlay') {
                    this.importWarningShown = false;
                    this.showStatus('导入操作已取消', 'info');
                } else if (overlayId === 'restoreWarningOverlay') {
                    this.restoreWarningShown = false;
                    this.showStatus('恢复操作已取消', 'info');
                }
            });

            backupBtn?.addEventListener('click', () => {
                this.exportData();
                this.showStatus('数据备份完成，您现在可以继续操作', 'success');
            });

            confirmBtn?.addEventListener('click', async () => {
                overlayEl.remove();
                try {
                    if (typeof onConfirm === 'function') {
                        await onConfirm();
                    }
                } catch (error) {
                    console.error('确认操作失败:', error);
                    this.showStatus('操作失败: ' + error.message, 'error');
                }
            });

            // 注入样式（若未注入则注入一次）
            if (!document.getElementById('importWarningStyles')) {
                const styles = `
                    <style id="importWarningStyles">
                    .import-warning-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.7);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 10000;
                        animation: fadeIn 0.3s ease;
                    }
                    
                    .import-warning-dialog {
                        background: white;
                        border-radius: 12px;
                        padding: 30px;
                        max-width: 500px;
                        width: 90%;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                        text-align: center;
                        animation: slideIn 0.3s ease;
                    }
                    
                    .warning-icon {
                        font-size: 48px;
                        margin-bottom: 15px;
                    }
                    
                    .import-warning-dialog h3 {
                        color: #e74c3c;
                        margin-bottom: 20px;
                        font-size: 24px;
                    }
                    
                    .warning-content {
                         text-align: left;
                         margin-bottom: 25px;
                         line-height: 1.6;
                     }
                     
                     .warning-content p {
                         margin-bottom: 15px;
                     }
                     
                     .warning-details, .confirmation-steps {
                         background: #f8f9fa;
                         border-radius: 8px;
                         padding: 15px;
                         margin: 15px 0;
                         border-left: 4px solid #e74c3c;
                     }
                     
                     .confirmation-steps {
                         border-left-color: #3498db;
                     }
                     
                     .warning-details h4, .confirmation-steps h4 {
                         margin: 0 0 10px 0;
                         color: #2c3e50;
                         font-size: 16px;
                     }
                     
                     .warning-content ul {
                         margin: 10px 0;
                         padding-left: 20px;
                     }
                     
                     .warning-content li {
                         margin-bottom: 8px;
                     }
                     
                     .confirmation-steps p {
                         margin: 5px 0;
                         font-size: 14px;
                     }
                    
                    .warning-actions {
                        display: flex;
                        gap: 15px;
                        justify-content: center;
                    }
                    
                    .warning-actions button {
                        padding: 12px 24px;
                        border: none;
                        border-radius: 6px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    
                    .btn-cancel {
                        background: #95a5a6;
                        color: white;
                    }
                    
                    .btn-cancel:hover {
                        background: #7f8c8d;
                    }
                    
                    .btn-backup {
                        background: #3498db;
                        color: white;
                    }
                    
                    .btn-backup:hover {
                        background: #2980b9;
                    }
                    
                    .btn-confirm {
                        background: #e74c3c;
                        color: white;
                    }
                    
                    .btn-confirm:hover {
                        background: #c0392b;
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    @keyframes slideIn {
                        from { transform: translateY(-50px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    </style>
                `;
                document.head.insertAdjacentHTML('beforeend', styles);
            }
        },

        // 显示导入警告（使用通用弹窗）
        showImportWarning() {
            this.showWarningModal({
                overlayId: 'importWarningOverlay',
                title: '数据导入警告',
                description: '注意：导入操作将会完全覆盖当前数据库中的所有内容！',
                confirmText: '确认导入',
                onConfirm: async () => {
                    await this.proceedWithImport();
                }
            });
        },

        // 取消导入
        cancelImport() {
            const overlay = document.getElementById('importWarningOverlay');
            if (overlay) {
                overlay.remove();
            }
            this.importWarningShown = false;
            this.showStatus('导入操作已取消', 'info');
        },
        
        // 继续导入流程
        async proceedWithImport() {
            if (!this.selectedFile) {
                this.showStatus('请先选择要导入的文件', 'error');
                return;
            }
            
            this.isImporting = true;
            this.showStatus('正在导入数据...', 'info');
            
            try {
                // 根据文件类型选择读取方法
                const fileExtension = '.' + this.selectedFile.name.split('.').pop().toLowerCase();
                let data;
                
                if (fileExtension === '.json') {
                    data = await this.readJSONFile(this.selectedFile);
                } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
                    data = await this.readExcelFile(this.selectedFile);
                } else {
                    throw new Error('不支持的文件格式');
                }
                
                // 验证数据格式
                const validation = this.validateImportData(data);
                if (!validation.valid) {
                    throw new Error(validation.message);
                }
                
                // 清空现有数据
                await this.dbService.clearAllData();
                
                // 导入新数据
                if (data.categories && data.categories.length > 0) {
                    for (const category of data.categories) {
                        await this.dbService.addCategory({
                            id: category.id || this.generateId(),
                            name: category.name,
                            parentId: category.parentId || null,
                            icon: category.icon || '',
                            color: category.color || '#3498db',
                            description: category.description || '',
                            order: category.order || 0
                        });
                    }
                }
                
                if (data.websites && data.websites.length > 0) {
                    for (const website of data.websites) {
                        await this.dbService.addWebsite({
                            id: website.id || this.generateId(),
                            name: website.name || website.title,
                            url: website.url,
                            categoryId: website.categoryId || null,
                            icon: website.icon || '',
                            description: website.description || '',
                            paymentType: website.paymentType || 'free',
                            order: website.order || 0
                        });
                    }
                }

                // 导入筛选标签（按 key 去重，并在重复时更新）
                if (data.filters && data.filters.length > 0) {
                    const seenKeys = new Set();
                    for (const tag of data.filters) {
                        const keyLower = (tag.key || '').trim().toLowerCase();
                        if (!keyLower) continue;
                        if (seenKeys.has(keyLower)) continue;
                        seenKeys.add(keyLower);

                        const tagData = {
                            id: tag.id || this.generateId(),
                            name: tag.name,
                            key: tag.key,
                            backgroundColor: tag.backgroundColor || '#3b82f6',
                            order: tag.order || 0
                        };
                        try {
                            await this.dbService.addFilter(tagData);
                        } catch (error) {
                            if (String(error.message || '').includes('key 已存在')) {
                                const existingFilters = await this.dbService.getFilters();
                                const exist = existingFilters.find(f => (f.key || '').toLowerCase() === keyLower);
                                if (exist) {
                                    await this.dbService.updateFilter({ ...exist, ...tagData, id: exist.id });
                                }
                            } else {
                                throw error;
                            }
                        }
                    }
                }

                // 导入搜索引擎（按名称去重，并在重复时更新）
                if (data.searchEngines && data.searchEngines.length > 0) {
                    const seenNames = new Set();
                    for (const engine of data.searchEngines) {
                        const nameLower = (engine.name || '').trim().toLowerCase();
                        const template = (engine.template || '').trim();
                        if (!nameLower || !template) continue;
                        if (seenNames.has(nameLower)) continue;
                        seenNames.add(nameLower);

                        const engineData = {
                            id: engine.id || this.generateId(),
                            name: engine.name,
                            template: template,
                            order: engine.order || 0
                        };
                        try {
                            await this.dbService.addSearchEngine(engineData);
                        } catch (error) {
                            if (String(error.message || '').includes('名称已存在')) {
                                const existingEngines = await this.dbService.getSearchEngines();
                                const exist = existingEngines.find(e => (e.name || '').toLowerCase() === nameLower);
                                if (exist) {
                                    await this.dbService.updateSearchEngine({ ...exist, ...engineData, id: exist.id });
                                }
                            } else {
                                throw error;
                            }
                        }
                    }
                }
                
                this.showStatus('数据导入成功！', 'success');
                
                // 刷新统计数据和预览
                await this.loadStats();
                this.previewData = null;
                this.selectedFile = null;
                
                // 刷新页面数据
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                
            } catch (error) {
                console.error('导入失败:', error);
                this.showStatus('导入失败: ' + error.message, 'error');
            } finally {
                this.isImporting = false;
                this.importWarningShown = false;
            }
        },
        
        // 获取状态图标
        getStatusIcon(type) {
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                info: 'fas fa-info-circle'
            };
            return icons[type] || icons.info;
        }
    }
};

// 创建并挂载 Vue 应用
createApp(DataManagerApp).mount('#app');