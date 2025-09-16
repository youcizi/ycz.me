// 主要功能模块
class NavigationApp {
  constructor() {
    this.currentCategory = '全部';
    this.currentFilter = 'all';
    this.allWebsites = [];
    this.filteredWebsites = [];
    this.categories = [];
    this.categoryManager = null;
    this.init();
  }

  // 初始化应用
  async init() {
    this.bindEvents();
    await this.initStorage();
    this.initCategoryManager();
    await this.restoreSidebarState();
    await this.loadInitialData();
    
    // 初始化完成
    console.log('NavigationApp初始化完成');
    
    // 添加清除数据按钮用于测试
    this.addClearDataButton();
  }

  // 初始化存储
  async initStorage() {
    try {
      // 初始化NavigationDB
      if (typeof NavigationDB !== 'undefined') {
        this.navigationDB = new NavigationDB();
        await this.navigationDB.init();
      }
      
      // 初始化StorageIntegration
       if (typeof StorageIntegration !== 'undefined') {
         this.storageIntegration = new StorageIntegration();
         await this.storageIntegration.initialize();
       }
    } catch (error) {
      // 存储初始化失败，继续使用默认配置
    }
  }

  // 初始化分类管理器
  initCategoryManager() {
    if (typeof CategoryManager !== 'undefined' && this.navigationDB) {
      // 创建事件总线
      this.eventBus = this.createEventBus();
      
      this.categoryManager = new CategoryManager(this.navigationDB, this.storageIntegration, this.eventBus);
      
      // 监听分类切换事件
      this.eventBus.on('categoryChanged', (category) => {
        this.handleCategoryChangeFromEvent(category);
      });
      
      // 将categoryManager设为全局变量，供模板中的onclick使用
      window.categoryManager = this.categoryManager;
      
      // 将NavigationApp实例设为全局变量
      window.navigationApp = this;
      
      // 将网站操作函数设为全局函数，供模板中的onclick使用
      window.handleEditWebsite = this.handleEditWebsite.bind(this);
      window.handleDeleteWebsite = this.handleDeleteWebsite.bind(this);
    }
  }

