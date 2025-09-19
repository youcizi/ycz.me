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
                
                this.websiteCount = websites.length;
                this.categoryCount = categories.length;
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
        
        // 文件选择处理
        handleFileSelect(event) {
            const file = event.target.files[0];
            if (file) {
                this.handleFileSelection(file);
            }
        },
        
        handleFileSelection(file) {
            // 验证文件类型
            const allowedTypes = ['.json'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!allowedTypes.includes(fileExtension)) {
                this.showStatus('不支持的文件格式，请选择 JSON 文件', 'error');
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
        
        // 导入数据
        async importData() {
            if (!this.selectedFile) {
                this.showStatus('请先选择文件', 'error');
                return;
            }
            
            this.isImporting = true;
            
            try {
                const data = await this.readJSONFile(this.selectedFile);
                
                // 验证数据格式
                const validationResult = this.validateImportData(data);
                if (!validationResult.valid) {
                    this.showStatus('数据格式验证失败: ' + validationResult.message, 'error');
                    return;
                }
                
                // 直接导入数据
                let importedWebsites = 0;
                let importedCategories = 0;
                
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
                        await this.dbService.addWebsite(website);
                        importedWebsites++;
                    }
                }
                
                // 更新统计信息
                await this.loadStats();
                
                this.showStatus(`导入成功！导入了 ${importedWebsites} 个网站，${importedCategories} 个分类`, 'success');
                this.clearFile();
                
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
        

        
        // 导出数据
        async exportData() {
            this.isExporting = true;
            
            try {
                // 获取所有数据
                const websites = await this.dbService.getWebsites();
                const categories = await this.dbService.getCategories();
                
                const exportData = {
                    websites,
                    categories,
                    exportTime: new Date().toISOString(),
                    version: '1.0'
                };
                
                this.exportAsJSON(exportData);
                this.showStatus('数据导出成功', 'success');
                
            } catch (error) {
                console.error('导出失败:', error);
                this.showStatus('导出失败: ' + error.message, 'error');
            } finally {
                this.isExporting = false;
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
        

        
        // 显示状态消息
        showStatus(message, type = 'info') {
            this.statusMessage = {
                text: message,
                type: type
            };
            
            // 自动清除消息
            setTimeout(() => {
                this.statusMessage = null;
            }, 5000);
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