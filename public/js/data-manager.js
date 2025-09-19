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
            exportType: '',
            
            // 数据预览
            previewData: null,
            
            // 状态消息
            statusMessage: '',
            statusType: 'info', // 'success', 'error', 'info'
            
            // 统计信息
            stats: {
                websites: 0,
                categories: 0
            },
            
            // IndexedDB 服务实例
            dbService: null
        };
    },
    
    async mounted() {
        try {
            // 动态导入 IndexedDB 服务（导入的是实例，不是类）
            const { default: indexedDBService } = await import('./services/IndexedDBService.js');
            
            // 使用导入的服务实例
            this.dbService = indexedDBService;
            await this.dbService.init();
            
            // 加载统计信息
            await this.loadStats();
            
            this.showStatus('数据管理页面已加载', 'success');
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
                
                this.stats.websites = websites.length;
                this.stats.categories = categories.length;
            } catch (error) {
                console.error('加载统计信息失败:', error);
            }
        },
        
        // 拖拽处理
        handleDragOver(event) {
            this.isDragOver = true;
        },
        
        handleDragLeave(event) {
            this.isDragOver = false;
        },
        
        handleFileDrop(event) {
            this.isDragOver = false;
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
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
        
        // 格式化文件大小
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        
        // 导入数据
        async importData() {
            if (!this.selectedFile) {
                this.showStatus('请先选择文件', 'error');
                return;
            }
            
            this.isImporting = true;
            
            try {
                const fileExtension = '.' + this.selectedFile.name.split('.').pop().toLowerCase();
                let data;
                
                if (fileExtension === '.json') {
                    data = await this.readJSONFile(this.selectedFile);
                } else if (['.xlsx', '.xls'].includes(fileExtension)) {
                    data = await this.readExcelFile(this.selectedFile);
                } else {
                    throw new Error('不支持的文件格式');
                }
                
                // 验证数据格式
                const validationResult = this.validateImportData(data);
                if (!validationResult.valid) {
                    this.showStatus('数据格式验证失败: ' + validationResult.message, 'error');
                    return;
                }
                
                // 显示预览
                this.previewData = data;
                this.showStatus('数据预览已生成，请确认后导入', 'info');
                
            } catch (error) {
                console.error('导入失败:', error);
                this.showStatus('导入失败: ' + error.message, 'error');
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
        readExcelFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        
                        const result = {
                            websites: [],
                            categories: []
                        };
                        
                        // 读取网站数据
                        if (workbook.SheetNames.includes('websites')) {
                            const websiteSheet = workbook.Sheets['websites'];
                            result.websites = XLSX.utils.sheet_to_json(websiteSheet);
                        }
                        
                        // 读取分类数据
                        if (workbook.SheetNames.includes('categories')) {
                            const categorySheet = workbook.Sheets['categories'];
                            result.categories = XLSX.utils.sheet_to_json(categorySheet);
                        }
                        
                        resolve(result);
                    } catch (error) {
                        reject(new Error('Excel 文件解析失败'));
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
            if (!data.websites && !data.categories) {
                return { valid: false, message: '数据中必须包含 websites 或 categories 字段' };
            }
            
            // 验证网站数据格式
            if (data.websites && Array.isArray(data.websites)) {
                for (const website of data.websites) {
                    if (!website.title || !website.url) {
                        return { valid: false, message: '网站数据缺少必要字段 (title, url)' };
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
        
        // 确认导入
        async confirmImport() {
            if (!this.previewData) return;
            
            try {
                this.isImporting = true;
                
                let importedWebsites = 0;
                let importedCategories = 0;
                
                // 导入分类数据
                if (this.previewData.categories && this.previewData.categories.length > 0) {
                    for (const category of this.previewData.categories) {
                        await this.dbService.addCategory(category);
                        importedCategories++;
                    }
                }
                
                // 导入网站数据
                if (this.previewData.websites && this.previewData.websites.length > 0) {
                    for (const website of this.previewData.websites) {
                        await this.dbService.addWebsite(website);
                        importedWebsites++;
                    }
                }
                
                // 更新统计信息
                await this.loadStats();
                
                this.showStatus(`导入成功！导入了 ${importedWebsites} 个网站，${importedCategories} 个分类`, 'success');
                this.cancelImport();
                
            } catch (error) {
                console.error('导入失败:', error);
                this.showStatus('导入失败: ' + error.message, 'error');
            } finally {
                this.isImporting = false;
            }
        },
        
        // 取消导入
        cancelImport() {
            this.previewData = null;
            this.selectedFile = null;
            if (this.$refs.fileInput) {
                this.$refs.fileInput.value = '';
            }
        },
        
        // 导出数据
        async exportData(format) {
            this.isExporting = true;
            this.exportType = format;
            
            try {
                // 获取所有数据
                const websites = await this.dbService.getAllWebsites();
                const categories = await this.dbService.getAllCategories();
                
                const exportData = {
                    websites,
                    categories,
                    exportTime: new Date().toISOString(),
                    version: '1.0'
                };
                
                if (format === 'json') {
                    this.exportAsJSON(exportData);
                } else if (format === 'excel') {
                    this.exportAsExcel(exportData);
                }
                
                this.showStatus(`数据导出成功 (${format.toUpperCase()})`, 'success');
                
            } catch (error) {
                console.error('导出失败:', error);
                this.showStatus('导出失败: ' + error.message, 'error');
            } finally {
                this.isExporting = false;
                this.exportType = '';
            }
        },
        
        // 导出为 JSON
        exportAsJSON(data) {
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
        exportAsExcel(data) {
            const workbook = XLSX.utils.book_new();
            
            // 创建网站工作表
            if (data.websites && data.websites.length > 0) {
                const websiteSheet = XLSX.utils.json_to_sheet(data.websites);
                XLSX.utils.book_append_sheet(workbook, websiteSheet, 'websites');
            }
            
            // 创建分类工作表
            if (data.categories && data.categories.length > 0) {
                const categorySheet = XLSX.utils.json_to_sheet(data.categories);
                XLSX.utils.book_append_sheet(workbook, categorySheet, 'categories');
            }
            
            // 创建信息工作表
            const infoSheet = XLSX.utils.json_to_sheet([{
                exportTime: data.exportTime,
                version: data.version,
                websiteCount: data.websites.length,
                categoryCount: data.categories.length
            }]);
            XLSX.utils.book_append_sheet(workbook, infoSheet, 'info');
            
            // 下载文件
            XLSX.writeFile(workbook, `website-data-${new Date().toISOString().split('T')[0]}.xlsx`);
        },
        
        // 显示状态消息
        showStatus(message, type = 'info') {
            this.statusMessage = message;
            this.statusType = type;
            
            // 自动清除消息
            setTimeout(() => {
                this.statusMessage = '';
            }, 5000);
        }
    }
};

// 创建并挂载 Vue 应用
createApp(DataManagerApp).mount('#app');