/**
 * 网站数据模型
 * 负责管理网站和分类数据
 */

class Website {
  constructor() {
    this.categories = [   ];

    this.websites = [   ];
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取所有分类
   * @returns {Array} 分类数组
   */
  getAllCategories() {
    return this.categories;
  }

  /**
   * 获取所有网站
   * @returns {Array} 网站数组
   */
  getAllWebsites() {
    return this.websites;
  }

  /**
   * 根据分类获取网站
   * @param {string} category 分类名称
   * @returns {Array} 过滤后的网站数组
   */
  getWebsitesByCategory(category) {
    if (category === '全部') {
      return this.websites;
    }
    return this.websites.filter(site => site.category === category);
  }

  /**
   * 搜索网站
   * @param {string} query 搜索关键词
   * @returns {Array} 搜索结果
   */
  searchWebsites(query) {
    if (!query) {
      return [];
    }
    
    const lowerQuery = query.toLowerCase();
    return this.websites.filter(site => 
      site.name.toLowerCase().includes(lowerQuery) ||
      site.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 添加新网站
   * @param {Object} website 网站对象
   * @returns {Object} 添加的网站对象
   */
  addWebsite(website) {
    const newWebsite = {
      id: this._generateId(),
      name: website.name,
      description: website.description || '',
      url: website.url,
      icon: website.icon || '🌐',
      category: website.category,
      paymentType: website.paymentType || ''
    };
    this.websites.push(newWebsite);
    return newWebsite;
  }

  /**
   * 根据名称获取单个网站
   * @param {string} name 网站名称
   * @returns {Object|null} 网站对象或null
   */
  getWebsiteByName(name) {
    return this.websites.find(site => site.name === name) || null;
  }

  /**
   * 更新网站信息
   * @param {string} originalName 原网站名称
   * @param {Object} updatedWebsite 更新的网站对象
   * @returns {boolean} 是否更新成功
   */
  updateWebsite(originalName, updatedWebsite) {
    const index = this.websites.findIndex(site => site.name === originalName);
    if (index !== -1) {
      this.websites[index] = {
        name: updatedWebsite.name,
        description: updatedWebsite.description || '',
        url: updatedWebsite.url,
        icon: updatedWebsite.icon || '🌐',
        category: updatedWebsite.category,
        paymentType: updatedWebsite.paymentType || ''
      };
      return true;
    }
    return false;
  }

  /**
   * 删除网站
   * @param {string} name 网站名称
   * @returns {boolean} 是否删除成功
   */
  removeWebsite(name) {
    const index = this.websites.findIndex(site => site.name === name);
    if (index !== -1) {
      this.websites.splice(index, 1);
      return true;
    }
    return false;
  }
}

module.exports = Website;