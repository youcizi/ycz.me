// 自定义弹窗组件
class CustomModal {
  constructor() {
    this.modal = null;
    this.currentResolve = null;
    this.init();
  }

  // 初始化弹窗
  init() {
    this.createModal();
    this.bindEvents();
  }

  // 创建弹窗HTML结构
  createModal() {
    const modalHTML = `
      <div class="custom-modal" id="customModal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-icon" id="modalIcon"></div>
            <h3 class="modal-title" id="modalTitle"></h3>
            <button class="modal-close" id="modalClose" aria-label="关闭">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-message" id="modalMessage"></div>
            <div class="modal-input-container" id="modalInputContainer" style="display: none;">
              <input type="text" class="modal-input" id="modalInput" placeholder="请输入...">
            </div>
            <div class="modal-loading" id="modalLoading" style="display: none;">
              <div class="loading-spinner"></div>
              <span class="loading-text">加载中...</span>
            </div>
          </div>
          <div class="modal-footer" id="modalFooter">
            <!-- 按钮将动态添加 -->
          </div>
        </div>
      </div>
    `;
    
    // 添加到body末尾
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('customModal');
  }

  // 绑定事件
  bindEvents() {
    // 点击遮罩层关闭弹窗
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide(false);
      }
    });

    // 点击关闭按钮
    document.getElementById('modalClose').addEventListener('click', () => {
      this.hide(false);
    });

    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('show')) {
        this.hide(false);
      }
    });

    // 输入框回车确认
    document.getElementById('modalInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.modal.classList.contains('show')) {
        this.hide(document.getElementById('modalInput').value);
      }
    });
  }

  // 显示弹窗
  show(options) {
    return new Promise((resolve) => {
      this.currentResolve = resolve;
      
      const {
        type = 'info',
        title = '提示',
        message = '',
        confirmText = '确定',
        cancelText = '取消',
        showCancel = false,
        showInput = false,
        inputPlaceholder = '请输入...',
        inputValue = '',
        showLoading = false,
        loadingText = '加载中...',
        allowHtml = false,
        autoClose = 0
      } = options;

      // 重置所有容器状态
      document.getElementById('modalInputContainer').style.display = 'none';
      document.getElementById('modalLoading').style.display = 'none';
      document.getElementById('modalFooter').style.display = showLoading ? 'none' : 'flex';

      // 设置图标
      const iconElement = document.getElementById('modalIcon');
      iconElement.className = `modal-icon ${type}`;
      iconElement.innerHTML = this.getIcon(type);

      // 设置标题
      document.getElementById('modalTitle').textContent = title;

      // 设置消息内容
      const messageElement = document.getElementById('modalMessage');
      if (allowHtml) {
        messageElement.innerHTML = message;
      } else {
        messageElement.textContent = message;
      }

      // 显示输入框
      if (showInput) {
        const inputContainer = document.getElementById('modalInputContainer');
        const input = document.getElementById('modalInput');
        inputContainer.style.display = 'block';
        input.placeholder = inputPlaceholder;
        input.value = inputValue;
        setTimeout(() => input.focus(), 100);
      }

      // 显示加载状态
      if (showLoading) {
        const loadingElement = document.getElementById('modalLoading');
        loadingElement.style.display = 'flex';
        loadingElement.querySelector('.loading-text').textContent = loadingText;
      }

      // 设置按钮
      if (!showLoading) {
        this.setButtons(confirmText, cancelText, showCancel);
      }

      // 显示弹窗
      this.modal.classList.add('show');
      document.body.style.overflow = 'hidden';

      // 自动关闭
      if (autoClose > 0) {
        setTimeout(() => {
          if (this.modal.classList.contains('show')) {
            this.hide(true);
          }
        }, autoClose);
      }
    });
  }

  // 隐藏弹窗
  hide(result = false) {
    // 添加hiding状态以触发退出动画
    this.modal.classList.add('hiding');
    this.modal.classList.remove('show');
    
    // 等待动画完成后完全隐藏
    setTimeout(() => {
      this.modal.classList.remove('hiding');
      document.body.style.overflow = '';
      
      if (this.currentResolve) {
        this.currentResolve(result);
        this.currentResolve = null;
      }
    }, 300); // 与CSS动画时间匹配
  }

  // 获取图标
  getIcon(type) {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅',
      confirm: '❓',
      loading: '⏳',
      input: '📝'
    };
    return icons[type] || icons.info;
  }

  // 设置按钮
  setButtons(confirmText, cancelText, showCancel) {
    const footer = document.getElementById('modalFooter');
    footer.innerHTML = '';

    if (showCancel) {
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'modal-btn secondary';
      cancelBtn.textContent = cancelText;
      cancelBtn.onclick = () => this.hide(false);
      footer.appendChild(cancelBtn);
    }

    const confirmBtn = document.createElement('button');
    confirmBtn.className = showCancel ? 'modal-btn primary' : 'modal-btn primary';
    confirmBtn.textContent = confirmText;
    confirmBtn.onclick = () => {
      const input = document.getElementById('modalInput');
      const result = input.style.display !== 'none' && input.offsetParent !== null ? input.value : true;
      this.hide(result);
    };
    footer.appendChild(confirmBtn);

    // 自动聚焦到确认按钮或输入框
    setTimeout(() => {
      const input = document.getElementById('modalInput');
      if (input.offsetParent !== null) {
        input.focus();
      } else {
        confirmBtn.focus();
      }
    }, 100);
  }

  // 静态方法：显示确认对话框
  static showConfirm(message, title = '确认', options = {}) {
    if (!window.customModal) {
      window.customModal = new CustomModal();
    }
    return window.customModal.show({
      type: 'confirm',
      title,
      message,
      showCancel: true,
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消'
    });
  }

  // 静态方法：显示信息提示
  static showAlert(message, title = '提示', type = 'info') {
    if (!window.customModal) {
      window.customModal = new CustomModal();
    }
    return window.customModal.show({
      type,
      title,
      message,
      showCancel: false,
      confirmText: '确定'
    });
  }

  // 静态方法：显示成功消息
  static showSuccess(message, title = '成功') {
    return CustomModal.showAlert(message, title, 'success');
  }

  // 静态方法：显示警告消息
  static showWarning(message, title = '警告') {
    return CustomModal.showAlert(message, title, 'warning');
  }

  // 静态方法：显示错误消息
  static showError(message, title = '错误') {
    return CustomModal.showAlert(message, title, 'error');
  }

  // 静态方法：显示输入框弹窗
  static showPrompt(message, title = '输入', defaultValue = '', placeholder = '请输入...') {
    if (!window.customModal) {
      window.customModal = new CustomModal();
    }
    return window.customModal.show({
      type: 'info',
      title,
      message,
      showCancel: true,
      showInput: true,
      inputPlaceholder: placeholder,
      inputValue: defaultValue,
      confirmText: '确定',
      cancelText: '取消'
    });
  }

  // 静态方法：显示加载弹窗
  static showLoading(message = '加载中...', title = '请稍候') {
    if (!window.customModal) {
      window.customModal = new CustomModal();
    }
    return window.customModal.show({
      type: 'info',
      title,
      message: '',
      showLoading: true,
      loadingText: message
    });
  }

  // 静态方法：隐藏当前弹窗
  static hide(result) {
    if (window.customModal) {
      window.customModal.hide(result);
    }
  }

  // 静态方法：显示HTML内容弹窗
  static showHtml(htmlContent, title = '提示', options = {}) {
    if (!window.customModal) {
      window.customModal = new CustomModal();
    }
    return window.customModal.show({
      type: options.type || 'info',
      title,
      message: htmlContent,
      allowHtml: true,
      showCancel: options.showCancel || false,
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      autoClose: options.autoClose || 0
    });
  }

  // 静态方法：显示自动关闭的提示
  static showAutoClose(message, title = '提示', duration = 3000, type = 'info') {
    if (!window.customModal) {
      window.customModal = new CustomModal();
    }
    return window.customModal.show({
      type,
      title,
      message,
      showCancel: false,
      confirmText: '确定',
      autoClose: duration
    });
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomModal;
} else {
  window.CustomModal = CustomModal;
}