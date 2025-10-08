// 简易聊天历史 IndexedDB 服务：独立 ChatDB，不影响现有 NavigationDB
// Stores:
// - conversations: { id, title, createdAt, updatedAt }
// - messages: { id, conversationId, role, content, createdAt }

const ChatDBService = (() => {
  const DB_NAME = 'ChatDB';
  const DB_VERSION = 2;
  const STORES = {
    conversations: 'conversations',
    messages: 'messages',
    modelConfigs: 'modelConfigs'
  };

  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { db = req.result; resolve(db); };
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORES.conversations)) {
          d.createObjectStore(STORES.conversations, { keyPath: 'id' });
        }
        if (!d.objectStoreNames.contains(STORES.messages)) {
          const store = d.createObjectStore(STORES.messages, { keyPath: 'id' });
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        // v2: 模型配置
        if (!d.objectStoreNames.contains(STORES.modelConfigs)) {
          const cfg = d.createObjectStore(STORES.modelConfigs, { keyPath: 'id' });
          cfg.createIndex('updatedAt', 'updatedAt', { unique: false });
          cfg.createIndex('name', 'name', { unique: false });
          cfg.createIndex('provider', 'provider', { unique: false });
          cfg.createIndex('model', 'model', { unique: false });
        }
      };
    });
  }

  function tx(storeNames, mode = 'readonly') {
    return db.transaction(storeNames, mode);
  }

  async function init() {
    if (!db) await openDB();
    return db;
  }

  async function addConversation(conv) {
    await init();
    return new Promise((resolve, reject) => {
      const t = tx([STORES.conversations], 'readwrite');
      const req = t.objectStore(STORES.conversations).add(conv);
      req.onsuccess = () => resolve(conv);
      req.onerror = () => reject(req.error);
    });
  }

  async function updateConversation(conv) {
    await init();
    // 仅写入必要且可克隆的纯字段，规避 Vue Proxy 等不可克隆对象
    const plain = {
      id: conv && conv.id,
      title: conv && conv.title,
      createdAt: conv && conv.createdAt,
      updatedAt: conv && conv.updatedAt
    };
    return new Promise((resolve, reject) => {
      const t = tx([STORES.conversations], 'readwrite');
      const req = t.objectStore(STORES.conversations).put(plain);
      req.onsuccess = () => resolve(plain);
      req.onerror = () => reject(req.error);
    });
  }

  async function listConversations() {
    await init();
    return new Promise((resolve, reject) => {
      const t = tx([STORES.conversations], 'readonly');
      const req = t.objectStore(STORES.conversations).getAll();
      req.onsuccess = () => {
        const list = (req.result || []).sort((a,b) => (b.updatedAt||b.createdAt) - (a.updatedAt||a.createdAt));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function addMessage(msg) {
    await init();
    return new Promise((resolve, reject) => {
      const t = tx([STORES.messages], 'readwrite');
      const req = t.objectStore(STORES.messages).add(msg);
      req.onsuccess = () => resolve(msg);
      req.onerror = () => reject(req.error);
    });
  }

  async function listMessages(conversationId) {
    await init();
    return new Promise((resolve, reject) => {
      const t = tx([STORES.messages], 'readonly');
      const idx = t.objectStore(STORES.messages).index('conversationId');
      const req = idx.getAll(conversationId);
      req.onsuccess = () => {
        const list = (req.result || []).sort((a,b) => a.createdAt - b.createdAt);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function clearConversation(conversationId) {
    await init();
    return new Promise((resolve, reject) => {
      const t = tx([STORES.messages], 'readwrite');
      const store = t.objectStore(STORES.messages);
      const idx = store.index('conversationId');
      const req = idx.getAll(IDBKeyRange.only(conversationId));
      req.onsuccess = () => {
        const list = req.result || [];
        try {
          list.forEach(m => store.delete(m.id));
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteConversation(conversationId) {
    await init();
    // 先清空消息，再删除会话记录
    await clearConversation(conversationId);
    return new Promise((resolve, reject) => {
      const t = tx([STORES.conversations], 'readwrite');
      const req = t.objectStore(STORES.conversations).delete(conversationId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteMessage(messageId) {
    await init();
    return new Promise((resolve, reject) => {
      const t = tx([STORES.messages], 'readwrite');
      const req = t.objectStore(STORES.messages).delete(messageId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function countMessages(conversationId) {
    await init();
    return new Promise((resolve, reject) => {
      const t = tx([STORES.messages], 'readonly');
      const idx = t.objectStore(STORES.messages).index('conversationId');
      const req = idx.count(IDBKeyRange.only(conversationId));
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  }

  // ===== 模型配置 CRUD =====
  function genId(prefix = 'mc_') { return prefix + Date.now() + '_' + Math.floor(Math.random() * 10000); }

  async function addModelConfig(config) {
    await init();
    const now = Date.now();
    const plain = {
      id: config?.id || genId(),
      name: (config?.name || '未命名').trim(),
      provider: (config?.provider || '').trim(),
      baseUrl: (config?.baseUrl || '').trim(),
      apiKey: (config?.apiKey || '').trim(),
      model: (config?.model || '').trim(),
      systemPrompt: config?.systemPrompt || '',
      temperature: typeof config?.temperature === 'number' ? config.temperature : 0.7,
      streamTimeoutSec: parseInt(config?.streamTimeoutSec || 90, 10),
      createdAt: config?.createdAt || now,
      updatedAt: now
    };
    return new Promise((resolve, reject) => {
      const t = tx([STORES.modelConfigs], 'readwrite');
      const req = t.objectStore(STORES.modelConfigs).add(plain);
      req.onsuccess = () => resolve(plain);
      req.onerror = () => reject(req.error);
    });
  }

  async function updateModelConfig(config) {
    await init();
    const now = Date.now();
    const plain = {
      id: config?.id,
      name: (config?.name || '未命名').trim(),
      provider: (config?.provider || '').trim(),
      baseUrl: (config?.baseUrl || '').trim(),
      apiKey: (config?.apiKey || '').trim(),
      model: (config?.model || '').trim(),
      systemPrompt: config?.systemPrompt || '',
      temperature: typeof config?.temperature === 'number' ? config.temperature : 0.7,
      streamTimeoutSec: parseInt(config?.streamTimeoutSec || 90, 10),
      createdAt: config?.createdAt || now,
      updatedAt: now
    };
    if (!plain.id) throw new Error('配置ID不能为空');
    return new Promise((resolve, reject) => {
      const t = tx([STORES.modelConfigs], 'readwrite');
      const req = t.objectStore(STORES.modelConfigs).put(plain);
      req.onsuccess = () => resolve(plain);
      req.onerror = () => reject(req.error);
    });
  }

  async function listModelConfigs() {
    await init();
    return new Promise((resolve, reject) => {
      const t = tx([STORES.modelConfigs], 'readonly');
      const req = t.objectStore(STORES.modelConfigs).getAll();
      req.onsuccess = () => {
        const list = (req.result || []).sort((a,b) => (b.updatedAt||b.createdAt) - (a.updatedAt||a.createdAt));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getModelConfigById(id) {
    await init();
    return new Promise((resolve, reject) => {
      const t = tx([STORES.modelConfigs], 'readonly');
      const req = t.objectStore(STORES.modelConfigs).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteModelConfig(id) {
    await init();
    return new Promise((resolve, reject) => {
      const t = tx([STORES.modelConfigs], 'readwrite');
      const req = t.objectStore(STORES.modelConfigs).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    init,
    addConversation,
    updateConversation,
    listConversations,
    addMessage,
    listMessages,
    clearConversation,
    deleteMessage,
    countMessages,
    deleteConversation,
    // 模型配置
    addModelConfig,
    updateModelConfig,
    listModelConfigs,
    getModelConfigById,
    deleteModelConfig
  };
})();

export default ChatDBService;