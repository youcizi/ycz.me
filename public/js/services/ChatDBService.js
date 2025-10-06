// 简易聊天历史 IndexedDB 服务：独立 ChatDB，不影响现有 NavigationDB
// Stores:
// - conversations: { id, title, createdAt, updatedAt }
// - messages: { id, conversationId, role, content, createdAt }

const ChatDBService = (() => {
  const DB_NAME = 'ChatDB';
  const DB_VERSION = 1;
  const STORES = {
    conversations: 'conversations',
    messages: 'messages'
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
    deleteConversation
  };
})();

export default ChatDBService;