  // 创建事件总线
  createEventBus() {
    const listeners = {};
    return {
      emit: (event, data) => {
        if (listeners[event]) {
          listeners[event].forEach(callback => callback(data));
        }
      },
      on: (event, callback) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(callback);
      },
      off: (event, callback) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter(cb => cb !== callback);
        }
      }
    };
  }

  // 处理来自事件的分类切换
  async handleCategoryChangeFromEvent(categoryName) {
    console.log('分类切换事件 - 分类名称:', categoryName);
    
    if (categoryName === this.currentCategory) {
      return;
    }
    
    this.currentCategory = categoryName;
    
    // 更新UI中分类按钮的active状态
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // 为当前分类添加active状态
    const currentButton = document.querySelector(`[data-category="${categoryName}"]`) || 
                         document.querySelector(`[data-category-id="${categoryName}"]`);
    if (currentButton) {
      currentButton.classList.add('active');
    }
    
    // 清空搜索框
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
      searchBox.value = '';
    }
    
    await this.loadWebsites(categoryName);
  }



  // 加载初始数据（优先使用IndexedDB）
  async loadInitialData() {
    try {
      // 检查IndexedDB中是否有数据
      if (this.navigationDB) {
        const localCategories = await this.navigationDB.getCategories();
        
        // 如果有分类数据，说明本地数据库已初始化，优先使用本地数据
        if (localCategories && localCategories.length > 0) {
          // 先加载分类数据
          this.categories = localCategories;
          console.log('加载本地分类数据:', this.categories.length, '个');
          
          // 使用IndexedDB本地数据
          const localWebsites = await this.navigationDB.getWebsites(this.currentCategory === '全部' ? null : this.currentCategory);
          this.allWebsites = localWebsites || [];
          this.applyFilter();
          return;
        }
      }
      
      // 本地数据不存在，首次访问或数据库为空，从服务器加载并同步到IndexedDB
      // 首次访问或本地数据为空，从服务器加载数据并同步到本地
      await this.loadAndSyncFromServer(this.currentCategory);
    } catch (error) {
      // 加载初始数据失败
      // 降级到服务器加载
      await this.loadWebsitesFromServer(this.currentCategory);
    }
  }

  /**
   * 添加清除数据按钮用于测试
   */
  addClearDataButton() {
    const button = document.createElement('button');
    button.textContent = '清除本地数据(测试用)';
    button.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:5px 10px;background:#ff4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;';
    button.onclick = async () => {
      if (await CustomModal.showConfirm('确定要清除所有本地数据吗？这将强制从服务器重新加载数据。')) {
        await this.clearAllLocalData();
        location.reload();
      }
    };
    document.body.appendChild(button);
  }

  /**
   * 清除所有本地数据
   */
  async clearAllLocalData() {
    try {
      // 清除IndexedDB
      if (this.db) {
        await this.db.clearCache();
        const transaction = this.db.db.transaction([this.db.stores.WEBSITES, this.db.stores.CATEGORIES], 'readwrite');
        await this.db._promisifyRequest(transaction.objectStore(this.db.stores.WEBSITES).clear());
        await this.db._promisifyRequest(transaction.objectStore(this.db.stores.CATEGORIES).clear());
      }
      
      // 清除localStorage
      localStorage.removeItem('navigationApp_sidebarCollapsed');
      localStorage.removeItem('navigationApp_lastSync');
      
      console.log('本地数据已清除');
    } catch (error) {
      console.error('清除本地数据失败:', error);
    }
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

    // 分类切换事件由CategoryManager处理，这里不需要重复绑定
    // CategoryManager会通过eventBus触发categoryChanged事件
    
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
        const paymentType = website.paymentType || website.priceType || '';
        return paymentType === this.currentFilter;
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
        const paymentType = website.paymentType || website.priceType || ''; // 兼容旧数据
        return paymentType === this.currentFilter;
      });
    }
    
    this.filteredWebsites = filteredWebsites;
    this.renderWebsites(filteredWebsites);
  }

  // 从服务器加载网站数据
  async loadWebsitesFromServer(category) {
    try {
      this.showLoading();
      const response = await fetch(`/api/websites/${encodeURIComponent(category)}`);
      const data = await response.json();
      
      if (data.success) {
        this.allWebsites = data.data;
        this.applyFilter();
      } else {
        this.showError('加载失败');
      }
    } catch (error) {
      this.showError('网络连接失败');
    }
  }
  
  // 从服务器加载数据并同步到IndexedDB
  async loadAndSyncFromServer(category) {
    try {
      this.showLoading();
      
      // 同时加载分类和网站数据
      const [websitesResponse, categoriesResponse] = await Promise.all([
        fetch(`/api/websites/${encodeURIComponent(category)}`),
        fetch('/api/categories')
      ]);
      
      const websitesData = await websitesResponse.json();
      const categoriesData = await categoriesResponse.json();
      
      if (websitesData.success && categoriesData.success) {
        // 验证ID一致性 - 分类数据
        console.log('=== 分类数据ID验证 ===');
        categoriesData.data.forEach((cat, index) => {
          console.log(`分类${index + 1}: ID=${cat.id}, 名称=${cat.name}`);
        });
        
        // 验证ID一致性 - 网站数据
        console.log('=== 网站数据ID验证 ===');
        websitesData.data.forEach((site, index) => {
          console.log(`网站${index + 1}: ID=${site.id}, 名称=${site.name}, 分类=${site.category}`);
        });
        
        // 批量存储到IndexedDB
        if (this.navigationDB) {
          // 批量存储分类数据
          await this.navigationDB.saveCategories(categoriesData.data);
          
          // 批量存储网站数据
          await this.navigationDB.saveWebsites(websitesData.data);
        }
        
        this.allWebsites = websitesData.data;
        this.applyFilter();
      } else {
        this.showError('加载失败');
      }
    } catch (error) {
      // 同步数据失败
      this.showError('网络连接失败');
    }
  }

  // 加载网站数据（优先使用IndexedDB）
  async loadWebsites(categoryFilter = null) {
    console.log('开始加载网站数据，分类筛选:', categoryFilter);
    
    try {
      this.showLoading();
      
      let websites = [];
      let categoryId = null;
      
      // 如果有分类筛选，转换为分类ID
      if (categoryFilter && categoryFilter !== 'all' && categoryFilter !== '全部') {
        const localCategories = await this.navigationDB.getCategories();
        const category = localCategories.find(cat => cat.name === categoryFilter);
        if (category) {
          categoryId = category.id;
          console.log('分类筛选转换: 名称="' + categoryFilter + '" -> ID="' + categoryId + '"');
        } else {
          console.warn('未找到分类:', categoryFilter);
        }
      }
      
      // 优先使用IndexedDB
      if (this.navigationDB) {
        const localCategories = await this.navigationDB.getCategories();
        
        // 如果有分类数据，说明本地数据库已初始化，优先使用本地数据
        if (localCategories && localCategories.length > 0) {
          // 使用IndexedDB数据加载分类
          const localWebsites = await this.navigationDB.getWebsites(categoryId);
          console.log('从IndexedDB加载的网站数据:', localWebsites.length, '个，分类ID:', categoryId);
          this.allWebsites = localWebsites || [];
          this.applyFilter();
          return;
        }
        
        if (this.allWebsites.length === 0 && (!categoryId || categoryId === 'all')) {
          // 如果本地没有数据，从服务器加载
          console.log('本地无数据，从服务器加载');
          await this.loadAndSyncFromServer(categoryFilter);
          websites = await this.navigationDB.getWebsites(categoryId);
        }
      } else {
        // 如果IndexedDB不可用，从服务器加载
        await this.loadWebsitesFromServer(categoryFilter);
      }
      
    } catch (error) {
      console.error('加载网站数据失败:', error);
      // 降级到服务器加载
      await this.loadWebsitesFromServer(categoryFilter);
    }
  }

  // 渲染网站列表
  renderWebsites(websites) {
    console.log('开始渲染网站列表，网站数量:', websites ? websites.length : 0);
    const container = document.getElementById('websitesContainer');
    if (!container) return;

    if (websites.length === 0) {
      console.log('网站列表为空，显示空状态');
      this.showEmptyState();
      return;
    }

    console.log('渲染网站详情:', websites.map(w => ({ id: w.id, name: w.name, categoryId: w.categoryId, category: w.category })));
    
    const html = websites.map(website => {
      // 获取价格类型标签信息
      const priceTypeInfo = this.getPriceTypeInfo(website.paymentType || website.priceType || 'free');
      
      return `
        <div class="website-card" onclick="window.open('${website.url}', '_blank')">
          <div class="website-icon">${website.icon}</div>
          <div class="website-info">
            <h3 class="website-name">${this.escapeHtml(website.name)}</h3>
            <p class="website-description">${this.escapeHtml(website.description)}</p>
          </div>
          <div class="price-tag ${priceTypeInfo.class}">${priceTypeInfo.label}</div>
          <div class="card-actions">
            <div class="action-icon edit-icon" onclick="event.stopPropagation(); window.navigationApp.handleEditWebsite('${this.escapeHtml(website.name)}');">✏️</div>
            <div class="action-icon delete-icon" onclick="event.stopPropagation(); window.navigationApp.handleDeleteWebsite('${this.escapeHtml(website.name)}');">🗑️</div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    
    // 添加卡片动画
    this.animateCards();
    console.log('网站列表渲染完成');
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
  
  /**
   * 处理编辑网站
   */
  async handleEditWebsite(websiteName) {
    console.log('=== 开始编辑网站流程 ===');
    console.log('传入的网站名称:', websiteName);
    console.log('当前所有网站数据:', this.websites);
    
    try {
      // 根据网站名称从数据库获取完整信息
      const websites = await this.navigationDB.getWebsites();
      console.log('从数据库获取的所有网站:', websites.length, '个');
      
      const website = websites.find(w => w.name === websiteName);
      
      if (!website) {
        console.error('未找到网站:', websiteName);
        console.log('可用的网站名称:', websites.map(w => w.name));
        CustomModal.showError('未找到要编辑的网站');
        return;
      }
      
      console.log('找到网站数据:', website);
      console.log('网站完整信息:', JSON.stringify(website, null, 2));
      
      // 调用编辑弹窗
      if (typeof window.showEditWebsiteModal === 'function') {
        console.log('调用 showEditWebsiteModal 函数');
        window.showEditWebsiteModal(website);
      } else {
        console.error('showEditWebsiteModal 函数不存在');
        console.log('window 对象上的可用函数:', Object.keys(window).filter(key => key.includes('Modal')));
      }
    } catch (error) {
      console.error('编辑网站失败:', error);
      CustomModal.showError('编辑网站失败');
    }
    console.log('=== 编辑网站流程结束 ===');
  }
  
  // 处理删除网站（带确认对话框）
  async handleDeleteWebsite(websiteName) {
    // 使用CustomModal进行确认
    if (typeof CustomModal !== 'undefined' && CustomModal.showConfirm) {
      return new Promise((resolve) => {
        CustomModal.showConfirm(
          `确定要删除网站 "${websiteName}" 吗？`,
          async () => {
            try {
              const result = await this.deleteWebsite(websiteName);
              if (result) {
                utils.showToast(`网站 "${websiteName}" 删除成功！`, 'success');
              }
              resolve(result);
            } catch (error) {
               utils.showToast(`删除网站失败：${error.message}`, 'error');
               resolve(false);
             }
          },
          () => {
            resolve(false);
          }
        );
      });
    } else {
      // 降级到原生confirm
      if (await CustomModal.showConfirm(`确定要删除网站 "${websiteName}" 吗？`)) {
        try {
          const result = await this.deleteWebsite(websiteName);
          if (result) {
            utils.showToast(`网站 "${websiteName}" 删除成功！`, 'success');
          }
          return result;
        } catch (error) {
          utils.showToast(`删除网站失败：${error.message}`, 'error');
          return false;
        }
      }
    }
  }
  
  // 删除网站（不带确认对话框）
  async deleteWebsite(websiteName) {
    try {
      if (!this.navigationDB) {
        throw new Error('数据库未初始化，请刷新页面重试');
      }
      
      // 先根据名称找到网站对象，获取其ID
      const websites = await this.navigationDB.getWebsites();
      const website = websites.find(site => site.name === websiteName);
      
      if (website) {
        const result = await this.navigationDB.deleteWebsite(website.id);
        
        if (result) {
          // 从当前显示的数据中移除该网站
          this.allWebsites = this.allWebsites.filter(site => site.id !== website.id);
          // 重新应用筛选和渲染
          this.applyFilter();
          return true;
        } else {
          throw new Error('删除失败，请重试');
        }
      } else {
        // 尝试重新加载数据，可能是数据同步问题
        await this.loadWebsites(this.currentCategory);
        throw new Error('网站不存在或已被删除');
      }
    } catch (error) {
      // 删除网站失败
      throw error;
    }
  }
  
  // 添加网站到IndexedDB
  async addWebsiteToLocal(websiteData) {
    try {
      if (this.navigationDB) {
        await this.navigationDB.addWebsite(websiteData);
        // 重新加载当前分类的数据
        await this.loadWebsites(this.currentCategory);
      }
    } catch (error) {
      // 加载初始数据失败
    }
  }
  
  // 更新网站到IndexedDB
  async updateWebsiteInLocal(websiteData, originalName) {
    try {
      if (this.navigationDB) {
        // 通过网站名称查找对应的网站ID
        const websites = await this.navigationDB.getWebsites();
        const existingWebsite = websites.find(site => site.name === originalName);
        
        if (existingWebsite) {
          console.log('更新网站数据:', {
            originalName,
            websiteId: existingWebsite.id,
            newData: websiteData
          });
          
          await this.navigationDB.updateWebsite(existingWebsite.id, websiteData);
          // 重新加载当前分类的数据
          await this.loadWebsites(this.currentCategory);
        } else {
          console.error('未找到要更新的网站:', originalName);
        }
      }
    } catch (error) {
      console.error('更新网站到本地失败:', error);
    }
  }
   
  // 切换侧边栏状态
  async toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const isCollapsed = sidebar.classList.toggle('collapsed');
    
    // 保存状态到IndexedDB
    try {
      if (this.navigationDB) {
        const settings = await this.navigationDB.getSettings() || { id: 'main' };
        settings.sidebarCollapsed = isCollapsed;
        settings.updatedAt = Date.now();
        await this.navigationDB._updateSettings(settings);
      }
    } catch (error) {
      // 保存侧边栏状态失败
    }
  }
  
  // 恢复侧边栏状态
  async restoreSidebarState() {
    try {
      if (this.navigationDB) {
        const settings = await this.navigationDB.getSettings();
        if (settings && settings.sidebarCollapsed === true) {
          const sidebar = document.querySelector('.sidebar');
          if (sidebar) {
            sidebar.classList.add('collapsed');
          }
        }
      }
    } catch (error) {
      // 恢复侧边栏状态失败
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigationApp;
} else {
  window.NavigationApp = NavigationApp;
}