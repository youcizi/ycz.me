/**
 * Data Manager UI Class
 * 数据管理界面类
 * 
 * 提供数据导入导出、备份管理的用户界面
 */

class DataManagerUI {
    constructor() {
        this.dataManager = null;
        this.navigationDB = null;
        this.passwordManager = null;
        this.isVisible = false;
        this.currentTab = 'export';
        this.backupList = [];
        this.isLoading = false;
        
        // 绑定方法
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handleTabChange = this.handleTabChange.bind(this);
        this.handleExport = this.handleExport.bind(this);
        this.handleImport = this.handleImport.bind(this);
        this.handleBackup = this.handleBackup.bind(this);
        this.handleRestore = this.handleRestore.bind(this);
        this.handleDeleteBackup = this.handleDeleteBackup.bind(this);
        this.refreshBackupList = this.refreshBackupList.bind(this);
    }
    
    /**
     * 初始化数据管理界面
     */
    async init() {
        try {
            // 等待依赖加载
            await this._waitForDependencies();
            
            // 创建UI
            this._createUI();
            
            // 绑定事件
            this._bindEvents();
            
            // 初始化数据
            await this._initializeData();
            
            console.log('DataManagerUI initialized successfully');
        } catch (error) {
            console.error('Failed to initialize DataManagerUI:', error);
            this._showError('初始化数据管理界面失败: ' + error.message);
        }
    }
    
    /**
     * 设置DataManager实例
     * @param {DataManager} dataManager DataManager实例
     */
    setDataManager(dataManager) {
        this.dataManager = dataManager;
    }

    /**
     * 设置NavigationDB实例
     * @param {NavigationDB} navigationDB NavigationDB实例
     */
    setNavigationDB(navigationDB) {
        this.navigationDB = navigationDB;
    }

    /**
     * 设置PasswordManager实例
     * @param {PasswordManager} passwordManager PasswordManager实例
     */
    setPasswordManager(passwordManager) {
        this.passwordManager = passwordManager;
    }

    /**
     * 设置依赖
     */
    setDependencies(dataManager, navigationDB, passwordManager) {
        this.dataManager = dataManager;
        this.navigationDB = navigationDB;
        this.passwordManager = passwordManager;
    }
    
