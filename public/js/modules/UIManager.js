/**
 * UI管理模块
 * 负责用户界面状态管理和交互控制
 */
class UIManager {
    constructor() {
        this.modals = new Map();
        this.notifications = [];
        this.eventListeners = {};
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        this.isInitialized = false;
        this.activeModal = null;
        this.notificationContainer = null;
        this.init();
    }

    /**
     * 初始化UI管理器
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            this.setupModalEvents();
            this.setupGlobalEvents();
            this.createNotificationContainer();
            this.isInitialized = true;
            console.log('UIManager 初始化完成');
        } catch (error) {
            console.error('UIManager 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 设置模态框事件
     */
    setupModalEvents() {
        // 监听ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                e.preventDefault();
                this.closeModal(this.activeModal);
            }
        });

        // 点击遮罩层关闭模态框
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-backdrop')) {
                const modal = e.target.querySelector('.modal') || e.target.closest('.modal');
                if (modal && this.activeModal === modal) {
                    this.closeModal(modal);
                }
            }
        });
        
        // 监听模态框内的关闭按钮
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal-close, .btn-cancel, [data-dismiss="modal"]')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    e.preventDefault();
                    this.closeModal(modal);
                }
            }
        });
    }

    /**
     * 设置全局事件
     */
    setupGlobalEvents() {
        // 防止表单默认提交
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.modal-form, form[data-prevent-default]')) {
                e.preventDefault();
                this.handleFormSubmit(e.target, e);
            }
        });

        // 处理按钮点击
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button, .btn');
            if (button && !button.disabled && !button.classList.contains('disabled')) {
                this.handleButtonClick(button, e);
            }
        });
        
        // 处理输入框变化
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.handleInputChange(e.target, e);
            }
        });
    }

    /**
     * 显示模态框
     */
    showModal(modalId, options = {}) {
        try {
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error(`模态框未找到: ${modalId}`);
                return false;
            }

            // 关闭当前活动的模态框
            if (this.activeModal && this.activeModal !== modal) {
                this.closeModal(this.activeModal);
            }

            // 设置模态框样式和显示
            modal.style.display = 'flex';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.zIndex = '9999';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            
            modal.classList.add('show', 'active');
            document.body.classList.add('modal-open');
            
            // 设置为当前活动模态框
            this.activeModal = modal;
            
            // 添加到管理列表
            this.modals.set(modalId, {
                element: modal,
                options: options,
                isActive: true
            });

            // 聚焦到第一个输入框
            const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
            if (firstInput) {
                setTimeout(() => {
                    firstInput.focus();
                    if (firstInput.select) {
                        firstInput.select();
                    }
                }, 150);
            }

            console.log(`模态框已显示: ${modalId}`);
            
            // 触发显示事件
            this.emit('modalShown', { modalId, modal, options });
            
            return true;
        } catch (error) {
            console.error(`显示模态框失败 ${modalId}:`, error);
            return false;
        }
    }

    /**
     * 关闭模态框
     */
    closeModal(modalOrId) {
        try {
            let modal, modalId;
            
            if (typeof modalOrId === 'string') {
                modalId = modalOrId;
                modal = document.getElementById(modalId);
            } else {
                modal = modalOrId;
                modalId = modal ? modal.id : null;
            }
            
            if (!modal) {
                console.warn('要关闭的模态框不存在:', modalOrId);
                return false;
            }
            
            // 隐藏模态框
            modal.style.display = 'none';
            modal.classList.remove('show', 'active');
            document.body.classList.remove('modal-open');
            
            // 清除活动状态
            if (this.activeModal === modal) {
                this.activeModal = null;
            }
            
            // 从管理列表中移除
            if (modalId && this.modals.has(modalId)) {
                this.modals.delete(modalId);
            }
            
            // 清除表单数据
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
            
            console.log(`模态框已关闭: ${modalId || 'unknown'}`);
            
            // 触发关闭事件
            this.emit('modalClosed', { modalId, modal });
            
            return true;
        } catch (error) {
            console.error('关闭模态框失败:', error);
            return false;
        }
    }

    /**
     * 关闭所有模态框
     */
    closeAllModals() {
        try {
            const modalIds = Array.from(this.modals.keys());
            modalIds.forEach(modalId => {
                this.closeModal(modalId);
            });
            
            // 清除活动状态
            this.activeModal = null;
            document.body.classList.remove('modal-open');
            
            console.log('所有模态框已关闭');
            
            // 触发事件
            this.emit('allModalsClosed');
            
            return true;
        } catch (error) {
            console.error('关闭所有模态框失败:', error);
            return false;
        }
    }

    /**
     * 检查模态框是否打开
     */
    isModalOpen(modalId) {
        if (!modalId) {
            return this.activeModal !== null;
        }
        
        const modalData = this.modals.get(modalId);
        return modalData && modalData.isActive;
    }

    /**
     * 检查是否有任何模态框打开
     */
    hasOpenModal() {
        return Object.values(this.modals).some(isOpen => isOpen);
    }

    /**
     * 获取所有模态框状态
     */
    getModalStates() {
        return { ...this.modals };
    }

    /**
     * 创建通知容器
     */
    createNotificationContainer() {
        if (this.notificationContainer) {
            return this.notificationContainer;
        }
        
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        
        this.notificationContainer = container;
        return container;
    }

    /**
     * 显示图标选择器
     */
    showIconSelector(type, callback) {
        this.iconSelectorContext = {
            type: type, // 'category' or 'website'
            callback: callback
        };
        
        this.showModal('iconSelector');
    }

    /**
     * 选择图标
     */
    selectIcon(icon) {
        if (this.iconSelectorContext.callback) {
            this.iconSelectorContext.callback(icon);
        }
        
        this.closeModal('iconSelector');
    }

    /**
     * 聚焦到第一个输入框
     */
    focusFirstInput(modalName) {
        const modalElement = document.querySelector(`[data-modal="${modalName}"]`);
        if (modalElement) {
            const firstInput = modalElement.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    /**
     * 设置加载状态
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
        this.emit('loadingStateChanged', isLoading);
    }

    /**
     * 获取加载状态
     */
    getLoading() {
        return this.isLoading;
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info', duration = 3000) {
        try {
            const container = this.createNotificationContainer();
            
            const notification = document.createElement('div');
            const notificationId = 'notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            notification.id = notificationId;
            
            // 设置通知样式
            const typeColors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };
            
            notification.style.cssText = `
                background: ${typeColors[type] || typeColors.info};
                color: white;
                padding: 12px 16px;
                margin-bottom: 10px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                pointer-events: auto;
                cursor: pointer;
                transition: all 0.3s ease;
                transform: translateX(100%);
                opacity: 0;
            `;
            
            notification.textContent = message;
            container.appendChild(notification);
            
            // 添加到通知列表
            this.notifications.push({
                id: notificationId,
                element: notification,
                type: type,
                message: message,
                timestamp: Date.now()
            });
            
            // 动画显示
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
                notification.style.opacity = '1';
            }, 10);
            
            // 点击关闭
            notification.addEventListener('click', () => {
                this.removeNotification(notificationId);
            });
            
            // 自动关闭
            if (duration > 0) {
                setTimeout(() => {
                    this.removeNotification(notificationId);
                }, duration);
            }
            
            console.log(`通知已显示: ${type} - ${message}`);
            
            // 触发事件
            this.emit('notificationShown', { id: notificationId, type, message });
            
            return notificationId;
        } catch (error) {
            console.error('显示通知失败:', error);
            return null;
        }
    }

    /**
     * 移除通知
     */
    removeNotification(notificationId) {
        try {
            const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex === -1) {
                console.warn('要移除的通知不存在:', notificationId);
                return false;
            }
            
            const notificationData = this.notifications[notificationIndex];
            const element = notificationData.element;
            
            if (element && element.parentNode) {
                // 动画隐藏
                element.style.transform = 'translateX(100%)';
                element.style.opacity = '0';
                
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                }, 300);
            }
            
            // 从列表中移除
            this.notifications.splice(notificationIndex, 1);
            
            console.log(`通知已移除: ${notificationId}`);
            
            // 触发事件
            this.emit('notificationRemoved', { id: notificationId, data: notificationData });
            
            return true;
        } catch (error) {
            console.error('移除通知失败:', error);
            return false;
        }
    }

    /**
     * 清除所有通知
     */
    clearAllNotifications() {
        try {
            const notificationIds = this.notifications.map(n => n.id);
            notificationIds.forEach(id => {
                this.removeNotification(id);
            });
            
            // 清空容器
            if (this.notificationContainer) {
                this.notificationContainer.innerHTML = '';
            }
            
            this.notifications = [];
            
            console.log('所有通知已清除');
            
            // 触发事件
            this.emit('allNotificationsCleared');
            
            return true;
        } catch (error) {
            console.error('清除所有通知失败:', error);
            return false;
        }
    }

    /**
     * 获取所有通知
     */
    getNotifications() {
        return [...this.notifications];
    }

    /**
     * 清除所有通知
     */
    clearAllNotifications() {
        try {
            // 移除所有通知元素
            this.notifications.forEach(notification => {
                if (notification.element && notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
            });
            
            // 清空通知数组
            this.notifications = [];
            
            console.log('所有通知已清除');
            
            // 触发事件
            this.emit('allNotificationsCleared');
            
            return true;
        } catch (error) {
            console.error('清除所有通知失败:', error);
            return false;
        }
    }

    /**
     * 显示确认对话框
     */
    showConfirm(message, title = '确认操作') {
        return new Promise((resolve) => {
            const confirmed = confirm(`${title}\n\n${message}`);
            resolve(confirmed);
        });
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        this.showNotification(message, 'error', 5000);
    }

    /**
     * 显示警告消息
     */
    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    /**
     * 显示信息消息
     */
    showInfo(message) {
        this.showNotification(message, 'info');
    }

    /**
     * 处理按钮点击事件
     */
    handleButtonClick(button, event) {
        try {
            const action = button.dataset.action;
            const modalTarget = button.dataset.modal;
            const closeModal = button.dataset.closeModal;
            
            // 处理模态框打开
            if (modalTarget) {
                event.preventDefault();
                this.showModal(modalTarget);
                return;
            }
            
            // 处理模态框关闭
            if (closeModal) {
                event.preventDefault();
                if (closeModal === 'all') {
                    this.closeAllModals();
                } else {
                    this.closeModal(closeModal);
                }
                return;
            }
            
            // 处理特定动作
            if (action) {
                this.emit('buttonClick', {
                    action: action,
                    button: button,
                    event: event
                });
            }
            
            console.log('按钮点击处理完成:', button.className || button.id || 'unknown');
        } catch (error) {
            console.error('处理按钮点击失败:', error);
        }
    }
    
    /**
     * 处理输入框变化事件
     */
    handleInputChange(input, event) {
        try {
            const inputType = input.type;
            const inputName = input.name;
            const inputValue = input.value;
            
            // 触发输入变化事件
            this.emit('inputChange', {
                type: inputType,
                name: inputName,
                value: inputValue,
                input: input,
                event: event
            });
            
            // 处理实时搜索
            if (input.dataset.search) {
                const searchTerm = inputValue.trim();
                this.emit('search', {
                    term: searchTerm,
                    input: input,
                    event: event
                });
            }
            
            console.log('输入框变化处理完成:', inputName || input.id || 'unknown');
        } catch (error) {
            console.error('处理输入框变化失败:', error);
        }
    }

    /**
     * 设置加载状态
     */
    setLoading(isLoading) {
        try {
            const loadingElements = document.querySelectorAll('.loading, [data-loading]');
            const submitButtons = document.querySelectorAll('button[type="submit"], .submit-btn');
            
            if (isLoading) {
                // 显示加载状态
                loadingElements.forEach(el => {
                    el.style.display = 'block';
                    el.classList.add('active');
                });
                
                // 禁用提交按钮
                submitButtons.forEach(btn => {
                    btn.disabled = true;
                    btn.classList.add('loading');
                    if (btn.dataset.originalText === undefined) {
                        btn.dataset.originalText = btn.textContent;
                    }
                    btn.textContent = '处理中...';
                });
                
                document.body.classList.add('loading');
            } else {
                // 隐藏加载状态
                loadingElements.forEach(el => {
                    el.style.display = 'none';
                    el.classList.remove('active');
                });
                
                // 恢复提交按钮
                submitButtons.forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('loading');
                    if (btn.dataset.originalText) {
                        btn.textContent = btn.dataset.originalText;
                        delete btn.dataset.originalText;
                    }
                });
                
                document.body.classList.remove('loading');
            }
            
            console.log('加载状态已设置:', isLoading);
        } catch (error) {
            console.error('设置加载状态失败:', error);
        }
    }

    /**
     * 处理表单提交
     */
    async handleFormSubmit(formElement, submitHandler) {
        if (!formElement || !submitHandler) return false;
        
        try {
            this.setLoading(true);
            
            // 获取表单数据
            const formData = new FormData(formElement);
            const data = Object.fromEntries(formData.entries());
            
            // 调用提交处理器
            await submitHandler(data);
            
            return true;
        } catch (error) {
            this.showError(error.message || '操作失败');
            return false;
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 事件监听
     */
    on(event, callback) {
        if (!event || typeof event !== 'string') {
            console.warn('事件名称必须是非空字符串');
            return false;
        }
        
        if (!callback || typeof callback !== 'function') {
            console.warn('回调函数必须是函数类型');
            return false;
        }
        
        if (!this.eventListeners.has) {
            this.eventListeners = new Map();
        }
        
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        
        this.eventListeners.get(event).push(callback);
        console.log(`事件监听器已添加: ${event}`);
        
        return true;
    }

    /**
     * 移除事件监听
     */
    off(event, callback) {
        if (!event || typeof event !== 'string') {
            console.warn('事件名称必须是非空字符串');
            return false;
        }
        
        if (!this.eventListeners.has) {
            this.eventListeners = new Map();
        }
        
        if (!this.eventListeners.has(event)) {
            return false;
        }
        
        const listeners = this.eventListeners.get(event);
        
        if (callback) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
                console.log(`事件监听器已移除: ${event}`);
                return true;
            }
        } else {
            // 移除所有监听器
            this.eventListeners.set(event, []);
            console.log(`所有事件监听器已移除: ${event}`);
            return true;
        }
        
        return false;
    }

    /**
     * 触发事件
     */
    emit(event, data) {
        if (!event || typeof event !== 'string') {
            console.warn('事件名称必须是非空字符串');
            return false;
        }
        
        if (!this.eventListeners.has) {
            this.eventListeners = new Map();
        }
        
        if (!this.eventListeners.has(event)) {
            return false;
        }
        
        const listeners = this.eventListeners.get(event);
        if (listeners.length === 0) {
            return false;
        }
        
        let successCount = 0;
        listeners.forEach((callback, index) => {
            try {
                callback(data);
                successCount++;
            } catch (error) {
                console.error(`事件回调执行失败 [${event}][${index}]:`, error);
            }
        });
        
        console.log(`事件已触发: ${event}, 成功执行 ${successCount}/${listeners.length} 个监听器`);
        
        return successCount > 0;
    }

    /**
     * 销毁管理器
     */
    destroy() {
        try {
            console.log('正在销毁UI管理器...');
            
            // 关闭所有模态框
            this.closeAllModals();
            
            // 清除所有通知
            this.clearAllNotifications();
            
            // 移除通知容器
            if (this.notificationContainer && this.notificationContainer.parentNode) {
                this.notificationContainer.parentNode.removeChild(this.notificationContainer);
                this.notificationContainer = null;
            }
            
            // 清除事件监听器
            if (this.eventListeners) {
                this.eventListeners.clear();
            }
            
            // 重置状态
            this.isInitialized = false;
            this.activeModal = null;
            this.modals.clear();
            this.notifications = [];
            
            console.log('UI管理器已销毁');
            
            return true;
        } catch (error) {
            console.error('销毁UI管理器失败:', error);
            return false;
        }
    }
}

// 导出类和单例实例
export default UIManager;
export const uiManager = new UIManager();