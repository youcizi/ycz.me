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
            dbService: null,
            
            // 导入警告状态
            importWarningShown: false
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
                const data = await this.readJSONFile(this.selectedFile);
                
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
                
                // 更新统计信息
                await this.loadStats();
                
                this.showStatus(`导入成功！导入了 ${importedWebsites} 个网站，${importedCategories} 个分类。正在刷新页面...`, 'success');
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
        
        // 导出为 Excel
        async exportExcel() {
            this.isExporting = true;
            
            try {
                // 获取所有数据
                const websites = await this.dbService.getWebsites();
                const categories = await this.dbService.getCategories();
                
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
                    '更新时间': website.updatedAt
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

        // 显示导入警告
        showImportWarning() {
            // 检查是否已存在警告对话框
            const existingOverlay = document.getElementById('importWarningOverlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            const warningHtml = `
                <div class="import-warning-overlay" id="importWarningOverlay">
                    <div class="import-warning-dialog">
                        <div class="warning-icon">⚠️</div>
                        <h3>数据导入警告</h3>
                        <div class="warning-content">
                             <p><strong>⚠️ 注意：导入操作将会完全覆盖当前数据库中的所有内容！</strong></p>
                             <div class="warning-details">
                                 <h4>📋 操作详情：</h4>
                                 <ul>
                                     <li>🗑️ 现有的所有分类和网站数据将被删除</li>
                                     <li>🚫 此操作无法撤销</li>
                                     <li>💾 建议在导入前先导出当前数据作为备份</li>
                                 </ul>
                             </div>
                             <div class="confirmation-steps">
                                 <h4>✅ 确认步骤：</h4>
                                 <p>1. 点击"先备份数据"保存当前数据（推荐）</p>
                                 <p>2. 或点击"取消"终止操作</p>
                                 <p>3. 如确定继续，请点击"确认导入"按钮</p>
                             </div>
                         </div>
                        <div class="warning-actions">
                            <button class="btn-cancel" id="cancelImportBtn">取消</button>
                            <button class="btn-backup" id="backupDataBtn">先备份数据</button>
                            <button class="btn-confirm" id="confirmImportBtn">确认导入</button>
                        </div>
                    </div>
                </div>
            `;
            
            // 添加警告对话框到页面（只添加一次）
            document.body.insertAdjacentHTML('beforeend', warningHtml);
            
            // 绑定事件监听器
            const cancelBtn = document.getElementById('cancelImportBtn');
            const backupBtn = document.getElementById('backupDataBtn');
            const confirmBtn = document.getElementById('confirmImportBtn');
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    console.log('取消按钮被点击');
                    this.cancelImport();
                });
            }
            
            if (backupBtn) {
                backupBtn.addEventListener('click', () => {
                    console.log('备份按钮被点击');
                    this.exportData();
                    // 备份完成后关闭对话框
                    setTimeout(() => {
                        this.cancelImport();
                    }, 1000);
                });
            }
            
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    console.log('确认导入按钮被点击');
                    this.cancelImport();
                    // 继续导入流程
                    this.proceedWithImport();
                });
            }
            
            // 添加样式
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
                // 读取文件数据
                const data = await this.readJSONFile(this.selectedFile);
                
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
                
                this.showStatus('数据导入成功！', 'success');
                
                // 刷新统计数据和预览
                await this.loadStats();
                this.previewData = null;
                this.selectedFile = null;
                
                // 刷新页面数据
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
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