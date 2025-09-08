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
    this.categoryManager = null;
    this.init();
  }

  // 初始化应用
  async init() {
    this.bindEvents();
    this.initSidebarState();
    await this.initStorage();
    this.initCategoryManager();
    this.loadInitialData();
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
      console.error('存储初始化失败:', error);
    }
  }

  // 初始化分类管理器
  initCategoryManager() {
    if (typeof CategoryManager !== 'undefined' && this.navigationDB) {
      this.categoryManager = new CategoryManager(this.navigationDB, this.storageIntegration);
      // 将categoryManager设为全局变量，供模板中的onclick使用
      window.categoryManager = this.categoryManager;
    }
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

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigationApp;
} else {
  window.NavigationApp = NavigationApp;
}