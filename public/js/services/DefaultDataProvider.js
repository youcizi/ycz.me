/**
 * DefaultDataProvider
 * 提供默认数据（模拟异步接口），用于首访初始化与“恢复默认”
 */

// 模拟异步延迟
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchDefaultData() {
  // 模拟后端接口请求延迟
  await delay(150);

  const now = new Date().toISOString();

  return {
    categories: [
      {
        id: 'default-category',
        name: '默认分类',
        icon: '📁',
        color: '#3b82f6',
        description: '系统默认分类',
        order: 0,
        parentId: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'tools-category',
        name: '工具网站',
        icon: '📁',
        color: '#10b981',
        description: '常用工具网站',
        order: 1,
        parentId: null,
        createdAt: now,
        updatedAt: now
      }
    ],
    websites: [
      {
        id: 'baidu-website',
        name: '百度',
        url: 'https://www.baidu.com',
        description: '百度搜索引擎',
        icon: '',
        categoryId: 'default-category',
        order: 0,
        paymentType: 'free',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'github-website',
        name: 'GitHub',
        url: 'https://github.com',
        description: '代码托管平台',
        icon: '',
        categoryId: 'tools-category',
        order: 0,
        paymentType: 'free',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'google-website',
        name: 'Google',
        url: 'https://www.google.com',
        description: 'Google搜索引擎',
        icon: '',
        categoryId: 'default-category',
        order: 1,
        paymentType: 'free',
        createdAt: now,
        updatedAt: now
      }
    ],
    filters: [
      { id: 'filter-free', name: '免费', key: 'free', backgroundColor: '#10b981', order: 0, createdAt: now, updatedAt: now },
      { id: 'filter-paid', name: '付费', key: 'paid', backgroundColor: '#ef4444', order: 1, createdAt: now, updatedAt: now },
      { id: 'filter-points', name: '积分', key: 'points', backgroundColor: '#f59e0b', order: 2, createdAt: now, updatedAt: now }
    ],
    searchEngines: [
      { id: 'engine-google', name: 'Google', template: 'https://www.google.com/search?q={q}', icon: '🔍', order: 0, createdAt: now, updatedAt: now },
      { id: 'engine-baidu', name: '百度', template: 'https://www.baidu.com/s?wd={q}', icon: '🔍', order: 1, createdAt: now, updatedAt: now },
      { id: 'engine-bing', name: '必应', template: 'https://www.bing.com/search?q={q}', icon: '🔍', order: 2, createdAt: now, updatedAt: now }
    ]
  };
}

export default { fetchDefaultData };