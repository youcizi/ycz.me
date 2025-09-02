// 主要功能模块
class NavigationApp {
  constructor() {
    this.currentCategory = '全部';
    this.currentFilter = 'all';
    this.allWebsites = [];
    this.filteredWebsites = [];
    this.cacheKeys = {
      categories: 'nav_categories',
      websites: 'nav_websites',
      timestamp: 'nav_cache_timestamp'
    };
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24小时过期
    this.init();
  }

  // 初始化应用
  init() {
    this.bindEvents();
    this.initSidebarState();
    this.loadInitialData();
  }

  // 缓存管理模块
  // 检查缓存是否有效
  isCacheValid() {
    const timestamp = localStorage.getItem(this.cacheKeys.timestamp);
    if (!timestamp) return false;
    
    const cacheTime = parseInt(timestamp);
    const now = Date.now();
    return (now - cacheTime) < this.cacheExpiry;
  }

  // 获取缓存的分类数据
  getCachedCategories() {
    try {
      const data = localStorage.getItem(this.cacheKeys.categories);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('读取分类缓存失败:', error);
      return null;
    }
  }

  // 获取缓存的网站数据
  getCachedWebsites(category = null) {
    try {
      const data = localStorage.getItem(this.cacheKeys.websites);
      if (!data) return null;
      
      const websites = JSON.parse(data);
      if (category && category !== '全部') {
        return websites.filter(site => site.category === category);
      }
      return websites;
    } catch (error) {
      console.error('读取网站缓存失败:', error);
      return null;
    }
  }

  // 缓存分类数据
  setCachedCategories(categories) {
    try {
      localStorage.setItem(this.cacheKeys.categories, JSON.stringify(categories));
      localStorage.setItem(this.cacheKeys.timestamp, Date.now().toString());
    } catch (error) {
      console.error('缓存分类数据失败:', error);
    }
  }

  // 缓存网站数据
  setCachedWebsites(websites) {
    try {
      localStorage.setItem(this.cacheKeys.websites, JSON.stringify(websites));
      localStorage.setItem(this.cacheKeys.timestamp, Date.now().toString());
    } catch (error) {
      console.error('缓存网站数据失败:', error);
    }
  }

  // 清除所有缓存
  clearCache() {
    try {
      localStorage.removeItem(this.cacheKeys.categories);
      localStorage.removeItem(this.cacheKeys.websites);
      localStorage.removeItem(this.cacheKeys.timestamp);
      console.log('缓存已清除');
    } catch (error) {
      console.error('清除缓存失败:', error);
    }
  }

  // 更新缓存中的单个网站
  updateCachedWebsite(websiteData, originalName = null) {
    try {
      const cachedWebsites = this.getCachedWebsites() || [];
      let updated = false;
      
      if (originalName) {
        // 编辑模式：更新现有网站
        const index = cachedWebsites.findIndex(site => site.name === originalName);
        if (index !== -1) {
          cachedWebsites[index] = websiteData;
          updated = true;
        }
      } else {
        // 添加模式：检查是否已存在
        const existingIndex = cachedWebsites.findIndex(site => site.name === websiteData.name);
        if (existingIndex !== -1) {
          cachedWebsites[existingIndex] = websiteData;
        } else {
          cachedWebsites.push(websiteData);
        }
        updated = true;
      }
      
      if (updated) {
        this.setCachedWebsites(cachedWebsites);
      }
    } catch (error) {
      console.error('更新网站缓存失败:', error);
    }
  }

  // 从缓存中删除网站
  removeCachedWebsite(websiteName) {
    try {
      const cachedWebsites = this.getCachedWebsites() || [];
      const filteredWebsites = cachedWebsites.filter(site => site.name !== websiteName);
      this.setCachedWebsites(filteredWebsites);
    } catch (error) {
      console.error('删除网站缓存失败:', error);
    }
  }

