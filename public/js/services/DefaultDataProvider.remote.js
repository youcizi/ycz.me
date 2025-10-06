/**
 * DefaultDataProvider (Remote-aware)
 * 提供默认数据：优先自定义接口，其次站点默认接口，失败回退内置示例。
 */

import configService from './ConfigService.js';

const SITE_DEFAULT_API = 'https://ycz.me/api/nav.index/default';

function buildFallbackData() {
  const now = new Date().toISOString();
  return {
    categories: [
      { id: 'default-category', name: '默认分类', icon: '📁', color: '#3b82f6', description: '系统默认分类', order: 0, parentId: null, createdAt: now, updatedAt: now },
      { id: 'tools-category', name: '工具网站', icon: '📁', color: '#10b981', description: '常用工具网站', order: 1, parentId: null, createdAt: now, updatedAt: now }
    ],
    websites: [
      { id: 'baidu-website', name: '百度', url: 'https://www.baidu.com', description: '百度搜索引擎', icon: '', categoryId: 'default-category', order: 0, paymentType: 'free', createdAt: now, updatedAt: now },
      { id: 'github-website', name: 'GitHub', url: 'https://github.com', description: '代码托管平台', icon: '', categoryId: 'tools-category', order: 0, paymentType: 'free', createdAt: now, updatedAt: now },
      { id: 'google-website', name: 'Google', url: 'https://www.google.com', description: 'Google搜索引擎', icon: '', categoryId: 'default-category', order: 1, paymentType: 'free', createdAt: now, updatedAt: now }
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

function isValidPayload(data) {
  if (!data || typeof data !== 'object') return false;
  return (
    Array.isArray(data.websites) ||
    Array.isArray(data.categories) ||
    Array.isArray(data.filters) ||
    Array.isArray(data.searchEngines)
  );
}

export async function fetchDefaultData() {
  const customUrl = configService.getCustomDefaultApiUrl();
  const trialUrls = [];
  if (customUrl && customUrl.trim()) trialUrls.push(customUrl.trim());
  trialUrls.push(SITE_DEFAULT_API);

  for (const url of trialUrls) {
    try {
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) throw new Error(`接口返回状态 ${resp.status}`);
      const json = await resp.json();
      const payload = json?.data || json;
      if (isValidPayload(payload)) {
        return {
          categories: payload.categories || [],
          websites: payload.websites || [],
          filters: payload.filters || [],
          searchEngines: payload.searchEngines || []
        };
      }
      console.warn('默认数据接口返回数据不符合规范，继续尝试其他来源');
    } catch (e) {
      console.warn(`获取默认数据失败 (${url})`, e);
    }
  }
  return buildFallbackData();
}

export default { fetchDefaultData };