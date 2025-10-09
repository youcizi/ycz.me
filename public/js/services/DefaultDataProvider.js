/**
 * DefaultDataProvider (Server-injected)
 * 仅使用 Koa 服务端注入的 defaultData，移除前端重复来源。
 */

export async function fetchDefaultData() {
  const payload = (typeof window !== 'undefined' && window.__DEFAULT_DATA__) || {};
  return {
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    websites: Array.isArray(payload.websites) ? payload.websites : [],
    filters: Array.isArray(payload.filters) ? payload.filters : [],
    searchEngines: Array.isArray(payload.searchEngines) ? payload.searchEngines : []
  };
}

export default { fetchDefaultData };