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
      noteCategoryId: null,
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
    // 安全设置编辑器内容：避免 ProseMirror 事务冲突，如失败则重建编辑器
    setEditorContentSafe(content) {
      const editor = this.mdEditor;
      const text = content || '';
      // 若编辑器未就绪，直接重建
      if (!editor || typeof editor.setMarkdown !== 'function') {
        this.recreateEditor(text);
        return;
      }
      // 保证在 WYSIWYG 模式下设置内容
      try {
        if (typeof editor.isMarkdownMode === 'function' && editor.isMarkdownMode()) {
          editor.changeMode('wysiwyg');
        }
      } catch (_) {}

      const doSet = () => {
        try {
          editor.setMarkdown(text, false);
        } catch (err) {
          const msg = String((err && err.message) || '');
          // 遇到事务不匹配或其他内部错误，回退到重建实例
          console.warn('setMarkdown error, fallback to recreate:', err);
          this.recreateEditor(text);
          return;
        }
        // 下一帧再移动光标与聚焦，避免事务重入
        requestAnimationFrame(() => {
          try {
            if (typeof editor.focus === 'function') editor.focus();
            if (typeof editor.moveCursorToEnd === 'function') editor.moveCursorToEnd();
          } catch (e2) {
            console.warn('editor focus/cursor error:', e2);
          }
        });
      };
      this.$nextTick(() => requestAnimationFrame(doSet));
    },

    // 重建编辑器实例并设置初始内容
    recreateEditor(initialValue = '') {
      const el = document.getElementById('md-editor');
      if (!el) return;
      try {
        if (this.mdEditor && typeof this.mdEditor.destroy === 'function') {
          this.mdEditor.destroy();
        }
      } catch (_) {}
      // 清空容器，避免旧 UI 残留
      try { el.innerHTML = ''; } catch (_) {}
      try {
        this.mdEditor = new toastui.Editor({
          el,
          initialEditType: 'wysiwyg',
          previewStyle: 'vertical',
          initialValue: initialValue || '',
          placeholder: '在此输入Markdown内容'
        });
        try { window.__EDITOR_INST__ = this.mdEditor; } catch (_) {}
      } catch (e) {
        console.error('重新初始化编辑器失败', e);
        this.mdEditor = null;
      }
    },
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
      // 在弹窗中同时设置标题与分类
      const optionsHtml = [
        `<option value="">未分类</option>`,
        ...this.categories.map(c => `<option value="${c.id}" ${this.currentCategoryId === c.id ? 'selected' : ''}>${c.name}</option>`)
      ].join('');
      const html = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <label style="font-weight:600;">标题</label>
          <input id="newNoteTitle" type="text" placeholder="请输入笔记标题" value="新笔记" style="padding:8px; border:1px solid #ddd; border-radius:6px;">
          <label style="font-weight:600;">分类</label>
          <select id="newNoteCategory" style="padding:8px; border:1px solid #ddd; border-radius:6px;">
            ${optionsHtml}
          </select>
        </div>`;

      let chosenTitle = '新笔记';
      let chosenCat = this.currentCategoryId || null;
      const promise = CustomModal.showHtml(html, '新建笔记', { showCancel: true, confirmText: '创建', cancelText: '取消' });
      // 捕获确认时的输入值
      setTimeout(() => {
        const modalEl = document.getElementById('customModal');
        const confirmBtn = modalEl && modalEl.querySelector('#modalFooter .modal-btn.primary');
        if (confirmBtn) {
          confirmBtn.addEventListener('click', () => {
            const titleInput = document.getElementById('newNoteTitle');
            const sel = document.getElementById('newNoteCategory');
            chosenTitle = titleInput ? (titleInput.value || '新笔记') : '新笔记';
            const val = sel ? sel.value : '';
            chosenCat = val ? val : null;
          }, { once: true });
        }
        const ti = document.getElementById('newNoteTitle');
        if (ti) ti.focus();
      }, 50);
      const ok = await promise;
      if (!ok) return;

      this.currentNoteId = null;
      this.noteTitle = chosenTitle;
      this.noteContent = '';
      this.noteCategoryId = chosenCat;
      this.setEditorContentSafe('');
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

    async changeNoteCategory(id) {
      const n = this.notes.find(x => x.id === id);
      if (!n) return;
      const optionsHtml = [
        `<option value="">未分类</option>`,
        ...this.categories.map(c => `<option value="${c.id}" ${n.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`)
      ].join('');
      const html = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <label style="font-weight:600;">分类</label>
          <select id="editNoteCategory" style="padding:8px; border:1px solid #ddd; border-radius:6px;">
            ${optionsHtml}
          </select>
        </div>`;

      let selectedCat = n.categoryId || null;
      const promise = CustomModal.showHtml(html, '修改分类', { showCancel: true, confirmText: '保存', cancelText: '取消' });
      setTimeout(() => {
        const modalEl = document.getElementById('customModal');
        const confirmBtn = modalEl && modalEl.querySelector('#modalFooter .modal-btn.primary');
        if (confirmBtn) {
          confirmBtn.addEventListener('click', () => {
            const sel = document.getElementById('editNoteCategory');
            const val = sel ? sel.value : '';
            selectedCat = val ? val : null;
          }, { once: true });
        }
        const selEl = document.getElementById('editNoteCategory');
        if (selEl) selEl.focus();
      }, 50);

      const ok = await promise;
      if (!ok) return;
      n.categoryId = selectedCat;
      await db.updateNote(n);
      this.notes = await db.getNotes();
      // 若当前选中的是此笔记，同步编辑态
      if (this.currentNoteId === id) {
        this.noteCategoryId = selectedCat;
      }
      this.noteMenuId = null;
    },

    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
      const root = document.getElementById('app');
      if (root) {
        if (this.isSidebarCollapsed) root.classList.add('note-collapsed');
        else root.classList.remove('note-collapsed');
      }
    },

    // 移除自动高度设置：保持为占位方法，避免旧调用报错
    updateLayoutHeights() { /* no-op: rely on CSS relative units */ },
    selectNote(id) {
      this.currentNoteId = id;
      const n = this.notes.find(x => x.id === id);
      this.noteTitle = n?.title || '';
      this.noteContent = n?.content || '';
      this.noteCategoryId = n?.categoryId || null;
      this.setEditorContentSafe(n?.content || '');
    },
    async saveNote() {
      const content = this.mdEditor && typeof this.mdEditor.getMarkdown === 'function'
        ? this.mdEditor.getMarkdown()
        : (this.noteContent || '');
      if (!this.currentNoteId) {
        const categoryId = (this.noteCategoryId != null) ? this.noteCategoryId : (this.currentCategoryId || null);
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
      n.categoryId = (this.noteCategoryId != null) ? this.noteCategoryId : n.categoryId;
      await db.updateNote(n);
      this.notes = await db.getNotes();
      try {
        if (window.CustomModal && typeof window.CustomModal.showSuccess === 'function') {
          await window.CustomModal.showSuccess('已保存');
        } else if (typeof CustomModal !== 'undefined' && typeof CustomModal.showAlert === 'function') {
          await CustomModal.showAlert('已保存', '提示', 'success');
        }
      } catch (_) {}
    },
    clearEditor() {
      this.noteTitle = '';
      this.noteContent = '';
      if (this.mdEditor && typeof this.mdEditor.setMarkdown === 'function') this.mdEditor.setMarkdown('');
    },
    async copyNoteContent() {
      const text = this.mdEditor && typeof this.mdEditor.getMarkdown === 'function'
        ? this.mdEditor.getMarkdown()
        : (this.noteContent || '');
      try {
        if (!text) {
          await CustomModal.showWarning('当前内容为空，未复制');
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.top = '-9999px';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        await CustomModal.showSuccess('内容已复制到剪贴板');
      } catch (e) {
        console.warn('复制失败', e);
        await CustomModal.showError('复制失败，请手动复制');
      }
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
    // 使用 Toast UI Editor 替换 EasyMDE
    try {
      this.mdEditor = new toastui.Editor({
        el: document.getElementById('md-editor'),
        // 初始高度交由 CSS 控制
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        placeholder: '在此输入Markdown内容'
      });
      // 暴露实例用于调试与自动化验证（不影响业务逻辑）
      try { window.__EDITOR_INST__ = this.mdEditor; } catch (_) {}
    } catch (e) {
      console.error('初始化编辑器失败', e);
      this.mdEditor = null;
    }
  },
  unmounted() {
    // 无需清理尺寸监听
  }
});

app.mount('#app');