    /**
     * 等待依赖加载
     */
    async _waitForDependencies() {
        const maxWait = 10000; // 10秒超时
        const startTime = Date.now();
        
        while (!this.dataManager || !this.navigationDB) {
            if (Date.now() - startTime > maxWait) {
                throw new Error('Dependencies not loaded within timeout');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    /**
     * 创建UI界面
     */
    _createUI() {
        // 检查是否已存在
        if (document.getElementById('data-manager-modal')) {
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'data-manager-modal';
        modal.className = 'data-manager-modal';
        modal.innerHTML = this._getModalHTML();
        
        document.body.appendChild(modal);
    }
    
    /**
     * 获取模态框HTML
     */
    _getModalHTML() {
        return `
            <div class="data-manager-overlay"></div>
            <div class="data-manager-content">
                <!-- 头部 -->
                <div class="data-manager-header">
                    <h2>
                        <span class="data-manager-icon">📊</span>
                        数据管理
                    </h2>
                    <button class="data-manager-close" type="button" aria-label="关闭">
                        ✕
                    </button>
                </div>
                
                <!-- 标签页导航 -->
                <div class="data-manager-tabs">
                    <button class="data-manager-tab active" data-tab="export">
                        <span class="tab-icon">📤</span>
                        数据导出
                    </button>
                    <button class="data-manager-tab" data-tab="import">
                        <span class="tab-icon">📥</span>
                        数据导入
                    </button>
                    <button class="data-manager-tab" data-tab="backup">
                        <span class="tab-icon">💾</span>
                        备份管理
                    </button>
                </div>
                
                <!-- 标签页内容 -->
                <div class="data-manager-body">
                    <!-- 导出标签页 -->
                    <div class="data-manager-tab-content active" data-tab="export">
                        <div class="export-section">
                            <h3>导出数据</h3>
                            <p class="section-desc">将您的导航数据导出为文件，便于备份或迁移到其他设备。</p>
                            
                            <!-- 导出格式选择 -->
                            <div class="export-format">
                                <h4>选择导出格式</h4>
                                <div class="format-options">
                                    <label class="format-option">
                                        <input type="radio" name="export-format" value="json" checked>
                                        <div class="format-card">
                                            <div class="format-icon">📄</div>
                                            <div class="format-info">
                                                <div class="format-name">JSON</div>
                                                <div class="format-desc">完整数据，支持重新导入</div>
                                            </div>
                                        </div>
                                    </label>
                                    <label class="format-option">
                                        <input type="radio" name="export-format" value="csv">
                                        <div class="format-card">
                                            <div class="format-icon">📊</div>
                                            <div class="format-info">
                                                <div class="format-name">CSV</div>
                                                <div class="format-desc">表格格式，便于编辑</div>
                                            </div>
                                        </div>
                                    </label>
                                    <label class="format-option">
                                        <input type="radio" name="export-format" value="html">
                                        <div class="format-card">
                                            <div class="format-icon">🌐</div>
                                            <div class="format-info">
                                                <div class="format-name">HTML</div>
                                                <div class="format-desc">网页格式，便于查看</div>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- 导出选项 -->
                            <div class="export-options">
                                <h4>导出选项</h4>
                                <div class="option-group">
                                    <label class="checkbox-option">
                                        <input type="checkbox" id="export-websites" checked>
                                        <span class="checkbox-custom"></span>
                                        <span class="option-text">网站数据</span>
                                    </label>
                                    <label class="checkbox-option">
                                        <input type="checkbox" id="export-categories" checked>
                                        <span class="checkbox-custom"></span>
                                        <span class="option-text">分类数据</span>
                                    </label>
                                    <label class="checkbox-option">
                                        <input type="checkbox" id="export-settings">
                                        <span class="checkbox-custom"></span>
                                        <span class="option-text">设置数据</span>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- 安全选项 -->
                            <div class="security-options">
                                <h4>安全选项</h4>
                                <label class="checkbox-option">
                                    <input type="checkbox" id="export-encrypt">
                                    <span class="checkbox-custom"></span>
                                    <span class="option-text">加密导出文件</span>
                                    <span class="option-hint">（需要密码才能导入）</span>
                                </label>
                            </div>
                            
                            <!-- 导出按钮 -->
                            <div class="export-actions">
                                <button class="btn btn-primary export-btn" type="button">
                                    <span class="btn-icon">📤</span>
                                    导出数据
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 导入标签页 -->
                    <div class="data-manager-tab-content" data-tab="import">
                        <div class="import-section">
                            <h3>导入数据</h3>
                            <p class="section-desc">从文件导入导航数据，支持JSON格式的完整数据导入。</p>
                            
                            <!-- 文件选择 -->
                            <div class="file-upload">
                                <div class="upload-area" id="import-upload-area">
                                    <div class="upload-icon">📁</div>
                                    <div class="upload-text">
                                        <div class="upload-title">选择导入文件</div>
                                        <div class="upload-desc">拖拽文件到此处或点击选择</div>
                                    </div>
                                    <input type="file" id="import-file-input" accept=".json" hidden>
                                </div>
                                <div class="file-info" id="import-file-info" style="display: none;">
                                    <div class="file-details">
                                        <div class="file-name"></div>
                                        <div class="file-size"></div>
                                    </div>
                                    <button class="file-remove" type="button">✕</button>
                                </div>
                            </div>
                            
                            <!-- 导入选项 -->
                            <div class="import-options">
                                <h4>导入选项</h4>
                                <div class="option-group">
                                    <label class="radio-option">
                                        <input type="radio" name="import-mode" value="merge" checked>
                                        <span class="radio-custom"></span>
                                        <div class="option-content">
                                            <div class="option-title">合并数据</div>
                                            <div class="option-desc">保留现有数据，添加新数据</div>
                                        </div>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="import-mode" value="replace">
                                        <span class="radio-custom"></span>
                                        <div class="option-content">
                                            <div class="option-title">替换数据</div>
                                            <div class="option-desc">清除现有数据，导入新数据</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- 导入预览 -->
                            <div class="import-preview" id="import-preview" style="display: none;">
                                <h4>导入预览</h4>
                                <div class="preview-content">
                                    <div class="preview-stats"></div>
                                    <div class="preview-details"></div>
                                </div>
                            </div>
                            
                            <!-- 导入按钮 -->
                            <div class="import-actions">
                                <button class="btn btn-primary import-btn" type="button" disabled>
                                    <span class="btn-icon">📥</span>
                                    导入数据
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 备份标签页 -->
                    <div class="data-manager-tab-content" data-tab="backup">
                        <div class="backup-section">
                            <h3>备份管理</h3>
                            <p class="section-desc">管理您的数据备份，创建新备份或恢复历史备份。</p>
                            
                            <!-- 创建备份 -->
                            <div class="backup-create">
                                <h4>创建新备份</h4>
                                <div class="backup-create-content">
                                    <div class="backup-info">
                                        <div class="backup-desc">创建当前数据的完整备份，包含所有网站、分类和设置信息。</div>
                                    </div>
                                    <button class="btn btn-primary create-backup-btn" type="button">
                                        <span class="btn-icon">💾</span>
                                        创建备份
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 备份列表 -->
                            <div class="backup-list">
                                <div class="backup-list-header">
                                    <h4>备份历史</h4>
                                    <button class="btn btn-outline refresh-backup-btn" type="button">
                                        <span class="btn-icon">🔄</span>
                                        刷新
                                    </button>
                                </div>
                                <div class="backup-items" id="backup-items">
                                    <!-- 备份项目将在这里动态生成 -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 底部 -->
                <div class="data-manager-footer">
                    <div class="footer-info">
                        <span class="info-text">数据管理 - 安全可靠的数据操作</span>
                    </div>
                    <div class="footer-actions">
                        <button class="btn btn-outline close-btn" type="button">
                            关闭
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 加载遮罩 -->
            <div class="data-manager-loading" id="data-manager-loading" style="display: none;">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">处理中...</div>
                </div>
            </div>
        `;
    }
    
    /**
     * 绑定事件
     */
    _bindEvents() {
        const modal = document.getElementById('data-manager-modal');
        if (!modal) return;
        
        // 关闭按钮
        modal.querySelector('.data-manager-close').addEventListener('click', this.hide);
        modal.querySelector('.close-btn').addEventListener('click', this.hide);
        
        // 遮罩层点击关闭
        modal.querySelector('.data-manager-overlay').addEventListener('click', this.hide);
        
        // 标签页切换
        modal.querySelectorAll('.data-manager-tab').forEach(tab => {
            tab.addEventListener('click', this.handleTabChange);
        });
        
        // 导出相关事件
        modal.querySelector('.export-btn').addEventListener('click', this.handleExport);
        
        // 导入相关事件
        const fileInput = modal.querySelector('#import-file-input');
        const uploadArea = modal.querySelector('#import-upload-area');
        const fileRemove = modal.querySelector('.file-remove');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this._handleDragOver.bind(this));
        uploadArea.addEventListener('drop', this._handleDrop.bind(this));
        fileInput.addEventListener('change', this._handleFileSelect.bind(this));
        fileRemove.addEventListener('click', this._clearFileSelection.bind(this));
        modal.querySelector('.import-btn').addEventListener('click', this.handleImport);
        
        // 备份相关事件
        modal.querySelector('.create-backup-btn').addEventListener('click', this.handleBackup);
        modal.querySelector('.refresh-backup-btn').addEventListener('click', this.refreshBackupList);
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    /**
     * 初始化数据
     */
    async _initializeData() {
        try {
            // 刷新备份列表
            await this.refreshBackupList();
        } catch (error) {
            console.error('Failed to initialize data:', error);
        }
    }
    
    /**
     * 显示数据管理界面
     */
    show() {
        const modal = document.getElementById('data-manager-modal');
        if (!modal) return;
        
        this.isVisible = true;
        modal.style.display = 'flex';
        document.body.classList.add('data-manager-open');
        
        // 添加显示动画
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // 刷新数据
        this.refreshBackupList();
    }
    
    /**
     * 隐藏数据管理界面
     */
    hide() {
        const modal = document.getElementById('data-manager-modal');
        if (!modal) return;
        
        modal.classList.remove('show');
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('data-manager-open');
            this.isVisible = false;
        }, 300);
    }
    
    /**
     * 处理标签页切换
     */
    handleTabChange(event) {
        const tab = event.currentTarget.dataset.tab;
        if (!tab || tab === this.currentTab) return;
        
        const modal = document.getElementById('data-manager-modal');
        
        // 更新标签页状态
        modal.querySelectorAll('.data-manager-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        // 更新内容区域
        modal.querySelectorAll('.data-manager-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tab);
        });
        
        this.currentTab = tab;
        
        // 如果切换到备份标签页，刷新备份列表
        if (tab === 'backup') {
            this.refreshBackupList();
        }
    }
    
    /**
     * 处理数据导出
     */
    async handleExport() {
        if (this.isLoading) return;
        
        try {
            this._setLoading(true, '正在导出数据...');
            
            const modal = document.getElementById('data-manager-modal');
            
            // 获取导出选项
            const format = modal.querySelector('input[name="export-format"]:checked').value;
            const includeWebsites = modal.querySelector('#export-websites').checked;
            const includeCategories = modal.querySelector('#export-categories').checked;
            const includeSettings = modal.querySelector('#export-settings').checked;
            const encrypt = modal.querySelector('#export-encrypt').checked;
            
            const options = {
                format,
                includeWebsites,
                includeCategories,
                includeSettings,
                encrypt
            };
            
            // 执行导出
            await this.dataManager.exportData(options);
            
            this._showSuccess('数据导出成功！');
            
        } catch (error) {
            console.error('Export failed:', error);
            this._showError('导出失败: ' + error.message);
        } finally {
            this._setLoading(false);
        }
    }
    
    /**
     * 处理数据导入
     */
    async handleImport() {
        if (this.isLoading) return;
        
        try {
            const modal = document.getElementById('data-manager-modal');
            const fileInput = modal.querySelector('#import-file-input');
            
            if (!fileInput.files || !fileInput.files[0]) {
                this._showError('请选择要导入的文件');
                return;
            }
            
            this._setLoading(true, '正在导入数据...');
            
            const file = fileInput.files[0];
            const mode = modal.querySelector('input[name="import-mode"]:checked').value;
            
            const options = {
                mode,
                validateData: true
            };
            
            // 执行导入
            const result = await this.dataManager.importData(file, options);
            
            this._showSuccess(`数据导入成功！导入了 ${result.imported} 项数据。`);
            
            // 清除文件选择
            this._clearFileSelection();
            
        } catch (error) {
            console.error('Import failed:', error);
            this._showError('导入失败: ' + error.message);
        } finally {
            this._setLoading(false);
        }
    }
    
    /**
     * 处理创建备份
     */
    async handleBackup() {
        if (this.isLoading) return;
        
        try {
            this._setLoading(true, '正在创建备份...');
            
            // 创建备份
            const backupId = await this.dataManager.createBackup();
            
            this._showSuccess('备份创建成功！');
            
            // 刷新备份列表
            await this.refreshBackupList();
            
        } catch (error) {
            console.error('Backup failed:', error);
            this._showError('创建备份失败: ' + error.message);
        } finally {
            this._setLoading(false);
        }
    }
    
    /**
     * 处理恢复备份
     */
    async handleRestore(backupId) {
        if (this.isLoading) return;
        
        const confirmed = confirm('恢复备份将替换当前所有数据，此操作不可撤销。确定要继续吗？');
        if (!confirmed) return;
        
        try {
            this._setLoading(true, '正在恢复备份...');
            
            // 恢复备份
            await this.dataManager.restoreBackup(backupId);
            
            this._showSuccess('备份恢复成功！');
            
        } catch (error) {
            console.error('Restore failed:', error);
            this._showError('恢复备份失败: ' + error.message);
        } finally {
            this._setLoading(false);
        }
    }
    
    /**
     * 处理删除备份
     */
    async handleDeleteBackup(backupId) {
        if (this.isLoading) return;
        
        const confirmed = confirm('确定要删除这个备份吗？此操作不可撤销。');
        if (!confirmed) return;
        
        try {
            this._setLoading(true, '正在删除备份...');
            
            // 删除备份
            await this.dataManager.deleteBackup(backupId);
            
            this._showSuccess('备份删除成功！');
            
            // 刷新备份列表
            await this.refreshBackupList();
            
        } catch (error) {
            console.error('Delete backup failed:', error);
            this._showError('删除备份失败: ' + error.message);
        } finally {
            this._setLoading(false);
        }
    }
    
    /**
     * 刷新备份列表
     */
    async refreshBackupList() {
        try {
            const backups = await this.dataManager.getBackupList();
            this.backupList = backups;
            this._renderBackupList();
        } catch (error) {
            console.error('Failed to refresh backup list:', error);
        }
    }
    
    /**
     * 渲染备份列表
     */
    _renderBackupList() {
        const container = document.getElementById('backup-items');
        if (!container) return;
        
        if (this.backupList.length === 0) {
            container.innerHTML = `
                <div class="backup-empty">
                    <div class="empty-icon">📦</div>
                    <div class="empty-text">暂无备份</div>
                    <div class="empty-desc">创建您的第一个数据备份</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.backupList.map(backup => `
            <div class="backup-item" data-backup-id="${backup.id}">
                <div class="backup-info">
                    <div class="backup-name">${backup.name}</div>
                    <div class="backup-meta">
                        <span class="backup-date">${this._formatDate(backup.createdAt)}</span>
                        <span class="backup-size">${this._formatSize(backup.size)}</span>
                        <span class="backup-count">${backup.itemCount} 项数据</span>
                    </div>
                </div>
                <div class="backup-actions">
                    <button class="btn btn-sm btn-outline restore-backup-btn" 
                            data-backup-id="${backup.id}" type="button">
                        <span class="btn-icon">🔄</span>
                        恢复
                    </button>
                    <button class="btn btn-sm btn-outline delete-backup-btn" 
                            data-backup-id="${backup.id}" type="button">
                        <span class="btn-icon">🗑️</span>
                        删除
                    </button>
                </div>
            </div>
        `).join('');
        
        // 绑定备份操作事件
        container.querySelectorAll('.restore-backup-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const backupId = e.currentTarget.dataset.backupId;
                this.handleRestore(backupId);
            });
        });
        
        container.querySelectorAll('.delete-backup-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const backupId = e.currentTarget.dataset.backupId;
                this.handleDeleteBackup(backupId);
            });
        });
    }
    
    /**
     * 处理拖拽悬停
     */
    _handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }
    
    /**
     * 处理文件拖拽
     */
    _handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this._selectFile(files[0]);
        }
    }
    
    /**
     * 处理文件选择
     */
    _handleFileSelect(event) {
        const files = event.target.files;
        if (files.length > 0) {
            this._selectFile(files[0]);
        }
    }
    
    /**
     * 选择文件
     */
    async _selectFile(file) {
        try {
            // 验证文件类型
            if (!file.name.toLowerCase().endsWith('.json')) {
                this._showError('请选择JSON格式的文件');
                return;
            }
            
            // 验证文件大小（最大10MB）
            if (file.size > 10 * 1024 * 1024) {
                this._showError('文件大小不能超过10MB');
                return;
            }
            
            // 显示文件信息
            this._showFileInfo(file);
            
            // 预览文件内容
            await this._previewFile(file);
            
            // 启用导入按钮
            const importBtn = document.querySelector('.import-btn');
            if (importBtn) {
                importBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('File selection failed:', error);
            this._showError('文件选择失败: ' + error.message);
        }
    }
    
    /**
     * 显示文件信息
     */
    _showFileInfo(file) {
        const uploadArea = document.getElementById('import-upload-area');
        const fileInfo = document.getElementById('import-file-info');
        
        if (uploadArea && fileInfo) {
            uploadArea.style.display = 'none';
            fileInfo.style.display = 'flex';
            
            fileInfo.querySelector('.file-name').textContent = file.name;
            fileInfo.querySelector('.file-size').textContent = this._formatSize(file.size);
        }
    }
    
    /**
     * 预览文件内容
     */
    async _previewFile(file) {
        try {
            const text = await this._readFileAsText(file);
            const data = JSON.parse(text);
            
            // 验证数据格式
            const validation = this.dataManager.validateImportData(data);
            if (!validation.valid) {
                throw new Error('文件格式不正确: ' + validation.error);
            }
            
            // 显示预览
            this._showPreview(validation.stats);
            
        } catch (error) {
            console.error('File preview failed:', error);
            this._showError('文件预览失败: ' + error.message);
            this._clearFileSelection();
        }
    }
    
    /**
     * 显示导入预览
     */
    _showPreview(stats) {
        const preview = document.getElementById('import-preview');
        if (!preview) return;
        
        const statsHtml = `
            <div class="preview-stat">
                <span class="stat-label">网站数量:</span>
                <span class="stat-value">${stats.websites || 0}</span>
            </div>
            <div class="preview-stat">
                <span class="stat-label">分类数量:</span>
                <span class="stat-value">${stats.categories || 0}</span>
            </div>
            <div class="preview-stat">
                <span class="stat-label">设置项目:</span>
                <span class="stat-value">${stats.settings || 0}</span>
            </div>
        `;
        
        preview.querySelector('.preview-stats').innerHTML = statsHtml;
        preview.style.display = 'block';
    }
    
    /**
     * 清除文件选择
     */
    _clearFileSelection() {
        const uploadArea = document.getElementById('import-upload-area');
        const fileInfo = document.getElementById('import-file-info');
        const preview = document.getElementById('import-preview');
        const fileInput = document.getElementById('import-file-input');
        const importBtn = document.querySelector('.import-btn');
        
        if (uploadArea) uploadArea.style.display = 'flex';
        if (fileInfo) fileInfo.style.display = 'none';
        if (preview) preview.style.display = 'none';
        if (fileInput) fileInput.value = '';
        if (importBtn) importBtn.disabled = true;
    }
    
    /**
     * 读取文件为文本
     */
    _readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'utf-8');
        });
    }
    
    /**
     * 设置加载状态
     */
    _setLoading(loading, message = '处理中...') {
        this.isLoading = loading;
        const loadingEl = document.getElementById('data-manager-loading');
        
        if (loadingEl) {
            if (loading) {
                loadingEl.querySelector('.loading-text').textContent = message;
                loadingEl.style.display = 'flex';
            } else {
                loadingEl.style.display = 'none';
            }
        }
    }
    
    /**
     * 显示成功消息
     */
    _showSuccess(message) {
        // 这里可以集成通知系统
        alert(message);
    }
    
    /**
     * 显示错误消息
     */
    _showError(message) {
        // 这里可以集成通知系统
        alert(message);
    }
    
    /**
     * 格式化日期
     */
    _formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    /**
     * 格式化文件大小
     */
    _formatSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * 检查可见性
     */
    isVisible() {
        return this.isVisible;
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        const modal = document.getElementById('data-manager-modal');
        if (modal) {
            modal.remove();
        }
        
        document.body.classList.remove('data-manager-open');
        this.isVisible = false;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManagerUI;
} else if (typeof window !== 'undefined') {
    window.DataManagerUI = DataManagerUI;
}