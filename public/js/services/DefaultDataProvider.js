/**
 * DefaultDataProvider
 * 优先支持传入的自定义URL测试；否则使用服务端注入的 defaultData。
 */

function normalizePayload(payload) {
  return {
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
    websites: Array.isArray(payload?.websites) ? payload.websites : [],
    filters: Array.isArray(payload?.filters) ? payload.filters : [],
    searchEngines: Array.isArray(payload?.searchEngines) ? payload.searchEngines : []
  };
}

export async function fetchDefaultData(customUrl) {
  const url = (customUrl || '').trim();
  if (url) {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('接口请求失败: ' + res.status);
    const json = await res.json();
    const payload = json?.data || json || {};
    return normalizePayload(payload);
  }

  const payload = (typeof window !== 'undefined' && window.__DEFAULT_DATA__) || {};
  return normalizePayload(payload);
}

export default { fetchDefaultData };