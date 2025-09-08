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
          </div>
          <div class="modal-body">
            <p class="modal-message" id="modalMessage"></p>
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

    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('show')) {
        this.hide(false);
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
        showCancel = false
      } = options;

      // 设置图标
      const iconElement = document.getElementById('modalIcon');
      iconElement.className = `modal-icon ${type}`;
      iconElement.innerHTML = this.getIcon(type);

      // 设置标题和消息
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalMessage').textContent = message;

      // 设置按钮
      this.setButtons(confirmText, cancelText, showCancel);

      // 显示弹窗
      this.modal.classList.add('show');
      document.body.style.overflow = 'hidden';
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
      confirm: '❓'
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
    confirmBtn.onclick = () => this.hide(true);
    footer.appendChild(confirmBtn);

    // 自动聚焦到确认按钮
    setTimeout(() => confirmBtn.focus(), 100);
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
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomModal;
} else {
  window.CustomModal = CustomModal;
}