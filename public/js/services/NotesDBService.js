/**
 * NotesDBService
 * 独立的 IndexedDB 存储，用于在线笔记（分类与笔记）
 */
export default class NotesDBService {
  constructor() {
    this.dbName = 'NotesDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains('noteCategories')) {
          const cat = db.createObjectStore('noteCategories', { keyPath: 'id' });
          cat.createIndex('name', 'name', { unique: false });
          cat.createIndex('order', 'order', { unique: false });
        }
        if (!db.objectStoreNames.contains('notes')) {
          const note = db.createObjectStore('notes', { keyPath: 'id' });
          note.createIndex('categoryId', 'categoryId', { unique: false });
          note.createIndex('title', 'title', { unique: false });
          note.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
    });
    return this.db;
  }

  tx(store, mode, cb) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.init();
        const t = db.transaction([store], mode);
        const s = t.objectStore(store);
        const r = cb(s);
        if (r && typeof r.then === 'function') {
          r.then(resolve).catch(reject);
        } else if (r && r.onsuccess !== undefined) {
          r.onsuccess = (e) => resolve(e.target.result);
          r.onerror = () => reject(r.error);
        } else {
          resolve(r);
        }
      } catch (e) { reject(e); }
    });
  }

  // id 生成
  genId() { return 'n_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }

  // 分类 CRUD
  getCategories() { return this.tx('noteCategories', 'readonly', s => s.getAll()); }
  addCategory(cat) {
    const payload = { id: this.genId(), name: cat.name || '未命名', icon: cat.icon || '📁', order: cat.order || 0 };
    return this.tx('noteCategories', 'readwrite', s => s.add(payload));
  }
  updateCategory(cat) { return this.tx('noteCategories', 'readwrite', s => s.put(cat)); }
  deleteCategory(id) { return this.tx('noteCategories', 'readwrite', s => s.delete(id)); }

  // 笔记 CRUD
  getNotes() { return this.tx('notes', 'readonly', s => s.getAll()); }
  getNotesByCategory(categoryId) {
    return this.tx('notes', 'readonly', s => new Promise((resolve, reject) => {
      const idx = s.index('categoryId');
      const range = categoryId ? IDBKeyRange.only(categoryId) : null;
      const req = range ? idx.openCursor(range) : s.openCursor();
      const out = [];
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) { out.push(cur.value); cur.continue(); } else { resolve(out); }
      };
      req.onerror = () => reject(req.error);
    }));
  }
  addNote(note) {
    const now = Date.now();
    const payload = {
      id: this.genId(),
      title: note.title || '未命名笔记',
      content: note.content || '',
      categoryId: note.categoryId || null,
      createdAt: now,
      updatedAt: now
    };
    return this.tx('notes', 'readwrite', s => s.add(payload));
  }
  updateNote(note) {
    const payload = { ...note, updatedAt: Date.now() };
    return this.tx('notes', 'readwrite', s => s.put(payload));
  }
  deleteNote(id) { return this.tx('notes', 'readwrite', s => s.delete(id)); }

  // 导入导出
  async exportAll() {
    const [cats, notes] = await Promise.all([this.getCategories(), this.getNotes()]);
    return { categories: cats, notes };
  }
  async importAll(json) {
    const { categories = [], notes = [] } = json || {};
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const t = db.transaction(['noteCategories','notes'], 'readwrite');
      const cs = t.objectStore('noteCategories');
      const ns = t.objectStore('notes');
      categories.forEach(c => { try { cs.put(c); } catch(e){} });
      notes.forEach(n => { try { ns.put(n); } catch(e){} });
      t.oncomplete = () => resolve(true);
      t.onerror = () => reject(t.error);
    });
  }
}