  // 加载初始数据（优先使用缓存）
  async loadInitialData() {
    // 检查缓存是否有效
    if (this.isCacheValid()) {
      const cachedWebsites = this.getCachedWebsites(this.currentCategory);
      if (cachedWebsites) {
        console.log('使用缓存数据');
        this.allWebsites = cachedWebsites;
        this.applyFilter(); // 应用当前筛选
        return;
      }
    }
    
    // 缓存无效或不存在，从服务器加载
    console.log('从服务器加载数据');
    await this.loadWebsitesFromServer(this.currentCategory);
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
    
    // 筛选按钮事件
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', this.handleFilterChange.bind(this));
    });
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
  handleSearch() {
    const searchBox = document.getElementById('searchBox');
    const query = searchBox.value.trim().toLowerCase();
    
    if (!query) {
      // 如果搜索框为空，应用当前筛选显示网站
      this.applyFilter();
      return;
    }
    
    // 先应用筛选，再在筛选结果中搜索
    let searchBase = [...this.allWebsites];
    if (this.currentFilter !== 'all') {
      searchBase = this.allWebsites.filter(website => {
        const priceType = website.priceType || 'free';
        return priceType === this.currentFilter;
      });
    }
    
    const filteredWebsites = searchBase.filter(website => {
      return website.name.toLowerCase().includes(query) ||
             website.description.toLowerCase().includes(query) ||
             (website.tags && website.tags.some(tag => tag.toLowerCase().includes(query)));
    });
    
    this.renderWebsites(filteredWebsites);
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

  // 处理筛选切换
  handleFilterChange(e) {
    e.preventDefault();
    const filterType = e.currentTarget.dataset.filter;
    
    if (filterType === this.currentFilter) {
      return;
    }

    // 更新筛选按钮活跃状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    this.currentFilter = filterType;
    
    // 应用筛选
    this.applyFilter();
  }

  // 应用筛选逻辑
  applyFilter() {
    let filteredWebsites = [...this.allWebsites];
    
    if (this.currentFilter !== 'all') {
      filteredWebsites = this.allWebsites.filter(website => {
        const priceType = website.priceType || 'free'; // 默认为免费
        return priceType === this.currentFilter;
      });
    }
    
    this.filteredWebsites = filteredWebsites;
    this.renderWebsites(filteredWebsites);
  }

  // 从服务器加载网站数据并缓存
  async loadWebsitesFromServer(category) {
    try {
      this.showLoading();
      const response = await fetch(`/api/websites/${encodeURIComponent(category)}`);
      const data = await response.json();
      
      if (data.success) {
        this.allWebsites = data.data;
        this.applyFilter(); // 应用当前筛选
        
        // 缓存数据到localStorage
        if (category === '全部') {
          // 如果是加载全部数据，直接缓存
          this.setCachedWebsites(data.data);
        } else {
          // 如果是特定分类，需要合并到现有缓存中
          this.mergeCategoryData(category, data.data);
        }
      } else {
        this.showError('加载失败');
      }
    } catch (error) {
      console.error('加载错误:', error);
      this.showError('网络连接失败');
    }
  }

  // 合并分类数据到缓存
  mergeCategoryData(category, newData) {
    try {
      const cachedWebsites = this.getCachedWebsites() || [];
      
      // 移除该分类的旧数据
      const filteredWebsites = cachedWebsites.filter(site => site.category !== category);
      
      // 添加新数据
      const updatedWebsites = [...filteredWebsites, ...newData];
      
      // 更新缓存
      this.setCachedWebsites(updatedWebsites);
    } catch (error) {
      console.error('合并分类数据失败:', error);
    }
  }

  // 加载网站数据（优先使用缓存）
  async loadWebsites(category) {
    // 检查缓存是否有效
    if (this.isCacheValid()) {
      const cachedWebsites = this.getCachedWebsites(category);
      if (cachedWebsites && cachedWebsites.length > 0) {
        console.log(`使用缓存数据加载分类: ${category}`);
        this.allWebsites = cachedWebsites;
        this.applyFilter(); // 应用当前筛选
        return;
      }
    }
    
    // 缓存无效或不存在，从服务器加载
    console.log(`从服务器加载分类: ${category}`);
    await this.loadWebsitesFromServer(category);
  }

  // 渲染网站列表
  renderWebsites(websites) {
    const container = document.getElementById('websitesContainer');
    if (!container) return;

    if (websites.length === 0) {
      this.showEmptyState();
      return;
    }

    const html = websites.map(website => {
      // 获取价格类型标签信息
      const priceTypeInfo = this.getPriceTypeInfo(website.priceType || 'free');
      
      return `
        <div class="website-card" onclick="window.open('${website.url}', '_blank')">
          <div class="website-icon">${website.icon}</div>
          <div class="website-info">
            <h3 class="website-name">${this.escapeHtml(website.name)}</h3>
            <p class="website-description">${this.escapeHtml(website.description)}</p>
          </div>
          <div class="price-tag ${priceTypeInfo.class}">${priceTypeInfo.label}</div>
          <div class="card-actions">
            <div class="action-icon edit-icon" onclick="event.stopPropagation(); handleEditWebsite('${this.escapeHtml(website.name)}');">✏️</div>
            <div class="action-icon delete-icon" onclick="event.stopPropagation(); handleDeleteWebsite('${this.escapeHtml(website.name)}');">🗑️</div>
          </div>
        </div>
      `;
    }).join('');

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

  // 获取价格类型标签信息
  getPriceTypeInfo(priceType) {
    const priceTypes = {
      'free': { label: '免费', class: 'price-free' },
      'paid': { label: '付费', class: 'price-paid' },
      'trial': { label: '试用', class: 'price-trial' },
      'points': { label: '送积分', class: 'price-points' }
    };
    
    return priceTypes[priceType] || priceTypes['free'];
  }
  
  // 处理添加网站
  handleAddWebsite() {
    showAddWebsiteModal();
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
    // 调用showAddWebsiteModal并传入编辑模式参数
    showAddWebsiteModal(true, websiteName);
    console.log('编辑网站功能被点击:', websiteName);
}

// 处理删除网站按钮点击
async function handleDeleteWebsite(websiteName) {
    if (confirm(`确定要删除网站 "${websiteName}" 吗？`)) {
        try {
            const response = await fetch(`/api/websites/${encodeURIComponent(websiteName)}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            
            if (result.success) {
                utils.showToast(`网站 "${websiteName}" 删除成功！`, 'success');
                
                // 更新缓存
                const app = window.navigationApp;
                if (app) {
                    app.removeCachedWebsite(websiteName);
                }
                
                // 刷新页面
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                utils.showToast(result.message || '删除网站失败', 'error');
            }
        } catch (error) {
            console.error('删除网站错误:', error);
            utils.showToast('删除网站失败，请稍后重试', 'error');
        }
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
  window.navigationApp = new NavigationApp();
  
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
  
  // 添加全局缓存管理函数
  window.cacheManager = {
    // 清除所有缓存
    clear: () => {
      if (window.navigationApp) {
        window.navigationApp.clearCache();
        utils.showToast('缓存已清除，页面将刷新', 'info');
        setTimeout(() => window.location.reload(), 1000);
      }
    },
    
    // 查看缓存状态
    status: () => {
      if (window.navigationApp) {
        const app = window.navigationApp;
        const isValid = app.isCacheValid();
        const categories = app.getCachedCategories();
        const websites = app.getCachedWebsites();
        
        console.log('缓存状态:', {
          valid: isValid,
          categoriesCount: categories ? categories.length : 0,
          websitesCount: websites ? websites.length : 0,
          timestamp: localStorage.getItem(app.cacheKeys.timestamp)
        });
        
        return {
          valid: isValid,
          categories: categories,
          websites: websites
        };
      }
    },
    
    // 强制刷新数据
    refresh: () => {
      if (window.navigationApp) {
        window.navigationApp.clearCache();
        window.navigationApp.loadWebsitesFromServer('全部');
        utils.showToast('正在刷新数据...', 'info');
      }
    }
  };
  
  console.log('缓存管理器已加载，可使用 cacheManager.clear()、cacheManager.status()、cacheManager.refresh()');
});

// 分类管理功能
// 显示添加分类弹窗
function showAddCategoryModal() {
  const modal = document.getElementById('addCategoryModal');
  if (modal) {
    modal.style.display = 'flex';
    // 清空表单
    const form = document.getElementById('addCategoryForm');
    if (form) {
      form.reset();
    }
    // 聚焦到分类名称输入框
    const nameInput = document.getElementById('categoryName');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 100);
    }
  }
}

// 隐藏添加分类弹窗
function hideAddCategoryModal() {
  const modal = document.getElementById('addCategoryModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 编辑分类
function editCategory(categoryName) {
  utils.showToast(`编辑分类 "${categoryName}" 功能开发中...`, 'info');
  console.log('编辑分类功能被点击:', categoryName);
  // 这里可以添加编辑分类的逻辑
  // 例如：显示编辑对话框，预填充当前分类信息
}

// 删除分类
function deleteCategory(categoryName) {
  if (confirm(`确定要删除分类 "${categoryName}" 吗？\n删除后该分类下的所有网站也将被移除。`)) {
    utils.showToast(`删除分类 "${categoryName}" 功能开发中...`, 'warning');
    console.log('删除分类功能被点击:', categoryName);
    // 这里可以添加删除分类的逻辑
    // 例如：发送删除请求到后端API
  }
}

// 网站管理功能
// 显示添加网站弹窗
function showAddWebsiteModal(isEditMode = false, websiteName = null) {
  const modal = document.getElementById('addWebsiteModal');
  if (modal) {
    modal.style.display = 'flex';
    
    // 设置弹窗标题
    const modalTitle = modal.querySelector('.modal-header h3');
    if (modalTitle) {
      modalTitle.textContent = isEditMode ? '编辑网站' : '添加网站';
    }
    
    // 设置提交按钮文字
    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = isEditMode ? '保存' : '添加';
    }
    
    // 清空表单
    const form = document.getElementById('addWebsiteForm');
    if (form) {
      form.reset();
      // 设置表单的编辑模式标识
      form.dataset.editMode = isEditMode;
      form.dataset.originalName = websiteName || '';
    }
    
    if (isEditMode && websiteName) {
      // 编辑模式：获取网站详细信息并预填充表单
      fetchWebsiteDetails(websiteName);
    } else {
      // 添加模式：聚焦到网站名称输入框
      const nameInput = document.getElementById('websiteName');
      if (nameInput) {
        setTimeout(() => nameInput.focus(), 100);
      }
    }
  }
}

// 隐藏添加网站弹窗
function hideAddWebsiteModal() {
  const modal = document.getElementById('addWebsiteModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 获取网站详细信息用于编辑
async function fetchWebsiteDetails(websiteName) {
  try {
    const response = await fetch(`/api/website/${encodeURIComponent(websiteName)}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const website = result.data;
      // 预填充表单数据
      document.getElementById('websiteName').value = website.name || '';
      document.getElementById('websiteDescription').value = website.description || '';
      document.getElementById('websiteUrl').value = website.url || '';
      document.getElementById('websiteIcon').value = website.icon || '';
      document.getElementById('websiteCategory').value = website.category || '';
      document.getElementById('websitePriceType').value = website.priceType || 'free';
      
      // 聚焦到网站名称输入框
      setTimeout(() => document.getElementById('websiteName').focus(), 100);
    } else {
      utils.showToast('获取网站信息失败', 'error');
    }
  } catch (error) {
    console.error('获取网站详细信息错误:', error);
    utils.showToast('获取网站信息失败，请稍后重试', 'error');
  }
}

// 处理添加分类表单提交
document.addEventListener('DOMContentLoaded', () => {
  const addCategoryForm = document.getElementById('addCategoryForm');
  if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData(addCategoryForm);
      const categoryName = formData.get('categoryName').trim();
      const categoryIcon = formData.get('categoryIcon').trim();
      
      if (!categoryName || !categoryIcon) {
        utils.showToast('请填写完整的分类信息', 'warning');
        return;
      }
      
      // 这里可以添加提交到后端的逻辑
      utils.showToast(`添加分类 "${categoryName}" 功能开发中...`, 'info');
      console.log('添加分类:', { name: categoryName, icon: categoryIcon });
      
      // 关闭弹窗
      hideAddCategoryModal();
    });
  }
  
  // 处理添加网站表单提交
  const addWebsiteForm = document.getElementById('addWebsiteForm');
  if (addWebsiteForm) {
    addWebsiteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(addWebsiteForm);
      const websiteData = {
        name: formData.get('websiteName'),
        description: formData.get('websiteDescription'),
        url: formData.get('websiteUrl'),
        icon: formData.get('websiteIcon'),
        category: formData.get('websiteCategory'),
        priceType: formData.get('websitePriceType')
      };
      
      if (websiteData.name && websiteData.url && websiteData.category) {
        try {
          const isEditMode = addWebsiteForm.dataset.editMode === 'true';
          const originalName = addWebsiteForm.dataset.originalName;
          
          let response;
          if (isEditMode) {
            // 编辑模式：使用PUT请求
            response = await fetch(`/api/websites/${encodeURIComponent(originalName)}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(websiteData)
            });
          } else {
            // 添加模式：使用POST请求
            response = await fetch('/api/websites', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(websiteData)
            });
          }
          
          const result = await response.json();
          
          if (result.success) {
            const action = isEditMode ? '更新' : '添加';
            utils.showToast(`网站 "${websiteData.name}" ${action}成功！`, 'success');
            
            // 更新缓存
            const app = window.navigationApp;
            if (app) {
              if (isEditMode) {
                app.updateCachedWebsite(websiteData, originalName);
              } else {
                app.updateCachedWebsite(websiteData);
              }
            }
            
            // 关闭弹窗
            hideAddWebsiteModal();
            // 刷新页面以显示更新的网站
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            const action = isEditMode ? '更新' : '添加';
            utils.showToast(result.message || `${action}网站失败`, 'error');
          }
        } catch (error) {
          const action = isEditMode ? '更新' : '添加';
          console.error(`${action}网站错误:`, error);
          utils.showToast(`${action}网站失败，请稍后重试`, 'error');
        }
      } else {
        utils.showToast('请填写所有必填字段', 'warning');
      }
    });
  }
});

// 点击弹窗背景关闭弹窗
document.addEventListener('click', (e) => {
  const categoryModal = document.getElementById('addCategoryModal');
  if (categoryModal && e.target === categoryModal) {
    hideAddCategoryModal();
  }
  
  const websiteModal = document.getElementById('addWebsiteModal');
  if (websiteModal && e.target === websiteModal) {
    hideAddWebsiteModal();
  }
});

// ESC键关闭弹窗
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const categoryModal = document.getElementById('addCategoryModal');
    if (categoryModal && categoryModal.style.display === 'flex') {
      hideAddCategoryModal();
    }
    
    const websiteModal = document.getElementById('addWebsiteModal');
    if (websiteModal && websiteModal.style.display === 'flex') {
      hideAddWebsiteModal();
    }
    
    const iconPicker = document.getElementById('iconPicker');
    if (iconPicker && iconPicker.style.display === 'flex') {
      hideIconPicker();
    }
  }
});

// Emoji图标选择器功能
class EmojiIconPicker {
  constructor() {
    this.currentTarget = null; // 当前目标输入框
    this.emojiData = {
      '表情': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
      '手势': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸'],
      '人物': ['👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲', '👩', '👩‍🦰', '🧑‍🦰', '👩‍🦱', '🧑‍🦱', '👩‍🦳', '🧑‍🦳', '👩‍🦲', '🧑‍🦲', '👱‍♀️', '👱‍♂️', '🧓', '👴', '👵', '🙍', '🙍‍♂️', '🙍‍♀️', '🙎', '🙎‍♂️', '🙎‍♀️', '🙅', '🙅‍♂️', '🙅‍♀️', '🙆', '🙆‍♂️', '🙆‍♀️', '💁', '💁‍♂️', '💁‍♀️', '🙋', '🙋‍♂️', '🙋‍♀️', '🧏', '🧏‍♂️', '🧏‍♀️', '🙇', '🙇‍♂️', '🙇‍♀️', '🤦', '🤦‍♂️', '🤦‍♀️', '🤷', '🤷‍♂️', '🤷‍♀️', '👨‍⚕️', '👩‍⚕️', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳', '👨‍🎓', '👩‍🎓', '👨‍🎤', '👩‍🎤', '👨‍🏫', '👩‍🏫', '👨‍🏭', '👩‍🏭', '👨‍💻', '👩‍💻', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨', '👨‍🚒', '👩‍🚒', '👨‍✈️', '👩‍✈️', '👨‍🚀', '👩‍🚀', '👨‍⚖️', '👩‍⚖️', '👰', '👰‍♂️', '👰‍♀️', '🤵', '🤵‍♂️', '🤵‍♀️', '👸', '🤴', '🥷', '🦸', '🦸‍♂️', '🦸‍♀️', '🦹', '🦹‍♂️', '🦹‍♀️', '🤶', '🧑‍🎄', '🎅', '🧙', '🧙‍♂️', '🧙‍♀️', '🧝', '🧝‍♂️', '🧝‍♀️', '🧛', '🧛‍♂️', '🧛‍♀️', '🧟', '🧟‍♂️', '🧟‍♀️', '🧞', '🧞‍♂️', '🧞‍♀️', '🧜', '🧜‍♂️', '🧜‍♀️', '🧚', '🧚‍♂️', '🧚‍♀️', '👼', '🤰', '🤱', '👩‍🍼', '👨‍🍼', '🧑‍🍼', '🙈', '🙉', '🙊', '💂', '💂‍♂️', '💂‍♀️', '💆', '💆‍♂️', '💆‍♀️', '💇', '💇‍♂️', '💇‍♀️', '🚶', '🚶‍♂️', '🚶‍♀️', '🧍', '🧍‍♂️', '🧍‍♀️', '🧎', '🧎‍♂️', '🧎‍♀️', '👨‍🦯', '👩‍🦯', '👨‍🦼', '👩‍🦼', '👨‍🦽', '👩‍🦽', '🏃', '🏃‍♂️', '🏃‍♀️', '💃', '🕺', '🕴️', '👯', '👯‍♂️', '👯‍♀️', '🧖', '🧖‍♂️', '🧖‍♀️', '🧗', '🧗‍♂️', '🧗‍♀️'],
      '动物': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪲', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
      '自然': ['🌱', '🌿', '☘️', '🍀', '🎍', '🎋', '🍃', '🍂', '🍁', '🍄', '🐚', '🪨', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '🪐', '💫', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔', '☂️', '🌊', '🌫️'],
      '食物': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾'],
      '活动': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🏋️‍♂️', '🏋️‍♀️', '🤼', '🤼‍♂️', '🤼‍♀️', '🤸', '🤸‍♂️', '🤸‍♀️', '⛹️', '⛹️‍♂️', '⛹️‍♀️', '🤺', '🤾', '🤾‍♂️', '🤾‍♀️', '🏌️', '🏌️‍♂️', '🏌️‍♀️', '🏇', '🧘', '🧘‍♂️', '🧘‍♀️', '🏄', '🏄‍♂️', '🏄‍♀️', '🏊', '🏊‍♂️', '🏊‍♀️', '🤽', '🤽‍♂️', '🤽‍♀️', '🚣', '🚣‍♂️', '🚣‍♀️', '🧗', '🧗‍♂️', '🧗‍♀️', '🚵', '🚵‍♂️', '🚵‍♀️', '🚴', '🚴‍♂️', '🚴‍♀️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🤹‍♂️', '🤹‍♀️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🥁', '🪘', '🎹', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♠️', '♥️', '♦️', '♣️', '♟️', '🃏', '🀄', '🎴', '🎯', '🎳'],
      '交通': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🛰️', '🚉', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚟', '🚠', '🚡', '⛵', '🛶', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚨', '🚥', '🚦', '🛑', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛱️', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '♨️', '🎠', '🎡', '🎢', '💈', '🎪'],
      '物品': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '🪬', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🪩', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
      '符号': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧']
    };
    this.filteredEmojis = {};
    this.currentCategory = '表情';
    this.init();
  }

  init() {
    this.bindEvents();
    this.renderCategories();
    this.renderEmojis(this.currentCategory);
  }

  bindEvents() {
    // 分类切换事件
    const categoryBtns = document.querySelectorAll('.emoji-category-btn');
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.target.dataset.category;
        this.switchCategory(category);
      });
    });

    // 搜索事件
    const searchInput = document.getElementById('emojiSearch');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
    }

    // emoji选择事件
    const emojiGrid = document.getElementById('emojiGrid');
    if (emojiGrid) {
      emojiGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-item')) {
          this.selectEmoji(e.target.textContent);
        }
      });
    }

    // 自定义输入事件
    const customInput = document.getElementById('customEmojiInput');
    const confirmBtn = document.getElementById('confirmCustomEmoji');
    if (customInput && confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const customEmoji = customInput.value.trim();
        if (customEmoji) {
          this.selectEmoji(customEmoji);
        }
      });
      
      customInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const customEmoji = customInput.value.trim();
          if (customEmoji) {
            this.selectEmoji(customEmoji);
          }
        }
      });
    }

    // 为所有图标输入框添加焦点事件
    this.bindInputEvents();
    
    // 点击外部关闭选择器
    document.addEventListener('click', (e) => {
      const picker = document.getElementById('iconPicker');
      const isClickInsidePicker = picker && picker.contains(e.target);
      const isIconInput = e.target.classList.contains('icon-input') || e.target.closest('.icon-input-container');
      
      if (!isClickInsidePicker && !isIconInput && picker && picker.classList.contains('show')) {
        this.hideDropdown();
      }
    });
  }

  bindInputEvents() {
    // 为所有图标输入框添加事件监听
    const iconInputs = document.querySelectorAll('.icon-input');
    iconInputs.forEach(input => {
      // 获得焦点时显示选择器
      input.addEventListener('focusin', (e) => {
        this.showDropdown(e.target);
      });
      
      // 点击时也显示选择器（支持多种触发方式）
      input.addEventListener('click', (e) => {
        e.preventDefault();
        this.showDropdown(e.target);
      });
      
      // 失去焦点时延迟隐藏（给点击emoji留时间）
      input.addEventListener('focusout', (e) => {
        setTimeout(() => {
          const picker = document.getElementById('iconPicker');
          if (picker && !picker.matches(':hover')) {
            this.hideDropdown();
          }
        }, 150);
      });
    });
    
    // 为图标选择按钮添加点击事件（保持向后兼容）
    const iconPickerBtns = document.querySelectorAll('.icon-picker-btn');
    iconPickerBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        if (targetId) {
          const targetInput = document.getElementById(targetId);
          if (targetInput) {
            this.showDropdown(targetInput);
          }
        }
      });
    });
  }

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

  renderCategories() {
    const container = document.getElementById('emojiCategories');
    if (!container) return;

    const categories = Object.keys(this.emojiData);
    const html = categories.map(category => {
      const isActive = category === this.currentCategory ? 'active' : '';
      return `<button class="emoji-category-btn ${isActive}" data-category="${category}">${category}</button>`;
    }).join('');

    container.innerHTML = html;
  }

  renderEmojis(category) {
    const container = document.getElementById('emojiGrid');
    if (!container) return;

    const emojis = this.emojiData[category] || [];
    const html = emojis.map(emoji => {
      return `<div class="emoji-item" title="${emoji}">${emoji}</div>`;
    }).join('');

    container.innerHTML = html;
  }

  switchCategory(category) {
    this.currentCategory = category;
    
    // 更新分类按钮状态
    const categoryBtns = document.querySelectorAll('.emoji-category-btn');
    categoryBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    // 渲染对应分类的emoji
    this.renderEmojis(category);
    
    // 清空搜索框
    const searchInput = document.getElementById('emojiSearch');
    if (searchInput) {
      searchInput.value = '';
    }
  }

  handleSearch() {
    const searchInput = document.getElementById('emojiSearch');
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
      this.renderEmojis(this.currentCategory);
      return;
    }

    // emoji关键词映射
    const emojiKeywords = {
      '😀': ['笑', '开心', '高兴', '快乐', '微笑'],
      '😂': ['哭笑', '笑哭', '大笑', '搞笑'],
      '😍': ['爱心', '喜欢', '爱'],
      '😭': ['哭', '伤心', '难过'],
      '😊': ['微笑', '开心', '愉快'],
      '🐶': ['狗', '小狗', '宠物'],
      '🐱': ['猫', '小猫', '宠物'],
      '🐭': ['老鼠', '鼠'],
      '🐹': ['仓鼠'],
      '🐰': ['兔子', '兔'],
      '🦊': ['狐狸', '狐'],
      '🐻': ['熊', '小熊'],
      '🐼': ['熊猫', '大熊猫'],
      '🐨': ['考拉'],
      '🐯': ['老虎', '虎'],
      '🦁': ['狮子', '狮'],
      '🐮': ['牛', '奶牛'],
      '🐷': ['猪', '小猪'],
      '🐸': ['青蛙', '蛙'],
      '🐵': ['猴子', '猴'],
      '🍎': ['苹果', '水果'],
      '🍌': ['香蕉', '水果'],
      '🍇': ['葡萄', '水果'],
      '🍓': ['草莓', '水果'],
      '🍊': ['橙子', '橘子', '水果'],
      '🍋': ['柠檬', '水果'],
      '🍉': ['西瓜', '水果'],
      '🍑': ['桃子', '水果'],
      '🍒': ['樱桃', '水果'],
      '🥝': ['猕猴桃', '水果'],
      '🍕': ['披萨', '比萨', '食物'],
      '🍔': ['汉堡', '汉堡包', '食物'],
      '🍟': ['薯条', '食物'],
      '🌭': ['热狗', '食物'],
      '🍿': ['爆米花', '食物'],
      '🍰': ['蛋糕', '生日蛋糕', '食物'],
      '🍪': ['饼干', '食物'],
      '🍫': ['巧克力', '食物'],
      '🍬': ['糖果', '食物'],
      '🍭': ['棒棒糖', '食物'],
      '🚗': ['汽车', '车', '交通'],
      '🚕': ['出租车', '的士', '交通'],
      '🚙': ['SUV', '越野车', '交通'],
      '🚌': ['公交车', '巴士', '交通'],
      '🚎': ['电车', '交通'],
      '🏎️': ['赛车', '跑车', '交通'],
      '🚓': ['警车', '交通'],
      '🚑': ['救护车', '交通'],
      '🚒': ['消防车', '交通'],
      '🚐': ['面包车', '交通'],
      '🛻': ['皮卡', '货车', '交通'],
      '🚚': ['卡车', '货车', '交通'],
      '🚛': ['拖车', '交通'],
      '🚜': ['拖拉机', '交通'],
      '🏍️': ['摩托车', '交通'],
      '🛵': ['踏板车', '交通'],
      '🚲': ['自行车', '单车', '交通'],
      '🛴': ['滑板车', '交通'],
      '✈️': ['飞机', '交通'],
      '🚁': ['直升机', '交通'],
      '🚂': ['火车', '交通'],
      '🚄': ['高铁', '动车', '交通'],
      '🚅': ['子弹头列车', '交通'],
      '🚆': ['地铁', '交通'],
      '🚇': ['地铁', '交通'],
      '🚈': ['轻轨', '交通'],
      '🚉': ['车站', '交通'],
      '🚊': ['有轨电车', '交通'],
      '🚝': ['单轨列车', '交通'],
      '🚞': ['山地铁路', '交通'],
      '🚟': ['悬挂式铁路', '交通'],
      '🚠': ['缆车', '交通'],
      '🚡': ['空中缆车', '交通'],
      '⛵': ['帆船', '交通'],
      '🛥️': ['快艇', '交通'],
      '🚤': ['快艇', '交通'],
      '🛳️': ['客轮', '交通'],
      '⛴️': ['渡轮', '交通'],
      '🚢': ['轮船', '交通'],
      '⚓': ['锚', '交通'],
      '⛽': ['加油站', '交通'],
      '🚨': ['警报', '警笛'],
      '🚥': ['红绿灯', '交通灯', '交通'],
      '🚦': ['红绿灯', '交通灯', '交通'],
      '🛑': ['停止', '停车标志', '交通'],
      '🚧': ['施工', '交通'],
      '⭐': ['星星', '五角星', '符号'],
      '🌟': ['闪亮', '星星', '符号'],
      '💫': ['眩晕', '符号'],
      '✨': ['闪烁', '符号'],
      '⚡': ['闪电', '符号'],
      '☄️': ['彗星', '符号'],
      '💥': ['爆炸', '符号'],
      '🔥': ['火', '火焰', '符号'],
      '🌪️': ['龙卷风', '符号'],
      '🌈': ['彩虹', '符号'],
      '☀️': ['太阳', '符号'],
      '🌤️': ['多云', '符号'],
      '⛅': ['云', '符号'],
      '🌦️': ['雨', '符号'],
      '🌧️': ['大雨', '符号'],
      '⛈️': ['雷雨', '符号'],
      '🌩️': ['闪电', '符号'],
      '🌨️': ['雪', '符号'],
      '❄️': ['雪花', '符号'],
      '☃️': ['雪人', '符号'],
      '⛄': ['雪人', '符号'],
      '🌬️': ['风', '符号'],
      '💨': ['风', '符号'],
      '💧': ['水滴', '符号'],
      '💦': ['汗水', '符号'],
      '☔': ['雨伞', '符号'],
      '☂️': ['雨伞', '符号'],
      '🌊': ['海浪', '符号'],
      '🌫️': ['雾', '符号'],
      '🍀': ['四叶草', '符号'],
      '🌱': ['幼苗', '符号'],
      '🌿': ['叶子', '符号'],
      '🍃': ['叶子', '符号'],
      '🌾': ['稻穗', '符号'],
      '💐': ['花束', '符号'],
      '🌷': ['郁金香', '符号'],
      '🌹': ['玫瑰', '符号'],
      '🥀': ['枯萎的花', '符号'],
      '🌺': ['花', '符号'],
      '🌸': ['樱花', '符号'],
      '🌼': ['雏菊', '符号'],
      '🌻': ['向日葵', '符号'],
      '🌝': ['满月脸', '符号'],
      '🌛': ['上弦月脸', '符号'],
      '🌜': ['下弦月脸', '符号'],
      '🌚': ['新月脸', '符号'],
      '🌕': ['满月', '符号'],
      '🌖': ['亏凸月', '符号'],
      '🌗': ['下弦月', '符号'],
      '🌘': ['残月', '符号'],
      '🌑': ['新月', '符号'],
      '🌒': ['峨眉月', '符号'],
      '🌓': ['上弦月', '符号'],
      '🌔': ['盈凸月', '符号'],
      '🌙': ['弯月', '符号'],
      '💫': ['眩晕', '符号'],
      '⭐': ['星星', '符号'],
      '🌟': ['闪亮星星', '符号'],
      '✨': ['闪烁', '符号'],
      '⚡': ['闪电', '符号'],
      '☄️': ['彗星', '符号'],
      '💥': ['爆炸', '符号'],
      '🔥': ['火', '符号'],
      '🌪️': ['龙卷风', '符号'],
      '🌈': ['彩虹', '符号'],
      '❤️': ['爱心', '红心', '符号'],
      '🧡': ['橙心', '符号'],
      '💛': ['黄心', '符号'],
      '💚': ['绿心', '符号'],
      '💙': ['蓝心', '符号'],
      '💜': ['紫心', '符号'],
      '🖤': ['黑心', '符号'],
      '🤍': ['白心', '符号'],
      '🤎': ['棕心', '符号'],
      '💔': ['破碎的心', '符号'],
      '❣️': ['心形感叹号', '符号'],
      '💕': ['两颗心', '符号'],
      '💞': ['旋转的心', '符号'],
      '💓': ['跳动的心', '符号'],
      '💗': ['成长的心', '符号'],
      '💖': ['闪亮的心', '符号'],
      '💘': ['丘比特之箭', '符号'],
      '💝': ['心形礼物', '符号'],
      '💟': ['心形装饰', '符号'],
      '☮️': ['和平', '符号'],
      '✝️': ['十字架', '符号'],
      '☪️': ['星月', '符号'],
      '🕉️': ['奥姆', '符号'],
      '☸️': ['法轮', '符号'],
      '✡️': ['大卫之星', '符号'],
      '🔯': ['六芒星', '符号'],
      '🕎': ['烛台', '符号'],
      '☯️': ['阴阳', '符号'],
      '☦️': ['东正教十字架', '符号'],
      '🛐': ['礼拜场所', '符号'],
      '⛎': ['蛇夫座', '符号'],
      '♈': ['白羊座', '符号'],
      '♉': ['金牛座', '符号'],
      '♊': ['双子座', '符号'],
      '♋': ['巨蟹座', '符号'],
      '♌': ['狮子座', '符号'],
      '♍': ['处女座', '符号'],
      '♎': ['天秤座', '符号'],
      '♏': ['天蝎座', '符号'],
      '♐': ['射手座', '符号'],
      '♑': ['摩羯座', '符号'],
      '♒': ['水瓶座', '符号'],
      '♓': ['双鱼座', '符号'],
      '🆔': ['ID', '符号'],
      '⚛️': ['原子', '符号'],
      '🉑': ['可', '符号'],
      '☢️': ['放射性', '符号'],
      '☣️': ['生物危险', '符号'],
      '📴': ['手机关机', '符号'],
      '📳': ['振动模式', '符号'],
      '🈶': ['有', '符号'],
      '🈚': ['无', '符号'],
      '🈸': ['申', '符号'],
      '🈺': ['营', '符号'],
      '🈷️': ['月', '符号'],
      '✴️': ['八角星', '符号'],
      '🆚': ['VS', '符号'],
      '💮': ['白花', '符号'],
      '🉐': ['得', '符号'],
      '㊙️': ['秘', '符号'],
      '㊗️': ['祝', '符号'],
      '🈴': ['合', '符号'],
      '🈵': ['满', '符号'],
      '🈹': ['割', '符号'],
      '🈲': ['禁', '符号'],
      '🅰️': ['A', '符号'],
      '🅱️': ['B', '符号'],
      '🆎': ['AB', '符号'],
      '🆑': ['CL', '符号'],
      '🅾️': ['O', '符号'],
      '🆘': ['SOS', '符号'],
      '❌': ['叉', '错误', '符号'],
      '⭕': ['圈', '正确', '符号'],
      '🛑': ['停止', '符号'],
      '⛔': ['禁止', '符号'],
      '📛': ['姓名牌', '符号'],
      '🚫': ['禁止', '符号'],
      '💯': ['100', '符号'],
      '💢': ['愤怒', '符号'],
      '♨️': ['温泉', '符号'],
      '🚷': ['禁止行人', '符号'],
      '🚯': ['禁止乱扔垃圾', '符号'],
      '🚳': ['禁止自行车', '符号'],
      '🚱': ['不可饮用水', '符号'],
      '🔞': ['18禁', '符号'],
      '📵': ['禁止手机', '符号'],
      '🚭': ['禁烟', '符号'],
      '❗': ['感叹号', '符号'],
      '❕': ['白色感叹号', '符号'],
      '❓': ['问号', '符号'],
      '❔': ['白色问号', '符号'],
      '‼️': ['双感叹号', '符号'],
      '⁉️': ['感叹问号', '符号'],
      '🔅': ['低亮度', '符号'],
      '🔆': ['高亮度', '符号'],
      '〽️': ['部分交替标记', '符号'],
      '⚠️': ['警告', '符号'],
      '🚸': ['儿童过马路', '符号'],
      '🔱': ['三叉戟', '符号'],
      '⚜️': ['鸢尾花', '符号'],
      '🔰': ['日本新手标志', '符号'],
      '♻️': ['回收', '符号'],
      '✅': ['勾选', '符号'],
      '🈯': ['指', '符号'],
      '💹': ['上涨趋势', '符号'],
      '❇️': ['闪光', '符号'],
      '✳️': ['八角星', '符号'],
      '❎': ['叉号按钮', '符号'],
      '🌐': ['地球', '符号'],
      '💠': ['钻石形状', '符号'],
      'Ⓜ️': ['M', '符号'],
      '🌀': ['旋风', '符号'],
      '💤': ['睡觉', '符号'],
      '🏧': ['ATM', '符号'],
      '🚾': ['厕所', '符号'],
      '♿': ['轮椅', '符号'],
      '🅿️': ['停车', '符号'],
      '🈳': ['空', '符号'],
      '🈂️': ['服务费', '符号'],
      '🛂': ['护照检查', '符号'],
      '🛃': ['海关', '符号'],
      '🛄': ['行李提取', '符号'],
      '🛅': ['行李寄存', '符号'],
      '🚹': ['男', '符号'],
      '🚺': ['女', '符号'],
      '🚼': ['婴儿', '符号'],
      '🚻': ['厕所', '符号'],
      '🚮': ['垃圾桶', '符号'],
      '🎦': ['电影院', '符号'],
      '📶': ['信号强度', '符号'],
      '🈁': ['这里', '符号'],
      '🔣': ['符号', '符号'],
      'ℹ️': ['信息', '符号'],
      '🔤': ['字母', '符号'],
      '🔡': ['小写字母', '符号'],
      '🔠': ['大写字母', '符号'],
      '🔢': ['数字', '符号'],
      '#️⃣': ['井号', '符号'],
      '*️⃣': ['星号', '符号'],
      '⏏️': ['弹出', '符号'],
      '▶️': ['播放', '符号'],
      '⏸️': ['暂停', '符号'],
      '⏯️': ['播放暂停', '符号'],
      '⏹️': ['停止', '符号'],
      '⏺️': ['录制', '符号'],
      '⏭️': ['下一首', '符号'],
      '⏮️': ['上一首', '符号'],
      '⏩': ['快进', '符号'],
      '⏪': ['快退', '符号'],
      '⏫': ['快速向上', '符号'],
      '⏬': ['快速向下', '符号'],
      '◀️': ['向左', '符号'],
      '🔼': ['向上小三角', '符号'],
      '🔽': ['向下小三角', '符号'],
      '➡️': ['向右', '符号'],
      '⬅️': ['向左', '符号'],
      '⬆️': ['向上', '符号'],
      '⬇️': ['向下', '符号'],
      '↗️': ['右上', '符号'],
      '↘️': ['右下', '符号'],
      '↙️': ['左下', '符号'],
      '↖️': ['左上', '符号'],
      '↕️': ['上下', '符号'],
      '↔️': ['左右', '符号'],
      '↪️': ['左弯箭头', '符号'],
      '↩️': ['右弯箭头', '符号'],
      '⤴️': ['右上弯箭头', '符号'],
      '⤵️': ['右下弯箭头', '符号'],
      '🔀': ['随机播放', '符号'],
      '🔁': ['重复', '符号'],
      '🔂': ['重复单曲', '符号'],
      '🔄': ['逆时针箭头', '符号'],
      '🔃': ['顺时针箭头', '符号'],
      '🎵': ['音符', '符号'],
      '🎶': ['多个音符', '符号'],
      '➕': ['加号', '符号'],
      '➖': ['减号', '符号'],
      '➗': ['除号', '符号'],
      '✖️': ['乘号', '符号'],
      '♾️': ['无穷', '符号'],
      '💲': ['美元', '符号'],
      '💱': ['货币兑换', '符号'],
      '™️': ['商标', '符号'],
      '©️': ['版权', '符号'],
      '®️': ['注册商标', '符号'],
      '〰️': ['波浪线', '符号'],
      '➰': ['卷曲环', '符号'],
      '➿': ['双卷曲环', '符号'],
      '🔚': ['结束', '符号'],
      '🔙': ['返回', '符号'],
      '🔛': ['开启', '符号'],
      '🔝': ['顶部', '符号'],
      '🔜': ['即将', '符号'],
      '✔️': ['勾', '符号'],
      '☑️': ['勾选框', '符号'],
      '🔘': ['单选按钮', '符号'],
      '🔴': ['红圆', '符号'],
      '🟠': ['橙圆', '符号'],
      '🟡': ['黄圆', '符号'],
      '🟢': ['绿圆', '符号'],
      '🔵': ['蓝圆', '符号'],
      '🟣': ['紫圆', '符号'],
      '⚫': ['黑圆', '符号'],
      '⚪': ['白圆', '符号'],
      '🟤': ['棕圆', '符号'],
      '🔺': ['红三角', '符号'],
      '🔻': ['红倒三角', '符号'],
      '🔸': ['橙菱形', '符号'],
      '🔹': ['蓝菱形', '符号'],
      '🔶': ['橙菱形', '符号'],
      '🔷': ['蓝菱形', '符号'],
      '🔳': ['白方块', '符号'],
      '🔲': ['黑方块', '符号'],
      '▪️': ['黑小方块', '符号'],
      '▫️': ['白小方块', '符号'],
      '◾': ['黑中方块', '符号'],
      '◽': ['白中方块', '符号'],
      '◼️': ['黑大方块', '符号'],
      '◻️': ['白大方块', '符号'],
      '🟥': ['红方块', '符号'],
      '🟧': ['橙方块', '符号'],
      '🟨': ['黄方块', '符号'],
      '🟩': ['绿方块', '符号'],
      '🟦': ['蓝方块', '符号'],
      '🟪': ['紫方块', '符号'],
      '🟫': ['棕方块', '符号'],
      '⬛': ['黑大方块', '符号'],
      '⬜': ['白大方块', '符号'],
      '◀️': ['黑左三角', '符号'],
      '◁': ['白左三角', '符号'],
      '▶️': ['黑右三角', '符号'],
      '▷': ['白右三角', '符号'],
      '▲': ['黑上三角', '符号'],
      '△': ['白上三角', '符号'],
      '▼': ['黑下三角', '符号'],
      '▽': ['白下三角', '符号'],
      '⊛': ['星号操作符', '符号'],
      '⊚': ['圆圈操作符', '符号'],
      '⊙': ['圆点操作符', '符号'],
      '⊘': ['圆斜杠操作符', '符号'],
      '⊗': ['圆乘操作符', '符号'],
      '⊖': ['圆减操作符', '符号'],
      '⊕': ['圆加操作符', '符号'],
      '⊔': ['方杯操作符', '符号'],
      '⊓': ['方帽操作符', '符号'],
      '⊒': ['方超集操作符', '符号'],
      '⊑': ['方子集操作符', '符号'],
      '⊐': ['方超集操作符', '符号'],
      '⊏': ['方子集操作符', '符号'],
      '⊎': ['多重集操作符', '符号'],
      '⊍': ['多重集操作符', '符号'],
      '⊌': ['多重集操作符', '符号'],
      '⊋': ['超集操作符', '符号'],
      '⊊': ['子集操作符', '符号'],
      '⊉': ['不是超集操作符', '符号'],
      '⊈': ['不是子集操作符', '符号'],
      '⊇': ['超集或等于操作符', '符号'],
      '⊆': ['子集或等于操作符', '符号'],
      '⊅': ['不是超集操作符', '符号'],
      '⊄': ['不是子集操作符', '符号'],
      '⊃': ['超集操作符', '符号'],
      '⊂': ['子集操作符', '符号'],
      '⊁': ['不成功操作符', '符号'],
      '⊀': ['不先于操作符', '符号'],
      '⋿': ['Z记号包操作符', '符号'],
      '⋾': ['右鱼尾操作符', '符号'],
      '⋽': ['左鱼尾操作符', '符号'],
      '⋼': ['右半积分操作符', '符号'],
      '⋻': ['左半积分操作符', '符号'],
      '⋺': ['两个逻辑与操作符', '符号'],
      '⋹': ['两个逻辑或操作符', '符号'],
      '⋸': ['多重映射操作符', '符号'],
      '⋷': ['映像操作符', '符号'],
      '⋶': ['原像操作符', '符号'],
      '⋵': ['等于和平行操作符', '符号'],
      '⋴': ['等于和倾斜平行操作符', '符号'],
      '⋳': ['等于和波浪操作符', '符号'],
      '⋲': ['等于和波浪操作符', '符号'],
      '⋱': ['向下右对角省略号', '符号'],
      '⋰': ['向上右对角省略号', '符号'],
      '⋯': ['中线水平省略号', '符号'],
      '⋮': ['垂直省略号', '符号'],
      '⋭': ['不包含作为成员操作符', '符号'],
      '⋬': ['不包含作为成员操作符', '符号'],
      '⋫': ['不包含作为成员操作符', '符号'],
      '⋪': ['不是三角等于操作符', '符号'],
      '⋩': ['不是三角等于操作符', '符号'],
      '⋨': ['不是三角等于操作符', '符号'],
      '⋧': ['不是三角等于操作符', '符号'],
      '⋦': ['不是三角等于操作符', '符号'],
      '⋥': ['不是三角等于操作符', '符号'],
      '⋤': ['不是三角等于操作符', '符号'],
      '⋣': ['不是三角等于操作符', '符号'],
      '⋢': ['不是三角等于操作符', '符号'],
      '⋡': ['不是三角等于操作符', '符号'],
      '⋠': ['不是先于或等于操作符', '符号'],
      '⋟': ['不是先于或等于操作符', '符号'],
      '⋞': ['不是先于或等于操作符', '符号'],
      '⋝': ['等于和平行操作符', '符号'],
      '⋜': ['等于和倾斜平行操作符', '符号'],
      '⋛': ['等于和波浪操作符', '符号'],
      '⋚': ['等于和波浪操作符', '符号'],
      '⋙': ['远大于操作符', '符号'],
      '⋘': ['远小于操作符', '符号'],
      '⋗': ['等于和大于操作符', '符号'],
      '⋖': ['等于和小于操作符', '符号'],
      '⋕': ['等于和平行操作符', '符号'],
      '⋔': ['叉积操作符', '符号'],
      '⋓': ['帽操作符', '符号'],
      '⋒': ['杯操作符', '符号'],
      '⋑': ['等于和平行操作符', '符号'],
      '⋐': ['双子集操作符', '符号'],
      '⋏': ['曲线逻辑与操作符', '符号'],
      '⋎': ['曲线逻辑或操作符', '符号'],
      '⋍': ['反向波浪等于操作符', '符号'],
      '⋌': ['多重集操作符', '符号'],
      '⋋': ['左半直积操作符', '符号'],
      '⋊': ['右半直积操作符', '符号'],
      '⋉': ['左半直积操作符', '符号'],
      '⋈': ['蝴蝶结操作符', '符号'],
      '⋇': ['除法操作符', '符号'],
      '⋆': ['星操作符', '符号'],
      '⋅': ['点操作符', '符号'],
      '⋄': ['钻石操作符', '符号'],
      '⋃': ['并集操作符', '符号'],
      '⋂': ['交集操作符', '符号'],
      '⋁': ['大逻辑或操作符', '符号'],
      '⋀': ['大逻辑与操作符', '符号'],
      '⊿': ['直角三角形', '符号'],
      '⊾': ['右角弧', '符号'],
      '⊽': ['右角弧', '符号'],
      '⊼': ['与非门', '符号'],
      '⊻': ['异或门', '符号'],
      '⊺': ['向上投影', '符号'],
      '⊹': ['厄米共轭矩阵', '符号'],
      '⊸': ['多重映射', '符号'],
      '⊷': ['映像', '符号'],
      '⊶': ['原像', '符号'],
      '⊵': ['等于和平行', '符号'],
      '⊴': ['等于和倾斜平行', '符号'],
      '⊳': ['包含作为正常子群', '符号'],
      '⊲': ['正常子群', '符号'],
      '⊱': ['成功', '符号'],
      '⊰': ['先于', '符号'],
      '⊯': ['不强制', '符号'],
      '⊮': ['不强制', '符号'],
      '⊭': ['不满足', '符号'],
      '⊬': ['不证明', '符号'],
      '⊫': ['强制', '符号'],
      '⊪': ['三重垂直条右转门', '符号'],
      '⊩': ['强制', '符号'],
      '⊨': ['真', '符号'],
      '⊧': ['模型', '符号'],
      '⊦': ['断言', '符号'],
      '⊥': ['向上钉', '符号'],
      '⊤': ['向下钉', '符号'],
      '⊣': ['左钉', '符号'],
      '⊢': ['右钉', '符号'],
      '⊡': ['方点操作符', '符号'],
      '⊠': ['方乘操作符', '符号'],
      '⊟': ['方减操作符', '符号'],
      '⊞': ['方加操作符', '符号'],
      '⊝': ['圆减操作符', '符号'],
      '⊜': ['圆等于操作符', '符号'],
      '⊛': ['星操作符', '符号'],
      '⊚': ['圆环操作符', '符号'],
      '⊙': ['圆点操作符', '符号'],
      '⊘': ['圆斜杠操作符', '符号'],
      '⊗': ['圆乘操作符', '符号'],
      '⊖': ['圆减操作符', '符号'],
      '⊕': ['圆加操作符', '符号'],
      '⊔': ['方杯操作符', '符号'],
      '⊓': ['方帽操作符', '符号'],
      '⊒': ['方超集或等于操作符', '符号'],
      '⊑': ['方子集或等于操作符', '符号'],
      '⊐': ['方超集操作符', '符号'],
      '⊏': ['方子集操作符', '符号'],
      '⊎': ['多重集并集操作符', '符号'],
      '⊍': ['多重集并集操作符', '符号'],
      '⊌': ['多重集操作符', '符号'],
      '⊋': ['包含作为成员操作符', '符号'],
      '⊊': ['包含作为成员操作符', '符号'],
      '⊉': ['不包含作为成员操作符', '符号'],
      '⊈': ['不包含作为成员操作符', '符号'],
      '⊇': ['超集或等于操作符', '符号'],
      '⊆': ['子集或等于操作符', '符号'],
      '⊅': ['不是超集操作符', '符号'],
      '⊄': ['不是子集操作符', '符号'],
      '⊃': ['超集操作符', '符号'],
      '⊂': ['子集操作符', '符号'],
      '⊁': ['不成功操作符', '符号'],
      '⊀': ['不先于操作符', '符号'],
      'ℿ': ['圆周率', '符号'],
      'ℾ': ['伽马函数', '符号'],
      'ℽ': ['双线小写伽马', '符号'],
      'ℼ': ['双线小写派', '符号'],
      '℻': ['传真', '符号'],
      '℺': ['旋转Q', '符号'],
      'ℹ': ['信息源', '符号'],
      'ℸ': ['双线小写派', '符号'],
      'ℷ': ['双线小写派', '符号'],
      'ℶ': ['贝特', '符号'],
      'ℵ': ['阿列夫', '符号'],
      'ℴ': ['o带斜杠', '符号'],
      'ℳ': ['脚本大写M', '符号'],
      'Ⅎ': ['脚本大写F', '符号'],
      'ℱ': ['傅里叶变换', '符号'],
      'ℰ': ['脚本大写E', '符号'],
      'ℯ': ['脚本小写e', '符号'],
      '℮': ['估计符号', '符号'],
      'ℭ': ['双线大写C', '符号'],
      'ℬ': ['脚本大写B', '符号'],
      'Å': ['脚本大写H', '符号'],
      'K': ['开尔文符号', '符号'],
      '℩': ['约塔', '符号'],
      'ℨ': ['双线大写Z', '符号'],
      '℧': ['倒置欧姆符号', '符号'],
      'Ω': ['双线大写Q', '符号'],
      '℥': ['盎司符号', '符号'],
      'ℤ': ['双线大写Z', '符号'],
      '℣': ['版本指示符', '符号'],
      '™': ['商标符号', '符号'],
      '℡': ['电话符号', '符号'],
      '℠': ['服务标记', '符号'],
      '℟': ['响应', '符号'],
      '℞': ['处方', '符号'],
      'ℝ': ['双线大写R', '符号'],
      'ℜ': ['黑字母大写R', '符号'],
      'ℛ': ['脚本大写R', '符号'],
      'ℚ': ['双线大写Q', '符号'],
      'ℙ': ['双线大写P', '符号'],
      '℘': ['威尔斯特拉斯椭圆函数', '符号'],
      '℗': ['录音版权', '符号'],
      '№': ['双线大写L', '符号'],
      'ℕ': ['双线大写N', '符号'],
      '℔': ['L B条符号', '符号'],
      'ℓ': ['脚本小写l', '符号'],
      'ℒ': ['拉格朗日', '符号'],
      'ℑ': ['黑字母大写I', '符号'],
      'ℐ': ['脚本大写I', '符号'],
      'ℏ': ['普朗克常数', '符号'],
      'ℎ': ['普朗克常数', '符号'],
      'ℍ': ['双线大写H', '符号'],
      'ℌ': ['黑字母大写H', '符号'],
      'ℋ': ['哈密顿', '符号'],
      'ℊ': ['脚本小写g', '符号'],
      '℉': ['华氏度', '符号'],
      '℈': ['磅符号', '符号'],
      'ℇ': ['欧拉常数', '符号'],
      '℆': ['每', '符号'],
      '℅': ['在乎', '符号'],
      '℄': ['中心线符号', '符号'],
      '℃': ['摄氏度', '符号'],
      'ℂ': ['双线大写C', '符号'],
      '℁': ['地址符号', '符号'],
      '℀': ['帐户', '符号'],
      '⅟': ['分数斜杠', '符号'],
      '⅞': ['八分之七', '符号'],
      '⅝': ['八分之五', '符号'],
      '⅜': ['八分之三', '符号'],
      '⅛': ['八分之一', '符号'],
      '⅚': ['六分之五', '符号'],
      '⅙': ['六分之一', '符号'],
      '⅘': ['五分之四', '符号'],
      '⅗': ['五分之三', '符号'],
      '⅖': ['五分之二', '符号'],
      '⅕': ['五分之一', '符号'],
      '⅔': ['三分之二', '符号'],
      '⅓': ['三分之一', '符号'],
      '⅒': ['十分之一', '符号'],
      '⅑': ['九分之一', '符号'],
      '⅐': ['七分之一', '符号'],
      '⅏': ['六分之一', '符号'],
      'ⅎ': ['倒置F', '符号'],
      '⅍': ['A/S', '符号'],
      '⅌': ['A/C', '符号'],
      '⅋': ['倒置&', '符号'],
      '⅊': ['旋转小写a', '符号'],
      'ⅉ': ['小写j带点', '符号'],
      'ⅈ': ['双线小写i', '符号'],
      'ⅇ': ['双线小写e', '符号'],
      'ⅆ': ['双线小写d', '符号'],
      'ⅅ': ['双线大写D', '符号'],
      '⅄': ['倒置大写Y', '符号'],
      '⅃': ['倒置大写L', '符号'],
      '⅂': ['倒置大写G', '符号'],
      '⅁': ['倒置大写C', '符号'],
      '⅀': ['双线大写N求和', '符号'],
      'ⁿ': ['上标小写n', '符号'],
      '⁺': ['上标加号', '符号'],
      '⁻': ['上标减号', '符号'],
      '⁼': ['上标等号', '符号'],
      '⁽': ['上标左括号', '符号'],
      '⁾': ['上标右括号', '符号'],
      'ⁿ': ['上标小写n', '符号'],
      '⁰': ['上标零', '符号'],
      '¹': ['上标一', '符号'],
      '²': ['上标二', '符号'],
      '³': ['上标三', '符号'],
      '⁴': ['上标四', '符号'],
      '⁵': ['上标五', '符号'],
      '⁶': ['上标六', '符号'],
      '⁷': ['上标七', '符号'],
      '⁸': ['上标八', '符号'],
      '⁹': ['上标九', '符号'],
      '⁺': ['上标加号', '符号'],
      '⁻': ['上标减号', '符号'],
      '⁼': ['上标等号', '符号'],
      '⁽': ['上标左括号', '符号'],
      '⁾': ['上标右括号', '符号'],
      'ⁿ': ['上标小写n', '符号'],
      '₀': ['下标零', '符号'],
      '₁': ['下标一', '符号'],
      '₂': ['下标二', '符号'],
      '₃': ['下标三', '符号'],
      '₄': ['下标四', '符号'],
      '₅': ['下标五', '符号'],
      '₆': ['下标六', '符号'],
      '₇': ['下标七', '符号'],
      '₈': ['下标八', '符号'],
      '₉': ['下标九', '符号'],
      '₊': ['下标加号', '符号'],
      '₋': ['下标减号', '符号'],
      '₌': ['下标等号', '符号'],
      '₍': ['下标左括号', '符号'],
      '₎': ['下标右括号', '符号'],
      '📱': ['手机', '物品'],
      '💻': ['笔记本电脑', '电脑', '物品'],
      '🖥️': ['台式电脑', '电脑', '物品'],
      '⌨️': ['键盘', '物品'],
      '🖱️': ['鼠标', '物品'],
      '🖲️': ['轨迹球', '物品'],
      '💽': ['迷你光盘', '物品'],
      '💾': ['软盘', '物品'],
      '💿': ['光盘', 'CD', '物品'],
      '📀': ['DVD', '物品'],
      '🧮': ['算盘', '物品'],
      '🎥': ['摄像机', '物品'],
      '📹': ['摄像机', '物品'],
      '📷': ['相机', '照相机', '物品'],
      '📸': ['闪光灯相机', '物品'],
      '📼': ['录像带', '物品'],
      '🔍': ['放大镜', '搜索', '物品'],
      '🔎': ['放大镜', '搜索', '物品'],
      '🕯️': ['蜡烛', '物品'],
      '💡': ['灯泡', '想法', '物品'],
      '🔦': ['手电筒', '物品'],
      '🏮': ['红灯笼', '物品'],
      '🪔': ['油灯', '物品'],
      '📔': ['笔记本', '物品'],
      '📕': ['闭合的书', '物品'],
      '📖': ['打开的书', '物品'],
      '📗': ['绿书', '物品'],
      '📘': ['蓝书', '物品'],
      '📙': ['橙书', '物品'],
      '📚': ['书籍', '物品'],
      '📓': ['笔记本', '物品'],
      '📒': ['账本', '物品'],
      '📃': ['卷页', '物品'],
      '📜': ['卷轴', '物品'],
      '📄': ['文档', '物品'],
      '📰': ['报纸', '物品'],
      '🗞️': ['卷起的报纸', '物品'],
      '📑': ['书签标签', '物品'],
      '🔖': ['书签', '物品'],
      '🏷️': ['标签', '物品'],
      '💰': ['钱袋', '金钱', '物品'],
      '🪙': ['硬币', '物品'],
      '💴': ['日元', '物品'],
      '💵': ['美元', '物品'],
      '💶': ['欧元', '物品'],
      '💷': ['英镑', '物品'],
      '💸': ['飞走的钱', '物品'],
      '💳': ['信用卡', '物品'],
      '🧾': ['收据', '物品'],
      '💎': ['钻石', '物品'],
      '⚖️': ['天平', '物品'],
      '🪜': ['梯子', '物品'],
      '🧰': ['工具箱', '物品'],
      '🔧': ['扳手', '物品'],
      '🔨': ['锤子', '物品'],
      '⚒️': ['锤子和镐', '物品'],
      '🛠️': ['锤子和扳手', '物品'],
      '⛏️': ['镐', '物品'],
      '🪚': ['锯子', '物品'],
      '🔩': ['螺栓', '物品'],
      '⚙️': ['齿轮', '物品'],
      '🪤': ['捕鼠器', '物品'],
      '🧲': ['磁铁', '物品'],
      '🪣': ['水桶', '物品'],
      '🧴': ['瓶子', '物品'],
      '🧷': ['安全别针', '物品'],
      '🧹': ['扫帚', '物品'],
      '🧺': ['篮子', '物品'],
      '🧻': ['卷纸', '物品'],
      '🪒': ['剃刀', '物品'],
      '🧼': ['肥皂', '物品'],
      '🪥': ['牙刷', '物品'],
      '🧽': ['海绵', '物品'],
      '🪆': ['套娃', '物品'],
      '🧿': ['恶魔之眼', '物品'],
      '🪬': ['哈姆萨', '物品'],
      '🗿': ['摩艾石像', '物品'],
      '🪧': ['标语牌', '物品'],
      '🪪': ['身份证', '物品']
    };

    // 在所有分类中搜索emoji
    const allEmojis = [];
    Object.values(this.emojiData).forEach(categoryEmojis => {
      allEmojis.push(...categoryEmojis);
    });

    // 搜索匹配的emoji
    const filteredEmojis = allEmojis.filter(emoji => {
      // 直接匹配emoji
      if (emoji.includes(query)) {
        return true;
      }
      
      // 通过关键词匹配
      const keywords = emojiKeywords[emoji];
      if (keywords) {
        return keywords.some(keyword => keyword.includes(query));
      }
      
      return false;
    });

    // 渲染搜索结果
    const container = document.getElementById('emojiGrid');
    if (container) {
      const html = filteredEmojis.map(emoji => {
        return `<div class="emoji-item" title="${emoji}">${emoji}</div>`;
      }).join('');
      container.innerHTML = html || '<div class="no-results">未找到相关图标</div>';
    }
  }

  selectEmoji(emoji) {
    if (this.currentTarget) {
      const targetInput = document.getElementById(this.currentTarget);
      if (targetInput) {
        targetInput.value = emoji;
        // 触发input事件以便其他监听器能够响应
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    // 关闭图标选择器
    this.hideIconPicker();
    
    // 清空自定义输入框
    const customInput = document.getElementById('customEmojiInput');
    if (customInput) {
      customInput.value = '';
    }
  }

  showDropdown(targetInput) {
    this.currentTarget = targetInput.id;
    const picker = document.getElementById('iconPicker');
    if (!picker) return;
    
    // 定位选择器到输入框下方
    this.adjustPosition(targetInput, picker);
    
    // 显示选择器
    picker.classList.add('show');
    
    // 重置到默认分类和清空搜索
    this.switchCategory('表情');
    const searchInput = document.getElementById('emojiSearch');
    if (searchInput) {
      searchInput.value = '';
    }
  }

  hideDropdown() {
    const picker = document.getElementById('iconPicker');
    if (picker) {
      picker.classList.remove('show');
    }
    this.currentTarget = null;
  }

  adjustPosition(targetInput, picker) {
    const rect = targetInput.getBoundingClientRect();
    const pickerHeight = window.innerWidth <= 480 ? 320 : (window.innerWidth <= 768 ? 350 : 400);
    const pickerWidth = window.innerWidth <= 480 ? 260 : (window.innerWidth <= 768 ? 280 : 320);
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    
    // 使用固定定位，相对于视窗
    picker.style.position = 'fixed';
    picker.style.zIndex = '9999';
    
    // 移动端特殊处理
    if (viewportWidth <= 768) {
      // 移动端优先在输入框下方显示
      let top = rect.bottom + 8;
      let preferredPosition = 'below';
      
      // 检查下方空间是否足够
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      if (spaceBelow < pickerHeight + 20 && spaceAbove > spaceBelow) {
        // 上方空间更大，显示在上方
        top = rect.top - pickerHeight - 8;
        preferredPosition = 'above';
      }
      
      // 确保不超出屏幕边界
      if (top < 10) {
        top = 10;
      } else if (top + pickerHeight > viewportHeight - 10) {
        top = viewportHeight - pickerHeight - 10;
      }
      
      // 水平居中，但确保不超出边界
      let left = (viewportWidth - pickerWidth) / 2;
      if (left < 10) left = 10;
      if (left + pickerWidth > viewportWidth - 10) {
        left = viewportWidth - pickerWidth - 10;
      }
      
      picker.style.top = `${top}px`;
      picker.style.left = `${left}px`;
      picker.style.transform = 'none';
      return;
    }
    
    // 桌面端位置计算
    let top = rect.bottom + 8; // 输入框下方8px
    let left = rect.left;
    let preferredPosition = 'below';
    
    // 智能垂直定位
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    if (spaceBelow < pickerHeight + 20) {
      if (spaceAbove >= pickerHeight + 20) {
        // 上方有足够空间，显示在上方
        top = rect.top - pickerHeight - 8;
        preferredPosition = 'above';
      } else {
        // 上下都不够，选择空间更大的一侧
        if (spaceAbove > spaceBelow) {
          top = Math.max(10, rect.top - pickerHeight - 8);
          preferredPosition = 'above';
        } else {
          top = Math.min(rect.bottom + 8, viewportHeight - pickerHeight - 10);
        }
      }
    }
    
    // 确保垂直方向不超出边界
    if (top < 10) {
      top = 10;
    } else if (top + pickerHeight > viewportHeight - 10) {
      top = viewportHeight - pickerHeight - 10;
    }
    
    // 智能水平定位
    const spaceRight = viewportWidth - rect.left;
    const spaceLeft = rect.right;
    
    if (spaceRight < pickerWidth + 20) {
      if (spaceLeft >= pickerWidth + 20) {
        // 右侧空间不够，左对齐到输入框右边
        left = rect.right - pickerWidth;
      } else {
        // 左右都不够，居中显示
        left = (viewportWidth - pickerWidth) / 2;
      }
    }
    
    // 确保水平方向不超出边界
    if (left < 10) {
      left = 10;
    } else if (left + pickerWidth > viewportWidth - 10) {
      left = viewportWidth - pickerWidth - 10;
    }
    
    // 应用位置
    picker.style.top = `${top}px`;
    picker.style.left = `${left}px`;
    picker.style.transform = 'none';
    
    // 添加位置指示类（可用于CSS样式调整）
    picker.classList.remove('position-above', 'position-below');
    picker.classList.add(`position-${preferredPosition}`);
  }

  // 保持向后兼容的方法
  showIconPicker(targetInputId) {
    const targetInput = document.getElementById(targetInputId);
    if (targetInput) {
      this.showDropdown(targetInput);
    }
  }

  hideIconPicker() {
    this.hideDropdown();
  }
}

// 全局图标选择器实例
let emojiIconPicker = null;

// 显示图标选择器
function showIconPicker(targetInputId) {
  if (!emojiIconPicker) {
    emojiIconPicker = new EmojiIconPicker();
  }
  emojiIconPicker.showIconPicker(targetInputId);
}

// 隐藏图标选择器
function hideIconPicker() {
  if (emojiIconPicker) {
    emojiIconPicker.hideIconPicker();
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  if (!emojiIconPicker) {
    emojiIconPicker = new EmojiIconPicker();
  }
});