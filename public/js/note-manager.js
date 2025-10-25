(function(){
  const { createApp } = Vue;

  function readLocal(key, defVal){
    try {
      const v = localStorage.getItem(key);
      return v !== null ? v : defVal;
    } catch(e){ return defVal; }
  }
  function writeLocal(key, val){
    try { localStorage.setItem(key, val); } catch(e){}
  }
  function clearLocal(key){
    try { localStorage.removeItem(key); } catch(e){}
  }

  var initialData = (function(){
    var d = (typeof window !== 'undefined' ? window.__DEFAULT_NOTE_DATA__ : null) || {};
    var cats = Array.isArray(d.categories) ? d.categories : [];
    var notes = Array.isArray(d.notes) ? d.notes : [];
    return { categories: cats, notes: notes };
  })();

  createApp({
    data: function(){
      return {
        statusMessage: null,
        categories: initialData.categories,
        notes: initialData.notes,
        apiUrlInput: readLocal('noteManager.customDefaultApiUrl', (typeof window !== 'undefined' ? (window.__NOTE_DEFAULT_API__ || '') : '')),
        syncApiUrlInput: readLocal('noteManager.syncApiUrl', ''),
        previewData: null,
        isSyncing: false
      };
    },
    computed: {
      categoryCount: function(){ return Array.isArray(this.categories) ? this.categories.length : 0; },
      noteCount: function(){ return Array.isArray(this.notes) ? this.notes.length : 0; },
      effectiveApiLabel: function(){
        var custom = readLocal('noteManager.customDefaultApiUrl', '');
        return (custom && custom.trim()) ? custom.trim() : ((typeof window !== 'undefined' ? window.__NOTE_DEFAULT_API__ : '') || '未设置');
      },
      previewJson: function(){ return this.previewData ? JSON.stringify(this.previewData, null, 2) : ''; }
    },
    methods: {
      getStatusIcon: function(type){
        if(type === 'success') return 'fas fa-check-circle';
        if(type === 'error') return 'fas fa-times-circle';
        return 'fas fa-info-circle';
      },
      setMessage: function(type, text){
        var self = this;
        self.statusMessage = { type: type, text: text };
        setTimeout(function(){ self.statusMessage = null; }, 3500);
      },
      saveApiUrl: function(){
        var v = (this.apiUrlInput || '').trim();
        if(!v){ this.setMessage('error','请输入合法的API地址'); return; }
        writeLocal('noteManager.customDefaultApiUrl', v);
        this.setMessage('success','默认接口地址已保存');
      },
      clearApiUrl: function(){
        clearLocal('noteManager.customDefaultApiUrl');
        this.apiUrlInput = (typeof window !== 'undefined' ? (window.__NOTE_DEFAULT_API__ || '') : '');
        this.setMessage('success','已清除自定义默认接口');
      },
      resetToDefault: async function(){
        var url = readLocal('noteManager.customDefaultApiUrl', (typeof window !== 'undefined' ? (window.__NOTE_DEFAULT_API__ || '') : ''));
        if(!url){ this.setMessage('error','未配置默认接口地址'); return; }
        try {
          var resp = await axios.get(url, { timeout: 8000 });
          var dataObj = (resp && resp.data && (resp.data.data || resp.data)) || {};
          var cats = Array.isArray(dataObj.categories) ? dataObj.categories : [];
          var notes = Array.isArray(dataObj.notes) ? dataObj.notes : [];
          this.categories = cats;
          this.notes = notes;
          this.previewData = { categories: cats, notes: notes };
          this.setMessage('success','已从默认接口恢复笔记数据');
        } catch (e) {
          this.setMessage('error', '恢复默认失败：' + (e && e.message ? e.message : e));
        }
      },
      onImportJson: async function(evt){
        try {
          var file = evt && evt.target && evt.target.files && evt.target.files[0];
          if(!file){ return; }
          var text = await file.text();
          var obj = JSON.parse(text);
          var cats = Array.isArray(obj && obj.categories) ? obj.categories : [];
          var notes = Array.isArray(obj && obj.notes) ? obj.notes : [];
          this.categories = cats;
          this.notes = notes;
          this.previewData = { categories: cats, notes: notes };
          this.setMessage('success','已导入：分类' + cats.length + '，笔记' + notes.length);
          evt.target.value = '';
        } catch(e){
          this.setMessage('error','导入失败：' + (e && e.message ? e.message : e));
        }
      },
      exportJson: function(){
        try {
          var data = { categories: this.categories || [], notes: this.notes || [] };
          var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'note-data-' + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.setMessage('success','已导出JSON');
        } catch(e){
          this.setMessage('error','导出失败：' + (e && e.message ? e.message : e));
        }
      },
      saveSyncUrl: function(){
        var v = (this.syncApiUrlInput || '').trim();
        if(!v){ this.setMessage('error','请输入合法的同步API地址'); return; }
        writeLocal('noteManager.syncApiUrl', v);
        this.setMessage('success','同步接口地址已保存');
      },
      clearSyncUrl: function(){
        clearLocal('noteManager.syncApiUrl');
        this.syncApiUrlInput = '';
        this.setMessage('success','已清除同步接口地址');
      },
      effectiveSyncLabel: function(){
        var v = readLocal('noteManager.syncApiUrl','');
        return (v && v.trim()) ? v.trim() : '未设置';
      },
      syncToBackend: async function(){
        var url = readLocal('noteManager.syncApiUrl', (this.syncApiUrlInput || '').trim());
        if(!url){ this.setMessage('error','未设置同步API地址'); return; }
        try {
          this.isSyncing = true;
          var payload = { categories: this.categories || [], notes: this.notes || [] };
          var resp = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 12000 });
          var ok = resp && resp.status >= 200 && resp.status < 300;
          this.setMessage(ok ? 'success' : 'error', ok ? '同步成功' : ('同步失败：' + (resp && resp.status)));
        } catch (e){
          this.setMessage('error','同步异常：' + (e && e.message ? e.message : e));
        } finally {
          this.isSyncing = false;
        }
      }
    }
  }).mount('#app');
})();