/**
 * ConfigService
 * 管理站点级配置（使用 localStorage 持久化）
 */

const STORAGE_KEYS = {
  customDefaultApiUrl: 'navApi.customDefaultUrl',
  syncApiUrl: 'navApi.syncUrl'
};

class ConfigService {
  getCustomDefaultApiUrl() {
    try {
      return localStorage.getItem(STORAGE_KEYS.customDefaultApiUrl) || '';
    } catch (e) {
      console.warn('读取自定义默认API地址失败:', e);
      return '';
    }
  }

  setCustomDefaultApiUrl(url) {
    try {
      const v = (url || '').trim();
      if (!v) {
        localStorage.removeItem(STORAGE_KEYS.customDefaultApiUrl);
        return '';
      }
      localStorage.setItem(STORAGE_KEYS.customDefaultApiUrl, v);
      return v;
    } catch (e) {
      console.warn('保存自定义默认API地址失败:', e);
      return '';
    }
  }

  clearCustomDefaultApiUrl() {
    try {
      localStorage.removeItem(STORAGE_KEYS.customDefaultApiUrl);
    } catch (e) {
      console.warn('清除自定义默认API地址失败:', e);
    }
  }

  // ================= 同步API =================
  getSyncApiUrl() {
    try {
      return localStorage.getItem(STORAGE_KEYS.syncApiUrl) || '';
    } catch (e) {
      console.warn('读取同步API地址失败:', e);
      return '';
    }
  }

  setSyncApiUrl(url) {
    try {
      const v = (url || '').trim();
      if (!v) {
        localStorage.removeItem(STORAGE_KEYS.syncApiUrl);
        return '';
      }
      localStorage.setItem(STORAGE_KEYS.syncApiUrl, v);
      return v;
    } catch (e) {
      console.warn('保存同步API地址失败:', e);
      return '';
    }
  }

  clearSyncApiUrl() {
    try {
      localStorage.removeItem(STORAGE_KEYS.syncApiUrl);
    } catch (e) {
      console.warn('清除同步API地址失败:', e);
    }
  }
}

// 导出单例
const configService = new ConfigService();
export default configService;