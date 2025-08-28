// 主要功能模块
class NavigationApp {
  constructor() {
    this.currentCategory = '全部';
    this.allWebsites = [];
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
        this.renderWebsites(cachedWebsites);
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

  // 从服务器加载网站数据并缓存
  async loadWebsitesFromServer(category) {
    try {
      this.showLoading();
      const response = await fetch(`/api/websites/${encodeURIComponent(category)}`);
      const data = await response.json();
      
      if (data.success) {
        this.allWebsites = data.data;
        this.renderWebsites(data.data);
        
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
        this.renderWebsites(cachedWebsites);
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
        category: formData.get('websiteCategory')
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
  }
});