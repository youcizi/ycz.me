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

  return {  };
}

export default { fetchDefaultData };