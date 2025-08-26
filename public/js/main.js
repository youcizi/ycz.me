// 主要功能模块
class NavigationApp {
  constructor() {
    this.currentCategory = '全部';
    this.allWebsites = [];
    this.init();
  }

  // 初始化应用
  init() {
    this.bindEvents();
    this.initSidebarState();
    this.loadWebsites(this.currentCategory);
  }

  // 绑定事件
  bindEvents() {
    // 搜索功能
    const searchBox = document.getElementById('searchBox');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchBox) {
      searchBox.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
      searchBox.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSearch();
        }
      });
    }
    
    if (searchBtn) {
      searchBtn.addEventListener('click', this.handleSearch.bind(this));
    }

    // 分类切换
    const categoryItems = document.querySelectorAll('.nav-item');
    categoryItems.forEach(item => {
      item.addEventListener('click', this.handleCategoryChange.bind(this));
    });
    
    // 添加网站按钮事件
    const addWebsiteBtn = document.querySelector('.add-website-btn');
    if (addWebsiteBtn) {
      addWebsiteBtn.addEventListener('click', () => {
        this.handleAddWebsite();
      });
    }
    
    // Sidebar切换按钮事件
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', this.toggleSidebar.bind(this));
    }
  }

  // 防抖函数
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

  // 处理搜索
  async handleSearch() {
    const searchBox = document.getElementById('searchBox');
    const query = searchBox.value.trim();
    
    if (!query) {
      this.loadWebsites(this.currentCategory);
      return;
    }

    try {
      this.showLoading();
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        this.renderWebsites(data.data);
      } else {
        this.showError(data.message || '搜索失败');
      }
    } catch (error) {
      console.error('搜索错误:', error);
      this.showError('搜索服务暂时不可用');
    }
  }

  // 处理分类切换
  async handleCategoryChange(e) {
    e.preventDefault();
    const categoryName = e.currentTarget.dataset.category;
    
    if (categoryName === this.currentCategory) {
      return;
    }

    // 更新活跃状态
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    this.currentCategory = categoryName;
    
    // 清空搜索框
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
      searchBox.value = '';
    }
    
    await this.loadWebsites(categoryName);
  }

  // 加载网站数据
  async loadWebsites(category) {
    try {
      this.showLoading();
      const response = await fetch(`/api/websites/${encodeURIComponent(category)}`);
      const data = await response.json();
      
      if (data.success) {
        this.allWebsites = data.data;
        this.renderWebsites(data.data);
      } else {
        this.showError('加载失败');
      }
    } catch (error) {
      console.error('加载错误:', error);
      this.showError('网络连接失败');
    }
  }

  // 渲染网站列表
  renderWebsites(websites) {
    const container = document.getElementById('websitesContainer');
    if (!container) return;

    if (websites.length === 0) {
      this.showEmptyState();
      return;
    }

    const html = websites.map(website => `
      <div class="website-card" onclick="window.open('${website.url}', '_blank')">
        <div class="website-icon">${website.icon}</div>
        <div class="website-info">
          <h3 class="website-name">${this.escapeHtml(website.name)}</h3>
          <p class="website-description">${this.escapeHtml(website.description)}</p>
        </div>
        <div class="card-actions">
          <div class="action-icon edit-icon" onclick="event.stopPropagation(); handleEditWebsite('${this.escapeHtml(website.name)}');">✏️</div>
          <div class="action-icon delete-icon" onclick="event.stopPropagation(); handleDeleteWebsite('${this.escapeHtml(website.name)}');">🗑️</div>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
    
    // 添加卡片动画
    this.animateCards();
  }

  // 显示加载状态
  showLoading() {
    const container = document.getElementById('websitesContainer');
    if (container) {
      container.innerHTML = '<div class="loading">加载中...</div>';
    }
  }

  // 显示错误状态
  showError(message) {
    const container = document.getElementById('websitesContainer');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-text">出错了</div>
          <div class="empty-state-subtitle">${this.escapeHtml(message)}</div>
        </div>
      `;
    }
  }

  // 显示空状态
  showEmptyState() {
    const container = document.getElementById('websitesContainer');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-text">没有找到相关网站</div>
          <div class="empty-state-subtitle">试试其他关键词或浏览其他分类</div>
        </div>
      `;
    }
  }

  // 卡片动画
  animateCards() {
    const cards = document.querySelectorAll('.website-card');
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 50);
    });
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // 处理添加网站
  handleAddWebsite() {
    // 显示添加网站的提示
    utils.showToast('添加网站功能开发中，敬请期待！');
    
    // 这里可以添加打开添加网站对话框的逻辑
    // 例如：显示模态框让用户输入网站信息
    console.log('添加网站功能被点击');
   }
   
  // 切换侧边栏状态
  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
      
      // 保存状态到localStorage
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sidebarCollapsed', isCollapsed);
      
      console.log('Sidebar状态切换:', isCollapsed ? '收缩' : '展开');
    }
  }
  
  // 初始化侧边栏状态
  initSidebarState() {
    const sidebar = document.querySelector('.sidebar');
    const savedState = localStorage.getItem('sidebarCollapsed');
    
    if (sidebar && savedState === 'true') {
      sidebar.classList.add('collapsed');
    }
  }
}

// 处理编辑网站按钮点击
function handleEditWebsite(websiteName) {
    utils.showToast(`编辑网站 "${websiteName}" 功能开发中...`, 'info');
    console.log('编辑网站功能被点击:', websiteName);
}

// 处理删除网站按钮点击
function handleDeleteWebsite(websiteName) {
    if (confirm(`确定要删除网站 "${websiteName}" 吗？`)) {
        utils.showToast(`删除网站 "${websiteName}" 功能开发中...`, 'warning');
        console.log('删除网站功能被点击:', websiteName);
    }
}

// 工具函数
const utils = {
  // 平滑滚动到顶部
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  },

  // 复制到剪贴板
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
    }
  },

  // 显示提示消息
  showToast(message, duration = 3000) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 1000;
      font-size: 14px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 10);
    
    // 隐藏动画
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, duration);
  }
};

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new NavigationApp();
  
  // 添加一些额外的交互效果
  
  // 搜索框焦点效果
  const searchBox = document.getElementById('searchBox');
  if (searchBox) {
    searchBox.addEventListener('focus', () => {
      searchBox.parentElement.style.transform = 'scale(1.02)';
    });
    
    searchBox.addEventListener('blur', () => {
      searchBox.parentElement.style.transform = 'scale(1)';
    });
  }
  
  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (searchBox) {
        searchBox.focus();
      }
    }
    
    // ESC 清空搜索框
    if (e.key === 'Escape' && searchBox) {
      searchBox.value = '';
      searchBox.blur();
    }
  });
  
  console.log('导航网站已加载完成 🚀');
});