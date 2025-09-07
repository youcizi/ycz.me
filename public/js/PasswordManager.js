/**
 * PasswordManager - 密码管理界面类
 * 负责密码设置、验证、修改等用户界面功能
 */
class PasswordManager {
    constructor() {
        this.db = null;
        this.cryptoUtils = null;
        this.isAuthenticated = false;
        this.sessionTimeout = 30 * 60 * 1000; // 30分钟会话超时
        this.sessionTimer = null;
        
        // UI元素
        this.elements = {
            passwordModal: null,
            verifyModal: null,
            changePasswordModal: null,
            lockScreen: null
        };
        
        // 事件监听器
        this.eventListeners = [];
        
        // 初始化
        this.init();
    }

    /**
     * 初始化密码管理器
     */
    init() {
        this.createPasswordModals();
        this.bindEvents();
        this.setupSessionManagement();
        console.log('[PasswordManager] 密码管理器初始化完成');
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
     * 设置依赖
     * @param {NavigationDB} navigationDB NavigationDB实例
     * @param {CryptoUtils} cryptoUtils CryptoUtils实例
     */
    setDependencies(navigationDB, cryptoUtils) {
        this.db = navigationDB;
        this.cryptoUtils = cryptoUtils;
    }

    // ==================== 密码设置界面 ====================

    /**
     * 创建密码相关模态框
     */
    createPasswordModals() {
        // 创建密码设置模态框
        this.elements.passwordModal = this.createPasswordSetupModal();
        
        // 创建密码验证模态框
        this.elements.verifyModal = this.createPasswordVerifyModal();
        
        // 创建密码修改模态框
        this.elements.changePasswordModal = this.createChangePasswordModal();
        
        // 创建锁屏界面
        this.elements.lockScreen = this.createLockScreen();
        
        // 添加到页面
        document.body.appendChild(this.elements.passwordModal);
        document.body.appendChild(this.elements.verifyModal);
        document.body.appendChild(this.elements.changePasswordModal);
        document.body.appendChild(this.elements.lockScreen);
    }

    /**
     * 创建密码设置模态框
     * @returns {HTMLElement} 模态框元素
     */
    createPasswordSetupModal() {
        const modal = document.createElement('div');
        modal.className = 'password-modal';
        modal.id = 'passwordSetupModal';
        modal.innerHTML = `
            <div class="password-modal-overlay"></div>
            <div class="password-modal-content">
                <div class="password-modal-header">
                    <h2>🔐 设置数据保护密码</h2>
                    <p class="password-modal-subtitle">为您的导航数据设置密码保护，确保数据安全</p>
                </div>
                
                <div class="password-modal-body">
                    <div class="password-form">
                        <div class="password-field">
                            <label for="newPassword">新密码</label>
                            <div class="password-input-group">
                                <input type="password" id="newPassword" placeholder="请输入密码（至少8位）" autocomplete="new-password">
                                <button type="button" class="password-toggle" data-target="newPassword">
                                    <i class="icon-eye">👁️</i>
                                </button>
                            </div>
                            <div class="password-strength">
                                <div class="password-strength-bar">
                                    <div class="password-strength-fill"></div>
                                </div>
                                <span class="password-strength-text">密码强度</span>
                            </div>
                        </div>
                        
                        <div class="password-field">
                            <label for="confirmPassword">确认密码</label>
                            <div class="password-input-group">
                                <input type="password" id="confirmPassword" placeholder="请再次输入密码" autocomplete="new-password">
                                <button type="button" class="password-toggle" data-target="confirmPassword">
                                    <i class="icon-eye">👁️</i>
                                </button>
                            </div>
                            <div class="password-match-indicator"></div>
                        </div>
                        
                        <div class="password-tips">
                            <h4>密码安全建议：</h4>
                            <ul>
                                <li>至少8个字符</li>
                                <li>包含大小写字母</li>
                                <li>包含数字和特殊字符</li>
                                <li>避免使用常见密码</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="password-modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelPasswordSetup">取消</button>
                    <button type="button" class="btn btn-primary" id="confirmPasswordSetup" disabled>设置密码</button>
                </div>
            </div>
        `;
        
        return modal;
    }

    /**
     * 创建密码验证模态框
     * @returns {HTMLElement} 模态框元素
     */
    createPasswordVerifyModal() {
        const modal = document.createElement('div');
        modal.className = 'password-modal';
        modal.id = 'passwordVerifyModal';
        modal.innerHTML = `
            <div class="password-modal-overlay"></div>
            <div class="password-modal-content password-verify-content">
                <div class="password-modal-header">
                    <h2>🔒 验证密码</h2>
                    <p class="password-modal-subtitle">请输入密码以访问您的数据</p>
                </div>
                
                <div class="password-modal-body">
                    <div class="password-form">
                        <div class="password-field">
                            <label for="verifyPassword">密码</label>
                            <div class="password-input-group">
                                <input type="password" id="verifyPassword" placeholder="请输入密码" autocomplete="current-password">
                                <button type="button" class="password-toggle" data-target="verifyPassword">
                                    <i class="icon-eye">👁️</i>
                                </button>
                            </div>
                            <div class="password-error-message"></div>
                        </div>
                        
                        <div class="password-options">
                            <label class="checkbox-label">
                                <input type="checkbox" id="rememberSession">
                                <span class="checkmark"></span>
                                记住此次会话（30分钟）
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="password-modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelPasswordVerify">取消</button>
                    <button type="button" class="btn btn-primary" id="confirmPasswordVerify">验证</button>
                </div>
                
                <div class="password-forgot">
                    <p>忘记密码？<a href="#" id="resetPasswordLink">重置数据</a></p>
                </div>
            </div>
        `;
        
        return modal;
    }

    /**
     * 创建密码修改模态框
     * @returns {HTMLElement} 模态框元素
     */
    createChangePasswordModal() {
        const modal = document.createElement('div');
        modal.className = 'password-modal';
        modal.id = 'changePasswordModal';
        modal.innerHTML = `
            <div class="password-modal-overlay"></div>
            <div class="password-modal-content">
                <div class="password-modal-header">
                    <h2>🔑 修改密码</h2>
                    <p class="password-modal-subtitle">更改您的数据保护密码</p>
                </div>
                
                <div class="password-modal-body">
                    <div class="password-form">
                        <div class="password-field">
                            <label for="currentPassword">当前密码</label>
                            <div class="password-input-group">
                                <input type="password" id="currentPassword" placeholder="请输入当前密码" autocomplete="current-password">
                                <button type="button" class="password-toggle" data-target="currentPassword">
                                    <i class="icon-eye">👁️</i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="password-field">
                            <label for="newPasswordChange">新密码</label>
                            <div class="password-input-group">
                                <input type="password" id="newPasswordChange" placeholder="请输入新密码" autocomplete="new-password">
                                <button type="button" class="password-toggle" data-target="newPasswordChange">
                                    <i class="icon-eye">👁️</i>
                                </button>
                            </div>
                            <div class="password-strength">
                                <div class="password-strength-bar">
                                    <div class="password-strength-fill"></div>
                                </div>
                                <span class="password-strength-text">密码强度</span>
                            </div>
                        </div>
                        
                        <div class="password-field">
                            <label for="confirmPasswordChange">确认新密码</label>
                            <div class="password-input-group">
                                <input type="password" id="confirmPasswordChange" placeholder="请再次输入新密码" autocomplete="new-password">
                                <button type="button" class="password-toggle" data-target="confirmPasswordChange">
                                    <i class="icon-eye">👁️</i>
                                </button>
                            </div>
                            <div class="password-match-indicator"></div>
                        </div>
                    </div>
                </div>
                
                <div class="password-modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelPasswordChange">取消</button>
                    <button type="button" class="btn btn-primary" id="confirmPasswordChange" disabled>修改密码</button>
                </div>
            </div>
        `;
        
        return modal;
    }

    /**
     * 创建锁屏界面
     * @returns {HTMLElement} 锁屏元素
     */
    createLockScreen() {
        const lockScreen = document.createElement('div');
        lockScreen.className = 'lock-screen';
        lockScreen.id = 'lockScreen';
        lockScreen.innerHTML = `
            <div class="lock-screen-content">
                <div class="lock-screen-icon">
                    🔒
                </div>
                <h2>数据已锁定</h2>
                <p>为了保护您的数据安全，应用已自动锁定</p>
                <button type="button" class="btn btn-primary" id="unlockButton">解锁</button>
            </div>
        `;
        
        return lockScreen;
    }

    // ==================== 事件绑定 ====================

    /**
     * 绑定事件
     */
    bindEvents() {
        // 密码设置事件
        this.bindPasswordSetupEvents();
        
        // 密码验证事件
        this.bindPasswordVerifyEvents();
        
        // 密码修改事件
        this.bindPasswordChangeEvents();
        
        // 锁屏事件
        this.bindLockScreenEvents();
        
        // 通用事件
        this.bindCommonEvents();
    }

    /**
     * 绑定密码设置事件
     */
    bindPasswordSetupEvents() {
        const modal = this.elements.passwordModal;
        const newPasswordInput = modal.querySelector('#newPassword');
        const confirmPasswordInput = modal.querySelector('#confirmPassword');
        const confirmButton = modal.querySelector('#confirmPasswordSetup');
        const cancelButton = modal.querySelector('#cancelPasswordSetup');
        
        // 密码输入事件
        newPasswordInput.addEventListener('input', () => {
            this.updatePasswordStrength(newPasswordInput.value);
            this.validatePasswordSetup();
        });
        
        confirmPasswordInput.addEventListener('input', () => {
            this.updatePasswordMatch();
            this.validatePasswordSetup();
        });
        
        // 按钮事件
        confirmButton.addEventListener('click', () => this.handlePasswordSetup());
        cancelButton.addEventListener('click', () => this.hidePasswordSetupModal());
        
        // 回车键事件
        [newPasswordInput, confirmPasswordInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !confirmButton.disabled) {
                    this.handlePasswordSetup();
                }
            });
        });
    }

    /**
     * 绑定密码验证事件
     */
    bindPasswordVerifyEvents() {
        const modal = this.elements.verifyModal;
        const passwordInput = modal.querySelector('#verifyPassword');
        const confirmButton = modal.querySelector('#confirmPasswordVerify');
        const cancelButton = modal.querySelector('#cancelPasswordVerify');
        const resetLink = modal.querySelector('#resetPasswordLink');
        
        // 密码输入事件
        passwordInput.addEventListener('input', () => {
            this.clearPasswordError();
        });
        
        // 按钮事件
        confirmButton.addEventListener('click', () => this.handlePasswordVerify());
        cancelButton.addEventListener('click', () => this.hidePasswordVerifyModal());
        resetLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.handlePasswordReset();
        });
        
        // 回车键事件
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handlePasswordVerify();
            }
        });
    }

    /**
     * 绑定密码修改事件
     */
    bindPasswordChangeEvents() {
        const modal = this.elements.changePasswordModal;
        const currentPasswordInput = modal.querySelector('#currentPassword');
        const newPasswordInput = modal.querySelector('#newPasswordChange');
        const confirmPasswordInput = modal.querySelector('#confirmPasswordChange');
        const confirmButton = modal.querySelector('#confirmPasswordChange');
        const cancelButton = modal.querySelector('#cancelPasswordChange');
        
        // 密码输入事件
        newPasswordInput.addEventListener('input', () => {
            this.updatePasswordStrength(newPasswordInput.value, 'Change');
            this.validatePasswordChange();
        });
        
        confirmPasswordInput.addEventListener('input', () => {
            this.updatePasswordMatch('Change');
            this.validatePasswordChange();
        });
        
        currentPasswordInput.addEventListener('input', () => {
            this.validatePasswordChange();
        });
        
        // 按钮事件
        confirmButton.addEventListener('click', () => this.handlePasswordChange());
        cancelButton.addEventListener('click', () => this.hidePasswordChangeModal());
        
        // 回车键事件
        [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !confirmButton.disabled) {
                    this.handlePasswordChange();
                }
            });
        });
    }

    /**
     * 绑定锁屏事件
     */
    bindLockScreenEvents() {
        const unlockButton = this.elements.lockScreen.querySelector('#unlockButton');
        unlockButton.addEventListener('click', () => this.showPasswordVerifyModal());
    }

    /**
     * 绑定通用事件
     */
    bindCommonEvents() {
        // 密码显示/隐藏切换
        document.addEventListener('click', (e) => {
            if (e.target.closest('.password-toggle')) {
                this.togglePasswordVisibility(e.target.closest('.password-toggle'));
            }
        });
        
        // 模态框外部点击关闭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('password-modal-overlay')) {
                const modal = e.target.closest('.password-modal');
                if (modal && modal.style.display === 'flex') {
                    this.hideModal(modal);
                }
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const visibleModal = document.querySelector('.password-modal[style*="flex"]');
                if (visibleModal) {
                    this.hideModal(visibleModal);
                }
            }
        });
    }

    // ==================== 密码功能实现 ====================

    /**
     * 显示密码设置模态框
     * @returns {Promise<boolean>} 设置结果
     */
    async showPasswordSetupModal() {
        return new Promise((resolve) => {
            this.showModal(this.elements.passwordModal);
            
            // 重置表单
            this.resetPasswordSetupForm();
            
            // 设置回调
            this.passwordSetupCallback = resolve;
            
            // 聚焦到密码输入框
            setTimeout(() => {
                this.elements.passwordModal.querySelector('#newPassword').focus();
            }, 100);
        });
    }

    /**
     * 显示密码验证模态框
     * @returns {Promise<boolean>} 验证结果
     */
    async showPasswordVerifyModal() {
        return new Promise((resolve) => {
            this.showModal(this.elements.verifyModal);
            
            // 重置表单
            this.resetPasswordVerifyForm();
            
            // 设置回调
            this.passwordVerifyCallback = resolve;
            
            // 聚焦到密码输入框
            setTimeout(() => {
                this.elements.verifyModal.querySelector('#verifyPassword').focus();
            }, 100);
        });
    }

    /**
     * 显示密码修改模态框
     * @returns {Promise<boolean>} 修改结果
     */
    async showPasswordChangeModal() {
        return new Promise((resolve) => {
            this.showModal(this.elements.changePasswordModal);
            
            // 重置表单
            this.resetPasswordChangeForm();
            
            // 设置回调
            this.passwordChangeCallback = resolve;
            
            // 聚焦到当前密码输入框
            setTimeout(() => {
                this.elements.changePasswordModal.querySelector('#currentPassword').focus();
            }, 100);
        });
    }

    /**
     * 处理密码设置
     */
    async handlePasswordSetup() {
        const modal = this.elements.passwordModal;
        const newPassword = modal.querySelector('#newPassword').value;
        const confirmPassword = modal.querySelector('#confirmPassword').value;
        
        try {
            // 验证密码
            if (newPassword !== confirmPassword) {
                this.showPasswordError('密码不匹配', 'confirmPassword');
                return;
            }
            
            if (newPassword.length < 8) {
                this.showPasswordError('密码至少需要8个字符', 'newPassword');
                return;
            }
            
            // 设置密码
            const success = await this.db.setPassword(newPassword);
            
            if (success) {
                this.hidePasswordSetupModal();
                this.isAuthenticated = true;
                this.startSessionTimer();
                
                if (this.passwordSetupCallback) {
                    this.passwordSetupCallback(true);
                }
                
                this.showSuccessMessage('密码设置成功！');
            } else {
                this.showPasswordError('密码设置失败，请重试');
            }
        } catch (error) {
            console.error('[PasswordManager] 密码设置失败', error);
            this.showPasswordError('密码设置失败: ' + error.message);
        }
    }

    /**
     * 处理密码验证
     */
    async handlePasswordVerify() {
        const modal = this.elements.verifyModal;
        const password = modal.querySelector('#verifyPassword').value;
        const rememberSession = modal.querySelector('#rememberSession').checked;
        
        try {
            const isValid = await this.db.verifyPassword(password);
            
            if (isValid) {
                this.hidePasswordVerifyModal();
                this.isAuthenticated = true;
                
                if (rememberSession) {
                    this.startSessionTimer();
                }
                
                if (this.passwordVerifyCallback) {
                    this.passwordVerifyCallback(true);
                }
                
                this.hideLockScreen();
            } else {
                this.showPasswordError('密码错误，请重试', 'verifyPassword');
                
                // 清空密码输入框
                modal.querySelector('#verifyPassword').value = '';
            }
        } catch (error) {
            console.error('[PasswordManager] 密码验证失败', error);
            this.showPasswordError('验证失败: ' + error.message, 'verifyPassword');
        }
    }

    /**
     * 处理密码修改
     */
    async handlePasswordChange() {
        const modal = this.elements.changePasswordModal;
        const currentPassword = modal.querySelector('#currentPassword').value;
        const newPassword = modal.querySelector('#newPasswordChange').value;
        const confirmPassword = modal.querySelector('#confirmPasswordChange').value;
        
        try {
            // 验证当前密码
            const isCurrentValid = await this.db.verifyPassword(currentPassword);
            if (!isCurrentValid) {
                this.showPasswordError('当前密码错误', 'currentPassword');
                return;
            }
            
            // 验证新密码
            if (newPassword !== confirmPassword) {
                this.showPasswordError('新密码不匹配', 'confirmPasswordChange');
                return;
            }
            
            if (newPassword.length < 8) {
                this.showPasswordError('新密码至少需要8个字符', 'newPasswordChange');
                return;
            }
            
            if (newPassword === currentPassword) {
                this.showPasswordError('新密码不能与当前密码相同', 'newPasswordChange');
                return;
            }
            
            // 修改密码
            const success = await this.db.changePassword(currentPassword, newPassword);
            
            if (success) {
                this.hidePasswordChangeModal();
                
                if (this.passwordChangeCallback) {
                    this.passwordChangeCallback(true);
                }
                
                this.showSuccessMessage('密码修改成功！');
            } else {
                this.showPasswordError('密码修改失败，请重试');
            }
        } catch (error) {
            console.error('[PasswordManager] 密码修改失败', error);
            this.showPasswordError('修改失败: ' + error.message);
        }
    }

    /**
     * 处理密码重置
     */
    async handlePasswordReset() {
        const confirmed = await this.showConfirmDialog(
            '重置数据',
            '重置密码将清除所有数据，此操作不可恢复。确定要继续吗？',
            '重置',
            'danger'
        );
        
        if (confirmed) {
            try {
                // 清除所有数据
                await this.clearAllData();
                
                this.hidePasswordVerifyModal();
                this.isAuthenticated = false;
                
                if (this.passwordVerifyCallback) {
                    this.passwordVerifyCallback(false);
                }
                
                this.showSuccessMessage('数据已重置，您可以重新设置密码');
            } catch (error) {
                console.error('[PasswordManager] 数据重置失败', error);
                this.showErrorMessage('重置失败: ' + error.message);
            }
        }
    }

    // ==================== 会话管理 ====================

    /**
     * 设置会话管理
     */
    setupSessionManagement() {
        // 监听用户活动
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                if (this.isAuthenticated) {
                    this.resetSessionTimer();
                }
            }, { passive: true });
        });
        
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isAuthenticated) {
                // 页面隐藏时立即锁定
                this.lockApplication();
            }
        });
    }

    /**
     * 启动会话计时器
     */
    startSessionTimer() {
        this.clearSessionTimer();
        
        this.sessionTimer = setTimeout(() => {
            this.lockApplication();
        }, this.sessionTimeout);
    }

    /**
     * 重置会话计时器
     */
    resetSessionTimer() {
        if (this.sessionTimer) {
            this.startSessionTimer();
        }
    }

    /**
     * 清除会话计时器
     */
    clearSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    /**
     * 锁定应用
     */
    lockApplication() {
        this.isAuthenticated = false;
        this.clearSessionTimer();
        this.showLockScreen();
        
        // 触发锁定事件
        this.dispatchEvent('applicationLocked');
    }

    /**
     * 解锁应用
     */
    async unlockApplication() {
        const success = await this.showPasswordVerifyModal();
        return success;
    }

    // ==================== UI辅助方法 ====================

    /**
     * 显示模态框
     * @param {HTMLElement} modal 模态框元素
     */
    showModal(modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        
        // 添加动画
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    /**
     * 隐藏模态框
     * @param {HTMLElement} modal 模态框元素
     */
    hideModal(modal) {
        modal.classList.remove('show');
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 300);
    }

    /**
     * 显示锁屏
     */
    showLockScreen() {
        this.elements.lockScreen.style.display = 'flex';
        document.body.classList.add('locked');
    }

    /**
     * 隐藏锁屏
     */
    hideLockScreen() {
        this.elements.lockScreen.style.display = 'none';
        document.body.classList.remove('locked');
    }

    /**
     * 隐藏密码设置模态框
     */
    hidePasswordSetupModal() {
        this.hideModal(this.elements.passwordModal);
        if (this.passwordSetupCallback) {
            this.passwordSetupCallback(false);
        }
    }

    /**
     * 隐藏密码验证模态框
     */
    hidePasswordVerifyModal() {
        this.hideModal(this.elements.verifyModal);
        if (this.passwordVerifyCallback) {
            this.passwordVerifyCallback(false);
        }
    }

    /**
     * 隐藏密码修改模态框
     */
    hidePasswordChangeModal() {
        this.hideModal(this.elements.changePasswordModal);
        if (this.passwordChangeCallback) {
            this.passwordChangeCallback(false);
        }
    }

    /**
     * 重置密码设置表单
     */
    resetPasswordSetupForm() {
        const modal = this.elements.passwordModal;
        modal.querySelector('#newPassword').value = '';
        modal.querySelector('#confirmPassword').value = '';
        modal.querySelector('#confirmPasswordSetup').disabled = true;
        
        this.updatePasswordStrength('');
        this.updatePasswordMatch();
    }

    /**
     * 重置密码验证表单
     */
    resetPasswordVerifyForm() {
        const modal = this.elements.verifyModal;
        modal.querySelector('#verifyPassword').value = '';
        modal.querySelector('#rememberSession').checked = false;
        
        this.clearPasswordError();
    }

    /**
     * 重置密码修改表单
     */
    resetPasswordChangeForm() {
        const modal = this.elements.changePasswordModal;
        modal.querySelector('#currentPassword').value = '';
        modal.querySelector('#newPasswordChange').value = '';
        modal.querySelector('#confirmPasswordChange').value = '';
        modal.querySelector('#confirmPasswordChange').disabled = true;
        
        this.updatePasswordStrength('', 'Change');
        this.updatePasswordMatch('Change');
    }

    /**
     * 更新密码强度显示
     * @param {string} password 密码
     * @param {string} suffix 后缀
     */
    updatePasswordStrength(password, suffix = '') {
        const strengthBar = document.querySelector(`#${suffix ? 'changePasswordModal' : 'passwordSetupModal'} .password-strength-fill`);
        const strengthText = document.querySelector(`#${suffix ? 'changePasswordModal' : 'passwordSetupModal'} .password-strength-text`);
        
        if (!strengthBar || !strengthText) return;
        
        const strength = this.cryptoUtils ? this.cryptoUtils.estimatePasswordStrength(password) : this.estimatePasswordStrength(password);
        
        // 更新进度条
        strengthBar.style.width = `${strength.score * 25}%`;
        strengthBar.className = `password-strength-fill strength-${strength.level}`;
        
        // 更新文本
        const levels = ['很弱', '弱', '中等', '强', '很强'];
        strengthText.textContent = `密码强度: ${levels[strength.score] || '很弱'}`;
    }

    /**
     * 更新密码匹配显示
     * @param {string} suffix 后缀
     */
    updatePasswordMatch(suffix = '') {
        const modal = suffix ? this.elements.changePasswordModal : this.elements.passwordModal;
        const newPassword = modal.querySelector(`#${suffix ? 'newPasswordChange' : 'newPassword'}`).value;
        const confirmPassword = modal.querySelector(`#${suffix ? 'confirmPasswordChange' : 'confirmPassword'}`).value;
        const indicator = modal.querySelector('.password-match-indicator');
        
        if (!indicator) return;
        
        if (confirmPassword === '') {
            indicator.textContent = '';
            indicator.className = 'password-match-indicator';
        } else if (newPassword === confirmPassword) {
            indicator.textContent = '✓ 密码匹配';
            indicator.className = 'password-match-indicator match';
        } else {
            indicator.textContent = '✗ 密码不匹配';
            indicator.className = 'password-match-indicator no-match';
        }
    }

    /**
     * 验证密码设置表单
     */
    validatePasswordSetup() {
        const modal = this.elements.passwordModal;
        const newPassword = modal.querySelector('#newPassword').value;
        const confirmPassword = modal.querySelector('#confirmPassword').value;
        const confirmButton = modal.querySelector('#confirmPasswordSetup');
        
        const isValid = newPassword.length >= 8 && 
                       newPassword === confirmPassword && 
                       confirmPassword !== '';
        
        confirmButton.disabled = !isValid;
    }

    /**
     * 验证密码修改表单
     */
    validatePasswordChange() {
        const modal = this.elements.changePasswordModal;
        const currentPassword = modal.querySelector('#currentPassword').value;
        const newPassword = modal.querySelector('#newPasswordChange').value;
        const confirmPassword = modal.querySelector('#confirmPasswordChange').value;
        const confirmButton = modal.querySelector('#confirmPasswordChange');
        
        const isValid = currentPassword !== '' && 
                       newPassword.length >= 8 && 
                       newPassword === confirmPassword && 
                       confirmPassword !== '' &&
                       newPassword !== currentPassword;
        
        confirmButton.disabled = !isValid;
    }

    /**
     * 切换密码可见性
     * @param {HTMLElement} button 切换按钮
     */
    togglePasswordVisibility(button) {
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);
        const icon = button.querySelector('.icon-eye');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = '🙈';
        } else {
            input.type = 'password';
            icon.textContent = '👁️';
        }
    }

    /**
     * 显示密码错误
     * @param {string} message 错误消息
     * @param {string} fieldId 字段ID
     */
    showPasswordError(message, fieldId = null) {
        let errorElement;
        
        if (fieldId) {
            const field = document.getElementById(fieldId);
            errorElement = field.closest('.password-field').querySelector('.password-error-message, .password-match-indicator');
        } else {
            errorElement = document.querySelector('.password-error-message');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.className = errorElement.className.replace(/\s*(error|no-match|match)\s*/g, '') + ' error';
        }
    }

    /**
     * 清除密码错误
     */
    clearPasswordError() {
        const errorElements = document.querySelectorAll('.password-error-message, .password-match-indicator.error');
        errorElements.forEach(element => {
            element.textContent = '';
            element.className = element.className.replace(/\s*error\s*/g, '');
        });
    }

    // ==================== 工具方法 ====================

    /**
     * 估算密码强度（简化版本）
     * @param {string} password 密码
     * @returns {Object} 强度信息
     */
    estimatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^\w\s]/.test(password)) score++;
        
        const levels = ['weak', 'weak', 'medium', 'strong', 'very-strong'];
        
        return {
            score: Math.min(score, 4),
            level: levels[Math.min(score, 4)]
        };
    }

    /**
     * 显示确认对话框
     * @param {string} title 标题
     * @param {string} message 消息
     * @param {string} confirmText 确认按钮文本
     * @param {string} type 类型
     * @returns {Promise<boolean>} 确认结果
     */
    async showConfirmDialog(title, message, confirmText = '确认', type = 'primary') {
        return new Promise((resolve) => {
            // 这里可以使用现有的CustomModal或创建新的确认对话框
            if (window.CustomModal) {
                window.CustomModal.showConfirm(message, title).then(resolve);
            } else {
                resolve(confirm(`${title}\n\n${message}`));
            }
        });
    }

    /**
     * 显示成功消息
     * @param {string} message 消息
     */
    showSuccessMessage(message) {
        // 这里可以使用toast或其他通知组件
        console.log('[PasswordManager] 成功:', message);
        
        // 简单的临时通知
        this.showTemporaryMessage(message, 'success');
    }

    /**
     * 显示错误消息
     * @param {string} message 消息
     */
    showErrorMessage(message) {
        console.error('[PasswordManager] 错误:', message);
        this.showTemporaryMessage(message, 'error');
    }

    /**
     * 显示临时消息
     * @param {string} message 消息
     * @param {string} type 类型
     */
    showTemporaryMessage(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `password-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 显示动画
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    /**
     * 清除所有数据
     */
    async clearAllData() {
        if (this.db) {
            // 清除数据库中的所有数据
            const stores = Object.values(this.db.stores);
            const transaction = this.db.db.transaction(stores, 'readwrite');
            
            for (const storeName of stores) {
                const store = transaction.objectStore(storeName);
                await this.db._promisifyRequest(store.clear());
            }
        }
        
        // 清除localStorage中的遗留数据
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('nav_') || key.includes('website') || key.includes('category')) {
                localStorage.removeItem(key);
            }
        });
    }

    /**
     * 分发事件
     * @param {string} eventName 事件名称
     * @param {Object} detail 事件详情
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * 检查是否已认证
     * @returns {boolean} 认证状态
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    /**
     * 检查是否需要密码
     * @returns {Promise<boolean>} 是否需要密码
     */
    async needsPassword() {
        if (!this.db) return false;
        return await this.db.hasPassword();
    }

    /**
     * 销毁密码管理器
     */
    destroy() {
        // 清除计时器
        this.clearSessionTimer();
        
        // 移除事件监听器
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        
        // 移除DOM元素
        Object.values(this.elements).forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        console.log('[PasswordManager] 密码管理器已销毁');
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PasswordManager;
} else {
    window.PasswordManager = PasswordManager;
}