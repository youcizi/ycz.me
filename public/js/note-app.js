import NotesDBService from './services/NotesDBService.js';

const db = new NotesDBService();

const app = Vue.createApp({
  data() {
    return {
      categories: [],
      notes: [],
      currentCategoryId: null,
      currentNoteId: null,
      noteMenuId: null,
      searchQuery: '',
      // editor
      noteTitle: '',
      noteContent: '',
      mdEditor: null,
      isSidebarCollapsed: false
    };
  },
  computed: {
    currentCategoryLabel() {
      const cat = this.categories.find(c => c.id === this.currentCategoryId);
      return cat ? cat.name : '全部笔记';
    },
    filteredNotes() {
      const q = (this.searchQuery || '').trim().toLowerCase();
      let list = this.notes;
      if (this.currentCategoryId) {
        list = list.filter(n => n.categoryId === this.currentCategoryId);
      }
      if (q) {
        list = list.filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));
      }
      // 按更新时间排序
      return list.slice().sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
    }
  },
  methods: {
    async loadAll() {
      await db.init();
      const [cats, notes] = await Promise.all([db.getCategories(), db.getNotes()]);
      this.categories = cats;
      this.notes = notes;
      // 若无分类，初始化一个默认分类
      if (this.categories.length === 0) {
        await db.addCategory({ name: '默认' });
        this.categories = await db.getCategories();
      }
    },
    selectCategory(id) {
      this.currentCategoryId = id;
      // 清空菜单
      this.noteMenuId = null;
    },
    async addCategory() {
      const name = await CustomModal.showPrompt('请输入分类名称：', '添加分类', '新分类');
      if (!name || name === true) return;
      await db.addCategory({ name });
      this.categories = await db.getCategories();
    },
    async renameCategory(id) {
      const cat = this.categories.find(c => c.id === id);
      if (!cat) return;
      const name = await CustomModal.showPrompt('重命名分类：', '重命名', cat.name);
      if (!name || name === true) return;
      cat.name = name;
      await db.updateCategory(cat);
      this.categories = await db.getCategories();
    },
    async deleteCategory(id) {
      const ok = await CustomModal.showConfirm('确定删除该分类？分类下的笔记不会自动删除。', '删除分类');
      if (!ok) return;
      await db.deleteCategory(id);
      this.categories = await db.getCategories();
      if (this.currentCategoryId === id) this.currentCategoryId = null;
    },

    async addNote() {
      const title = await CustomModal.showPrompt('请输入笔记标题：', '新建笔记', '新笔记');
      const categoryId = this.currentCategoryId || null;
      await db.addNote({ title: (title && title !== true) ? title : '新笔记', content: '', categoryId });
      this.notes = await db.getNotes();
    },
    async renameNote(id) {
      const n = this.notes.find(x => x.id === id);
      if (!n) return;
      const title = await CustomModal.showPrompt('重命名笔记：', '重命名', n.title || '');
      if (title == null || title === true) return;
      n.title = title || '未命名笔记';
      await db.updateNote(n);
      this.notes = await db.getNotes();
    },
    async deleteNote(id) {
      const ok = await CustomModal.showConfirm('确定删除该笔记？', '删除笔记');
      if (!ok) return;
      await db.deleteNote(id);
      this.notes = await db.getNotes();
      if (this.currentNoteId === id) {
        this.currentNoteId = null;
        this.noteTitle = '';
        this.noteContent = '';
        if (this.mdEditor) this.mdEditor.value('');
      }
    },

    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
      const root = document.getElementById('app');
      if (root) {
        if (this.isSidebarCollapsed) root.classList.add('note-collapsed');
        else root.classList.remove('note-collapsed');
      }
      this.$nextTick(() => this.updateLayoutHeights());
    },

    updateLayoutHeights() {
      const appEl = document.getElementById('app');
      if (!appEl) return;

      // 视口高度与顶部导航高度
      const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      const topBar = appEl.querySelector('.top-bar');
      const topBarH = topBar ? topBar.offsetHeight : 0;

      // 设置主内容区 note-main 的确切高度，避免整页滚动
      const noteMain = appEl.querySelector('.note-main');
      if (noteMain) {
        noteMain.style.height = Math.max(0, vh - topBarH) + 'px';
      }

      // 计算右侧内容区的可用高度（扣除内容头部和内边距）
      const noteContent = appEl.querySelector('.note-content');
      const contentHeader = appEl.querySelector('.content-header-row');
      const contentHeaderH = contentHeader ? contentHeader.offsetHeight : 0;
      let paddingTB = 0;
      if (noteContent) {
        const cs = getComputedStyle(noteContent);
        paddingTB = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      }

      // 可用高度
      const available = Math.max(120, (noteMain ? noteMain.clientHeight : (vh - topBarH)) - contentHeaderH - paddingTB);

      // 左侧列表与右侧编辑器的高度设置
      const editor = appEl.querySelector('.note-editor');
      const list = appEl.querySelector('.note-list');
      if (editor) {
        editor.style.minHeight = available + 'px';
      }
      if (list) {
        list.style.maxHeight = available + 'px';
        list.style.overflow = 'auto';
      }

      // 调整 EasyMDE / CodeMirror 高度
      if (this.mdEditor && this.mdEditor.codemirror) {
        const toolbar = appEl.querySelector('.editor-toolbar');
        const toolbarH = toolbar ? toolbar.offsetHeight : 0;
        const editorAvailable = Math.max(200, available - toolbarH - 16);
        try {
          this.mdEditor.codemirror.setSize('100%', editorAvailable);
        } catch (_) {}
      }
    },
    selectNote(id) {
      this.currentNoteId = id;
      const n = this.notes.find(x => x.id === id);
      this.noteTitle = n?.title || '';
      this.noteContent = n?.content || '';
      if (this.mdEditor) this.mdEditor.value(n?.content || '');
    },
    async saveNote() {
      const content = this.mdEditor ? this.mdEditor.value() : (this.noteContent || '');
      if (!this.currentNoteId) {
        const categoryId = this.currentCategoryId || null;
        const resId = await db.addNote({ title: this.noteTitle || '未命名笔记', content: content, categoryId });
        this.notes = await db.getNotes();
        const created = this.notes.find(n => n.id === resId?.id || n.title === (this.noteTitle || '未命名笔记'));
        if (created) this.currentNoteId = created.id;
        return;
      }
      const n = this.notes.find(x => x.id === this.currentNoteId);
      if (!n) return;
      n.title = this.noteTitle || '未命名笔记';
      n.content = content;
      await db.updateNote(n);
      this.notes = await db.getNotes();
      alert('已保存');
    },
    clearEditor() {
      this.noteTitle = '';
      this.noteContent = '';
      if (this.mdEditor) this.mdEditor.value('');
    },

    async exportNotes() {
      const json = await db.exportAll();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'notes-export.json';
      a.click();
      URL.revokeObjectURL(url);
    },
    async importNotes(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const json = JSON.parse(text);
      await db.importAll(json);
      await this.loadAll();
      await CustomModal.showSuccess('导入完成');
      e.target.value = '';
    }
  },
  async mounted() {
    await this.loadAll();
    this.mdEditor = new EasyMDE({
      element: document.getElementById('md-editor'),
      spellChecker: false,
      autofocus: false,
      status: false,
      placeholder: '在此输入Markdown内容',
      toolbar: ['bold','italic','heading','|','unordered-list','ordered-list','|','link','image','table','|','preview','side-by-side','fullscreen','|','guide']
    });
    // 初始计算布局高度
    this.$nextTick(() => this.updateLayoutHeights());
    // 监听窗口尺寸变化
    window.addEventListener('resize', this.updateLayoutHeights);
  },
  unmounted() {
    window.removeEventListener('resize', this.updateLayoutHeights);
  }
});

app.mount('#app');