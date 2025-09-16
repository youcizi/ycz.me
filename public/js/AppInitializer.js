/**
 * 应用初始化模块
 * 负责应用的初始化和全局事件绑定
 */

// 全局图标选择器实例
let emojiIconPicker = null;

// 显示图标选择器
function showIconPicker(targetInputId) {
  if (!emojiIconPicker) {
    // 如果还没有初始化，先初始化
    initEmojiIconPickerGlobal();
  }
  emojiIconPicker.showIconPicker(targetInputId);
}

// 全局初始化图标选择器函数
function initEmojiIconPickerGlobal() {
  if (!emojiIconPicker) {
    emojiIconPicker = new EmojiIconPicker();
    window.emojiIconPicker = emojiIconPicker;
  }
}

// 隐藏图标选择器
function hideIconPicker() {
  if (emojiIconPicker) {
    emojiIconPicker.hideIconPicker();
  }
}

/**
 * 应用初始化器类
 */
class AppInitializer {
  constructor() {
    this.navigationApp = null;
  }

  /**
   * 初始化应用
   */
  init() {
    this.initEmojiIconPicker();
    this.bindIconInputEvents();
    this.initNavigationApp();
  }

  /**
   * 初始化图标选择器
   */
  initEmojiIconPicker() {
    initEmojiIconPickerGlobal();
  }

  /**
   * 为图标输入框绑定事件
   */
  bindIconInputEvents() {
    const iconInputs = document.querySelectorAll('.icon-input');
    iconInputs.forEach(input => {
      input.addEventListener('click', function() {
        showIconPicker(this.id);
      });
      
      // 添加焦点事件，当输入框获得焦点时也显示图标选择器
      input.addEventListener('focus', function() {
        showIconPicker(this.id);
      });
      
      // 允许用户手动输入图标，不设置readonly属性
      input.style.cursor = 'text';
    });
  }

  /**
   * 初始化主应用
   */
  initNavigationApp() {
    this.navigationApp = new NavigationApp();
    window.navigationApp = this.navigationApp;
  }

  /**
   * 获取导航应用实例
   */
  getNavigationApp() {
    return this.navigationApp;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  const appInitializer = new AppInitializer();
  appInitializer.init();
  
  // 将初始化器实例暴露到全局
  window.appInitializer = appInitializer;
});

// 导出全局函数供其他模块使用
window.showIconPicker = showIconPicker;
window.hideIconPicker = hideIconPicker;