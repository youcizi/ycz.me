/**
 * 网站数据模型
 * 负责管理网站和分类数据
 */

class Website {
  constructor() {
    this.categories = [
      {
        id: 'cat_001',
        name: '全部',
        icon: '🏠',
        active: true,
        order: 1
      },
      {
        id: 'cat_002',
        name: '搜索引擎',
        icon: '🔍',
        active: false,
        order: 2
      },
      {
        id: 'cat_003',
        name: '社交网络',
        icon: '👥',
        active: false,
        order: 3
      },
      {
        id: 'cat_004',
        name: '在线工具',
        icon: '🛠️',
        active: false,
        order: 4
      },
      {
        id: 'cat_005',
        name: '开发者工具',
        icon: '💻',
        active: false,
        order: 5
      },
      {
        id: 'cat_006',
        name: '设计资源',
        icon: '🎨',
        active: false,
        order: 6
      },
      {
        id: 'cat_007',
        name: '学习教育',
        icon: '📚',
        active: false,
        order: 7
      },
      {
        id: 'cat_008',
        name: '娱乐休闲',
        icon: '🎮',
        active: false,
        order: 8
      },
      {
        id: 'cat_009',
        name: '购物网站',
        icon: '🛒',
        active: false,
        order: 9
      },
      {
        id: 'cat_010',
        name: '新闻资讯',
        icon: '📰',
        active: false,
        order: 10
      }
    ];

    this.websites = [
      {
        id: 'web_001',
        name: '百度',
        description: '中国最大的搜索引擎',
        url: 'https://www.baidu.com',
        icon: '🔍',
        category: '搜索引擎',
        paymentType: 'free'
      },
      {
        id: 'web_002',
        name: 'Google',
        description: '全球最大的搜索引擎',
        url: 'https://www.google.com',
        icon: '🔍',
        category: '搜索引擎',
        paymentType: 'free'
      },
      {
        id: 'web_003',
        name: 'Bing',
        description: '微软搜索引擎',
        url: 'https://www.bing.com',
        icon: '🔍',
        category: '搜索引擎',
        paymentType: 'free'
      },
      {
        id: 'web_004',
        name: 'Weibo',
        description: '中国最大的社交平台',
        url: 'https://weibo.com',
        icon: '📱',
        category: '社交网络',
        paymentType: 'free'
      },
      {
        id: 'web_005',
        name: 'WeChat Web',
        description: '微信网页版',
        url: 'https://wx.qq.com',
        icon: '💬',
        category: '社交网络',
        paymentType: 'free'
      },
      {
        id: 'web_006',
        name: 'QQ空间',
        description: 'QQ社交平台',
        url: 'https://qzone.qq.com',
        icon: '⭐',
        category: '社交网络',
        paymentType: 'free'
      },
      {
        id: 'web_007',
        name: '航班信息',
        description: '航班查询服务',
        url: '#',
        icon: '✈️',
        category: '在线工具',
        paymentType: 'trial'
      },
      {
        id: 'web_008',
        name: '网易邮箱',
        description: '网易邮箱服务',
        url: 'https://mail.163.com',
        icon: '📧',
        category: '在线工具',
        paymentType: 'free'
      },
      {
        id: 'web_009',
        name: 'JSON格式化',
        description: '在线JSON格式化工具',
        url: 'https://www.json.cn',
        icon: '🔧',
        category: '在线工具',
        paymentType: 'free'
      },
      {
        id: 'web_010',
        name: '正则表达式测试',
        description: '在线正则表达式测试工具',
        url: 'https://regex101.com',
        icon: '🔍',
        category: '在线工具',
        paymentType: 'free'
      },
      {
        id: 'web_011',
        name: 'Base64编码',
        description: '在线Base64编码解码',
        url: 'https://base64.us',
        icon: '🔐',
        category: '在线工具',
        paymentType: 'free'
      },
      {
        id: 'web_012',
        name: '淘宝',
        description: '中国最大的网购平台',
        url: 'https://www.taobao.com',
        icon: '🛍️',
        category: '购物网站',
        paymentType: 'free'
      },
      {
        id: 'web_013',
        name: '京东',
        description: '品质购物平台',
        url: 'https://www.jd.com',
        icon: '📦',
        category: '购物网站',
        paymentType: 'free'
      },
      {
        id: 'web_014',
        name: 'GitHub',
        description: '代码托管平台',
        url: 'https://github.com',
        icon: '💻',
        category: '开发者工具',
        paymentType: 'paid'
      },
      {
        id: 'web_015',
        name: '有道翻译',
        description: '在线翻译工具',
        url: 'https://fanyi.youdao.com',
        icon: '🔤',
        category: '在线工具',
        paymentType: 'free'
      },
      {
        id: 'web_016',
        name: '百度网盘',
        description: '云存储服务',
        url: 'https://pan.baidu.com',
        icon: '☁️',
        category: '在线工具',
        paymentType: 'points'
      },
      {
        id: 'web_017',
        name: '爱奇艺',
        description: '视频娱乐平台',
        url: 'https://www.iqiyi.com',
        icon: '🎬',
        category: '娱乐休闲',
        paymentType: 'paid'
      }
    ];
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