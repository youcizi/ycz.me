// AI聊天页面 Vue 应用（OpenAI兼容）
const { createApp } = Vue;

const STORAGE = {
  provider: 'aiChat.provider',
  baseUrl: 'aiChat.baseUrl',
  apiKey: 'aiChat.apiKey',
  model: 'aiChat.model',
  systemPrompt: 'aiChat.systemPrompt',
  temperature: 'aiChat.temperature',
  timeoutSec: 'aiChat.timeoutSec'
};

const PROVIDERS = {
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  tongyi: { label: '通义千问（DashScope兼容）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  doubao: { label: '豆包（Volc Ark兼容）', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'ep-4o-mini' },
  siliconflow: { label: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1/chat/completions', model: 'qwen2.5-7b-instruct' },
  custom: { label: '自定义', baseUrl: '', model: '' }
};

const AiChatApp = {
  data() {
    return {
      providerOptions: Object.entries(PROVIDERS).map(([value, cfg]) => ({ value, label: cfg.label })),
      provider: localStorage.getItem(STORAGE.provider) || 'deepseek',
      baseUrl: localStorage.getItem(STORAGE.baseUrl) || PROVIDERS.deepseek.baseUrl,
      apiKey: localStorage.getItem(STORAGE.apiKey) || '',
      model: localStorage.getItem(STORAGE.model) || PROVIDERS.deepseek.model,
      systemPrompt: localStorage.getItem(STORAGE.systemPrompt) || '',
      temperature: parseFloat(localStorage.getItem(STORAGE.temperature) || '0.7'),
      // 流式超时（秒），可在配置中设置；默认90秒
      streamTimeoutSec: parseInt(localStorage.getItem(STORAGE.timeoutSec) || '90', 10),
      // 多模型配置管理
      modelConfigs: [],
      selectedConfigId: null,
      configName: '',
      messages: [],
      inputText: '',
      // 图片输入与生成
      attachedImages: [], // [{ name, dataUrl }]
      imageBaseUrl: '',
      imageModel: '',
      imageSize: '1024x1024',
      imageFormat: 'url', // 'url' | 'b64_json'
      isSending: false,
      connStatus: 'idle',
      canRetry: false,
      lastPrompt: '',
      autoScroll: true,
      // 配置弹窗（新增/编辑共用）
      configModalVisible: false,
      configListModalVisible: false,
      editingConfigId: null,
      // 会话历史
      conversations: [],
      activeConversationId: null
      , editingTitle: false,
      titleDraft: '',
      conversationMenuId: null
      , _timedOut: false
    };
  },
  mounted() {
    // 初始化输入框高度与历史会话
    this.$nextTick(() => {
      this.onInputChange();
      this.initConversations();
      this.initModelConfigs();
    });
  },

  computed: {
    isConfigured() {
      // 只要存在当前配置ID即可视为已配置，避免临时状态误判
      if (this.selectedConfigId) return true;
      return !!(this.baseUrl && this.apiKey && this.model);
    }
  },

  watch: {
    provider(newVal) {
      if (newVal && PROVIDERS[newVal]) {
        const preset = PROVIDERS[newVal];
        // 仅在非自定义或当前为空时应用默认
        if (newVal !== 'custom') {
          this.baseUrl = preset.baseUrl;
          this.model = preset.model;
        }
      }
    }
  },

  methods: {
    async initModelConfigs() {
      try {
        const list = await ChatDBService.listModelConfigs();
        if (!list || list.length === 0) {
          // 不再自动创建默认配置，改为提示并引导用户添加
          this.modelConfigs = [];
          this.selectedConfigId = null;
          this.configName = '';
          localStorage.removeItem('aiChat.currentConfigId');
          try { CustomModal.showWarning('暂无模型配置，请先添加配置'); } catch (_) {}
          // 自动打开添加配置弹窗，提高可用性
          this.openAddConfigModal();
        } else {
          this.modelConfigs = list;
          const currentId = localStorage.getItem('aiChat.currentConfigId');
          const target = list.find(c => String(c.id) === String(currentId)) || list[0];
          this.selectedConfigId = target.id;
          this.configName = target.name || '';
          this.applyConfig(target);
        }
      } catch (e) { console.warn('初始化模型配置失败', e); }
    },
    applyConfig(cfg) {
      if (!cfg) return;
      this.provider = cfg.provider || this.provider;
      this.baseUrl = cfg.baseUrl || this.baseUrl;
      this.apiKey = cfg.apiKey || this.apiKey;
      this.model = cfg.model || this.model;
      this.systemPrompt = cfg.systemPrompt || '';
      this.temperature = typeof cfg.temperature === 'number' ? cfg.temperature : this.temperature;
      this.streamTimeoutSec = parseInt(cfg.streamTimeoutSec || this.streamTimeoutSec || 90, 10);
      // 图片生成相关（可选）
      this.imageBaseUrl = cfg.imageBaseUrl || this.imageBaseUrl || '';
      this.imageModel = cfg.imageModel || this.imageModel || '';
      this.imageSize = cfg.imageSize || this.imageSize || '1024x1024';
      this.imageFormat = cfg.imageFormat || this.imageFormat || 'url';
    },
    async selectModelConfig(id) {
      if (!id) return;
      try {
        const cfg = await ChatDBService.getModelConfigById(id);
        if (cfg) {
          this.selectedConfigId = cfg.id;
          this.configName = cfg.name || '';
          this.applyConfig(cfg);
          localStorage.setItem('aiChat.currentConfigId', String(cfg.id));
          try { CustomModal.showSuccess('已切换为当前配置'); } catch (_) {}
        }
      } catch (e) { console.warn('选择模型配置失败', e); }
    },
    // 打开配置列表弹窗
    openConfigListModal() {
      this.configListModalVisible = true;
    },
    closeConfigListModal() {
      this.configListModalVisible = false;
    },
    // 添加配置弹窗（清空并进入新增模式）
    openAddConfigModal() {
      this.editingConfigId = null;
      // 默认使用当前提供商的预设
      const p = PROVIDERS[this.provider] || PROVIDERS.deepseek;
      this.configName = '';
      this.provider = this.provider || 'deepseek';
      this.baseUrl = p.baseUrl;
      this.apiKey = '';
      this.model = p.model;
      this.systemPrompt = '';
      this.temperature = typeof this.temperature === 'number' ? this.temperature : 0.7;
      this.streamTimeoutSec = parseInt(this.streamTimeoutSec || 90, 10);
      // 图片生成默认空
      this.imageBaseUrl = '';
      this.imageModel = '';
      this.imageSize = '1024x1024';
      this.imageFormat = 'url';
      this.configModalVisible = true;
    },
    // 从列表进入编辑模式（复用添加弹窗）
    async openEditConfigFromList(id) {
      if (!id) return;
      const cfg = await ChatDBService.getModelConfigById(id);
      if (!cfg) return;
      this.editingConfigId = cfg.id;
      this.configName = cfg.name || '';
      this.provider = cfg.provider || 'deepseek';
      this.baseUrl = cfg.baseUrl || '';
      this.apiKey = cfg.apiKey || '';
      this.model = cfg.model || '';
      this.systemPrompt = cfg.systemPrompt || '';
      this.temperature = typeof cfg.temperature === 'number' ? cfg.temperature : 0.7;
      this.streamTimeoutSec = parseInt(cfg.streamTimeoutSec || 90, 10);
      this.imageBaseUrl = cfg.imageBaseUrl || '';
      this.imageModel = cfg.imageModel || '';
      this.imageSize = cfg.imageSize || '1024x1024';
      this.imageFormat = cfg.imageFormat || 'url';
      this.configModalVisible = true;
    },
    // 保存（新增或更新，取决于 editingConfigId）
    async saveConfigForm() {
      try {
        const payload = {
          name: (this.configName || '未命名').trim(),
          provider: this.provider,
          baseUrl: (this.baseUrl || '').trim(),
          apiKey: (this.apiKey || '').trim(),
          model: (this.model || '').trim(),
          systemPrompt: this.systemPrompt || '',
          temperature: this.temperature ?? 0.7,
          streamTimeoutSec: this.streamTimeoutSec || 90,
          // 图片生成配置（可选）
          imageBaseUrl: (this.imageBaseUrl || '').trim(),
          imageModel: (this.imageModel || '').trim(),
          imageSize: (this.imageSize || '1024x1024').trim(),
          imageFormat: (this.imageFormat || 'url').trim()
        };
        let saved;
        if (this.editingConfigId) {
          saved = await ChatDBService.updateModelConfig({ id: this.editingConfigId, ...payload });
        } else {
          saved = await ChatDBService.addModelConfig(payload);
          this.editingConfigId = saved.id;
        }
        this.modelConfigs = await ChatDBService.listModelConfigs();
        this.selectedConfigId = saved.id;
        this.configName = saved.name || '';
        try { CustomModal.showSuccess('配置已保存'); } catch (_) {}
      } catch (e) {
        console.error('保存配置失败', e);
        try { CustomModal.showError('保存配置失败: ' + (e.message || '未知错误')); } catch (_) {}
      } finally {
        this.closeConfigModal();
      }
    },
    async setCurrentConfig(id) {
      if (!id) return;
      const cfg = await ChatDBService.getModelConfigById(id);
      if (!cfg) return;
      this.selectedConfigId = cfg.id;
      this.configName = cfg.name || '';
      this.applyConfig(cfg);
      localStorage.setItem('aiChat.currentConfigId', String(cfg.id));
      try { CustomModal.showSuccess('已设置为当前配置'); } catch (_) {}
    },
    async setCurrentConfigFromModal() {
      // 如果是新增，先保存再设为当前
      if (!this.editingConfigId) {
        await this.saveConfigForm();
      }
      await this.setCurrentConfig(this.editingConfigId || this.selectedConfigId);
      // 仅关闭添加/编辑弹窗，保留配置列表弹窗
      this.closeConfigModal();
    },
    async deleteConfigById(id) {
      if (!id) return;
      try {
        await ChatDBService.deleteModelConfig(id);
        const list = await ChatDBService.listModelConfigs();
        this.modelConfigs = list;
        // 若删除的是当前配置，回退到首个
        if (String(this.selectedConfigId) === String(id)) {
          if (list.length) {
            this.selectedConfigId = list[0].id;
            this.configName = list[0].name || '';
            this.applyConfig(list[0]);
            localStorage.setItem('aiChat.currentConfigId', String(list[0].id));
          } else {
            this.selectedConfigId = null;
            this.configName = '';
            localStorage.removeItem('aiChat.currentConfigId');
          }
        }
        try { CustomModal.showSuccess('配置已删除'); } catch (_) {}
      } catch (e) {
        console.error('删除配置失败', e);
        try { CustomModal.showError('删除配置失败: ' + (e.message || '未知错误')); } catch (_) {}
      }
    },
    // 基于当前会话消息生成自动标题（优先首条用户消息）
    generateAutoTitle() {
      const msgs = this.messages || [];
      let text = '';
      for (const m of msgs) {
        if (m.role === 'user' && (m.content || '').trim()) { text = m.content; break; }
      }
      if (!text) {
        for (let i = msgs.length - 1; i >= 0; i--) {
          const m = msgs[i];
          if (m.role === 'user' && (m.content || '').trim()) { text = m.content; break; }
        }
      }
      text = (text || '').trim();
      if (!text) return '会话';
      // 去除代码块与行内代码
      text = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
      // 去除Markdown标题符号
      text = text.replace(/^#{1,6}\s*/gm, '');
      // 取第一行
      text = text.split(/\r?\n/)[0].trim();
      // 去除常见中文客套/虚词开头
      text = text.replace(/^(请帮我|请问|如何|怎么|能否|麻烦)/, '');
      // 去除尾部标点与空白
      text = text.replace(/[。？！,.!?、；;:\s]+$/,'');
      const isAscii = /^[\x00-\x7F]+$/.test(text);
      if (isAscii) {
        const words = text.split(/\s+/).filter(Boolean).slice(0, 6);
        return words.join(' ');
      } else {
        return text.slice(0, 12);
      }
    },
    async initConversations() {
      try {
        const list = await ChatDBService.listConversations();
        if (!list || list.length === 0) {
          const now = Date.now();
          const id = 'c_' + now;
          await ChatDBService.addConversation({ id, title: '新会话', createdAt: now, updatedAt: now });
          this.conversations = [{ id, title: '新会话', createdAt: now, updatedAt: now }];
          this.activeConversationId = id;
        } else {
          this.conversations = list;
          this.activeConversationId = list[0].id;
        }
        await this.loadMessages(this.activeConversationId);
      } catch (e) {
        console.warn('会话初始化失败', e);
      }
    },
    handleChatClick(e) {
      const t = e.target;
      if (!t) return;
      // 复制代码块按钮
      if (t.classList && t.classList.contains('code-copy-btn')) {
        const block = t.closest('.md-code-block');
        const codeEl = block ? block.querySelector('pre.md-code code') : null;
        const text = codeEl ? codeEl.innerText : '';
        if (text) {
          navigator.clipboard.writeText(text).then(() => {
            t.textContent = '已复制';
            setTimeout(() => { t.textContent = '复制'; }, 1500);
          }).catch(() => {
            try { CustomModal.showError('复制失败，请手动选择文本复制'); } catch (_) { /* fallback ignored */ }
          });
        }
      }
    },
    async renameConversation(id) {
      if (!id) return;
      const conv = this.conversations.find(c => c.id === id);
      const current = (conv?.title || '').trim();
      const next = prompt('输入新的会话标题', current);
      if (next && next.trim()) {
        conv.title = next.trim();
        // 标记用户已手动重命名，后续不再自动修改
        conv.userRenamed = true;
        conv.updatedAt = Date.now();
        await ChatDBService.updateConversation(conv);
        this.conversations = await ChatDBService.listConversations();
      }
      this.selectConversation(id);
      this.conversationMenuId = null;
    },
    async deleteConversationById(id) {
      if (!id) return;
      this.selectConversation(id);
      await this.deleteConversation();
      this.conversationMenuId = null;
    },

    async loadMessages(conversationId) {
      if (!conversationId) return;
      try {
        const list = await ChatDBService.listMessages(conversationId);
        this.messages = list.map(m => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt }));
        this.$nextTick(() => this.scrollToBottom());
      } catch (e) { console.warn('加载消息失败', e); }
    },

    async selectConversation(id) {
      if (this.activeConversationId === id) return;
      this.activeConversationId = id;
      await this.loadMessages(id);
    },

    async newConversation() {
      // 如果存在空会话（消息数为0），则切换到该会话而不再创建
      const list = await ChatDBService.listConversations();
      for (const c of list) {
        const count = await ChatDBService.countMessages(c.id);
        if (count === 0) {
          this.conversations = list;
          this.activeConversationId = c.id;
          this.messages = [];
          return;
        }
      }
      const now = Date.now();
      const id = 'c_' + now;
      const title = '新会话';
      await ChatDBService.addConversation({ id, title, createdAt: now, updatedAt: now });
      this.conversations = await ChatDBService.listConversations();
      this.activeConversationId = id;
      this.messages = [];
    },

    async clearCurrentConversation() {
      if (!this.activeConversationId) return;
      await ChatDBService.clearConversation(this.activeConversationId);
      this.messages = [];
    },

    // 兼容旧调用：如果需要添加配置，调用 openAddConfigModal
    openConfigModal() { this.openAddConfigModal(); },

    closeConfigModal() {
      this.configModalVisible = false;
    },

    // 旧方法删去，改用通用 saveConfigForm / deleteConfigById / setCurrentConfigFromModal

    resetToProviderDefaults() {
      const p = PROVIDERS[this.provider] || PROVIDERS.deepseek;
      this.baseUrl = p.baseUrl;
      this.model = p.model;
      // 重置不影响图片生成配置
    },

    clearChat() {
      this.messages = [];
    },

    onInputChange() {
      const el = this.$refs.inputArea;
      if (!el) return;
      // 内容绑定：从 contenteditable 获取文本（保留尖括号等符号作为纯文本）
      this.inputText = el.innerText.replace(/\u00A0/g, ' ').trim();
      // 高度自适应：按内容扩展，最高约200px
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    },

    scrollToBottom() {
      if (!this.autoScroll) return;
      const box = this.$refs.chatScroll;
      if (!box) return;
      box.scrollTop = box.scrollHeight;
    },

    // 图片上传与预览
    async onImageFilesSelected(evt) {
      const files = Array.from((evt?.target?.files) || []);
      for (const f of files) {
        if (!f.type.startsWith('image/')) continue;
        const reader = new FileReader();
        const p = new Promise((resolve) => {
          reader.onload = () => resolve({ name: f.name, dataUrl: reader.result });
        });
        reader.readAsDataURL(f);
        const item = await p;
        this.attachedImages.push(item);
      }
      // 清空 input 以便重复选择同一文件
      try { evt.target.value = ''; } catch (_) {}
    },
    removeAttachedImage(idx) {
      if (idx < 0 || idx >= this.attachedImages.length) return;
      this.attachedImages.splice(idx, 1);
    },

    async sendMessage() {
      const content = (this.inputText || '').trim();
      if (!content) return;
      if (!this.isConfigured) {
        try { CustomModal.showWarning('请先完成模型配置：基础地址与模型名称'); } catch (_) { /* fallback ignored */ }
        this.openAddConfigModal();
        return;
      }
      // 推送并保存用户消息（携带id）
      const nowTs = Date.now();
      const userMsgId = 'm_' + nowTs + '_u';
      this.messages.push({ id: userMsgId, role: 'user', content, createdAt: nowTs });
      if (this.activeConversationId) {
        await ChatDBService.addMessage({ id: userMsgId, conversationId: this.activeConversationId, role: 'user', content, createdAt: nowTs });
        const conv = this.conversations.find(c => c.id === this.activeConversationId);
        if (conv) { conv.updatedAt = Date.now(); await ChatDBService.updateConversation(conv); }
      }
      // 清空输入区（contenteditable）与内部绑定文本
      this.inputText = '';
      const inputEl = this.$refs.inputArea;
      if (inputEl) {
        inputEl.innerText = '';
        inputEl.innerHTML = '';
        const ev = new Event('input', { bubbles: true });
        inputEl.dispatchEvent(ev);
        inputEl.style.height = 'auto';
      }
      this.$nextTick(() => { this.onInputChange(); this.scrollToBottom(); this.highlightCodes(); });
      this.isSending = true;
      this._userStopped = false;
      this.connStatus = 'connecting';
      this.canRetry = false;
      this.lastPrompt = content;
      // 构造消息体（OpenAI兼容）——提前到函数作用域，确保在 catch/retry 中也可用
      const msgs = [];
      if (this.systemPrompt && this.systemPrompt.trim()) {
        msgs.push({ role: 'system', content: this.systemPrompt.trim() });
      }
      msgs.push(...this.messages.map(m => ({ role: m.role, content: m.content })));
      // 若有图片附件，将最后一条用户消息的 content 替换为多模态数组
      if (this.attachedImages && this.attachedImages.length > 0) {
        for (let i = msgs.length - 1; i >= 0; i--) {
          const mm = msgs[i];
          if (mm.role === 'user') {
            const parts = [];
            if (content && content.trim()) {
              parts.push({ type: 'text', text: content });
            }
            for (const img of this.attachedImages) {
              parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
            }
            mm.content = parts;
            break;
          }
        }
      }

      const payload = {
        model: this.model,
        messages: msgs,
        temperature: this.temperature,
        stream: true
      };

      try {
        // 先创建一个占位的助手消息用于流式追加
        const aiIndex = this.messages.length;
        const aiNow = Date.now();
        const aiMsgId = 'm_' + aiNow + '_a';
        this.messages.push({ id: aiMsgId, role: 'assistant', content: '', createdAt: aiNow });

        // 使用服务端代理避免CORS问题：首次尝试（将返回JSON，触发回退逻辑）
        this._abortController = new AbortController();
        const headers = { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' };
        const resp = await fetch('/api/ai/proxy', {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: this.baseUrl, apiKey: this.apiKey, provider: this.provider, payload }),
          signal: this._abortController.signal
        });

        const ct = resp.headers.get('content-type') || '';
        const isSSE = ct.includes('text/event-stream');
        if (!resp.ok || !resp.body || !isSSE) {
          // 失败则回退到一次性响应（仍通过服务端代理）
          const axiosHeaders = { 'Content-Type': 'application/json' };
          const res = await axios.post('/api/ai/proxy', { url: this.baseUrl, apiKey: this.apiKey, provider: this.provider, payload: { ...payload, stream: false } }, { headers: axiosHeaders });
          const choice = res?.data?.choices?.[0];
          const aiMsg = choice?.message?.content || choice?.delta?.content || res?.data?.output_text || '[无内容]';
          this.messages[aiIndex].content = aiMsg;
          this.connStatus = 'done';
          this.$nextTick(() => this.highlightCodes());
        } else {
          this.connStatus = 'streaming';
          const reader = resp.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';
          let timedOut = false;
          // 使用用户配置的超时（秒），限制在5s~600s范围
          const timeoutMs = Math.max(5000, Math.min(600000, (this.streamTimeoutSec || 30) * 1000));
          const timeoutId = setTimeout(() => {
            timedOut = true;
            this._timedOut = true;
            try { this._abortController.abort(); } catch (_) {}
          }, timeoutMs);
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // 兼容不同厂商的SSE：按双换行分片，逐行找 data:
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            for (const part of parts) {
              const line = part.trim();
              const lines = line.split('\n');
              for (const l of lines) {
                const trimmed = l.trim();
                if (!trimmed.startsWith('data:')) continue;
                const dataStr = trimmed.replace(/^data:\s*/, '').trim();
                if (!dataStr || dataStr === '[DONE]') continue;
                try {
                  const json = JSON.parse(dataStr);
                  const choice = json?.choices?.[0] || {};
                  const delta = choice?.delta?.content || choice?.message?.content || json?.output_text || json?.data?.content || '';
                  if (delta) {
                    this.messages[aiIndex].content += delta;
                    this.$nextTick(() => { this.scrollToBottom(); this.highlightCodes(); });
                  }
                } catch (e) {
                  // 有些厂商可能返回非JSON文本，直接追加
                  this.messages[aiIndex].content += dataStr;
                  this.$nextTick(() => { this.scrollToBottom(); this.highlightCodes(); });
                }
              }
            }
          }
          clearTimeout(timeoutId);
          if (timedOut) {
            this.messages[aiIndex].content += '\n[流式已超时，连接已中断]';
            this.connStatus = 'stopped';
            this.canRetry = true;
          } else {
            this.connStatus = 'done';
          }
          this.$nextTick(() => this.highlightCodes());
        }

        // 保存 AI 消息
      const finalContent = this.messages[aiIndex].content || '[无内容]';
      if (this.activeConversationId) {
        await ChatDBService.addMessage({ id: this.messages[aiIndex].id, conversationId: this.activeConversationId, role: 'assistant', content: finalContent, createdAt: Date.now() });
        const conv = this.conversations.find(c => c.id === this.activeConversationId);
        if (conv) {
          conv.updatedAt = Date.now();
          // 自动重命名：仅当标题仍为默认且未被用户手动改名
          if (!conv.userRenamed && (!conv.title || conv.title === '新会话')) {
            const autoTitle = this.generateAutoTitle();
            if (autoTitle && autoTitle.trim()) {
              conv.title = autoTitle.trim();
            }
          }
          await ChatDBService.updateConversation(conv);
          // 刷新列表以反映可能的标题变化
          this.conversations = await ChatDBService.listConversations();
        }
      }
      } catch (e) {
        const aborted = (e && (e.name === 'AbortError' || e.message?.includes('abort')));
        if (aborted) {
          console.info('回复已中断', e);
        } else {
          console.error('发送失败', e);
        }
        if (aborted) {
          if (this._userStopped) {
            this.messages.push({ role: 'assistant', content: '提示：回复已被手动中断' });
            this.connStatus = 'stopped';
          } else if (this._timedOut) {
            this.messages.push({ role: 'assistant', content: '提示：流式已超时，连接已中断' });
            this.connStatus = 'stopped';
          } else {
            this.messages.push({ role: 'assistant', content: '提示：回复已中断（可能达到最大Token、网络问题或服务端结束）' });
            this.connStatus = 'stopped';
          }
          this.canRetry = true;
        } else {
          // 重试一次流式（若仍失败则提示错误并回退）
          try {
            const retryPayload = { ...payload };
            const retryController = new AbortController();
            const retryHeaders = { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' };
            const retryResp = await fetch('/api/ai/proxy', {
              method: 'POST', headers: retryHeaders, body: JSON.stringify({ url: this.baseUrl, apiKey: this.apiKey, provider: this.provider, payload: retryPayload }), signal: retryController.signal
            });
            const retryCt = retryResp.headers.get('content-type') || '';
            const retryIsSSE = retryCt.includes('text/event-stream');
            if (retryResp.ok && retryResp.body && retryIsSSE) {
              const reader = retryResp.body.getReader();
              const decoder = new TextDecoder('utf-8');
              let buffer = '';
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';
                for (const part of parts) {
                  const line = part.trim();
                  const lines = line.split('\n');
                  for (const l of lines) {
                    const trimmed = l.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const dataStr = trimmed.replace(/^data:\s*/, '').trim();
                    if (!dataStr || dataStr === '[DONE]') continue;
                    try {
                      const json = JSON.parse(dataStr);
                      const choice = json?.choices?.[0] || {};
                      const delta = choice?.delta?.content || choice?.message?.content || json?.output_text || json?.data?.content || '';
                      if (delta) {
                        this.messages[aiIndex].content += delta;
                        this.$nextTick(() => { this.scrollToBottom(); this.highlightCodes(); });
                      }
                    } catch (err2) {
                      this.messages[aiIndex].content += dataStr;
                      this.$nextTick(() => { this.scrollToBottom(); this.highlightCodes(); });
                    }
                  }
                }
              }
            } else {
              throw new Error('重试流式失败');
            }
          } catch (retryErr) {
            // 流式重试失败后，回退为一次性JSON响应，尽量给出内容
            try {
              const axiosHeaders = { 'Content-Type': 'application/json' };
              const res = await axios.post('/api/ai/proxy', { url: this.baseUrl, apiKey: this.apiKey, provider: this.provider, payload: { ...payload, stream: false } }, { headers: axiosHeaders });
              const choice = res?.data?.choices?.[0];
              const aiMsg = choice?.message?.content || choice?.delta?.content || res?.data?.output_text || '[无内容]';
              this.messages[aiIndex].content += aiMsg;
              this.connStatus = 'done';
              this.$nextTick(() => this.highlightCodes());
            } catch (fallbackErr) {
              const msg = retryErr?.response?.data?.error?.message || retryErr?.message || e?.response?.data?.error?.message || e?.message || '未知错误';
              this.messages.push({ role: 'assistant', content: `错误：${msg}` });
              this.connStatus = 'error';
              this.canRetry = true;
            }
          }
        }
      } finally {
        this.isSending = false;
        this.$nextTick(() => { this.scrollToBottom(); this.highlightCodes(); });
        this._abortController = null;
        this._userStopped = false;
        this._timedOut = false;
        // 发送后清理附件
        this.attachedImages = [];
      }
    },
    // 图片生成
    async generateImage() {
      const prompt = (this.inputText || '').trim();
      if (!prompt) return;
      if (!this.apiKey || !this.imageBaseUrl || !this.imageModel) {
        try { CustomModal.showWarning('请先在模型配置中填写图片生成的地址与模型'); } catch (_) {}
        this.openAddConfigModal();
        return;
      }
      const nowTs = Date.now();
      const userMsgId = 'm_' + nowTs + '_u';
      // 作为纯文本消息记录提示词
      this.messages.push({ id: userMsgId, role: 'user', content: prompt, createdAt: nowTs });
      if (this.activeConversationId) {
        await ChatDBService.addMessage({ id: userMsgId, conversationId: this.activeConversationId, role: 'user', content: prompt, createdAt: nowTs });
        const conv = this.conversations.find(c => c.id === this.activeConversationId);
        if (conv) { conv.updatedAt = Date.now(); await ChatDBService.updateConversation(conv); }
      }
      // 清空输入
      this.inputText = '';
      const inputEl = this.$refs.inputArea;
      if (inputEl) { inputEl.innerText = ''; inputEl.innerHTML = ''; inputEl.style.height = 'auto'; }
      this.isSending = true;
      this.connStatus = 'connecting';
      const aiIndex = this.messages.length;
      const aiMsgId = 'm_' + Date.now() + '_a';
      this.messages.push({ id: aiMsgId, role: 'assistant', content: '正在生成图片…', createdAt: Date.now() });

      try {
        const payload = {
          prompt,
          model: this.imageModel,
          size: this.imageSize || '1024x1024',
          response_format: (this.imageFormat === 'b64_json') ? 'b64_json' : 'url'
        };
        const axiosHeaders = { 'Content-Type': 'application/json' };
        const res = await axios.post('/api/ai/proxy', { url: this.imageBaseUrl, apiKey: this.apiKey, provider: this.provider, payload }, { headers: axiosHeaders });
        // 解析返回
        let imgMd = '';
        const dataItem = res?.data?.data?.[0] || res?.data?.choices?.[0];
        if (this.imageFormat === 'b64_json') {
          const b64 = dataItem?.b64_json || dataItem?.image_base64;
          if (b64) {
            const url = 'data:image/png;base64,' + b64;
            imgMd = `![](${url})`;
          }
        } else {
          const url = dataItem?.url || dataItem?.image_url;
          if (url) { imgMd = `![](${url})`; }
        }
        this.messages[aiIndex].content = imgMd || '[未返回图片]';
        this.connStatus = 'done';
        // 保存消息
        if (this.activeConversationId) {
          await ChatDBService.addMessage({ id: aiMsgId, conversationId: this.activeConversationId, role: 'assistant', content: this.messages[aiIndex].content, createdAt: Date.now() });
          const conv = this.conversations.find(c => c.id === this.activeConversationId);
          if (conv) { conv.updatedAt = Date.now(); await ChatDBService.updateConversation(conv); }
        }
      } catch (e) {
        console.error('生成图片失败', e);
        const msg = e?.response?.data?.error?.message || e?.message || '生成失败';
        this.messages[aiIndex].content = `错误：${msg}`;
        this.connStatus = 'error';
      } finally {
        this.isSending = false;
        this.$nextTick(() => { this.scrollToBottom(); this.highlightCodes(); });
      }
    },
    async deleteMessage(id) {
      // 单条消息删除
      try {
        await ChatDBService.deleteMessage(id);
        this.messages = this.messages.filter(m => m.id !== id);
      } catch (e) { console.warn('删除消息失败', e); }
    },
    async copyMessage(id, evt) {
      try {
        const msg = this.messages.find(m => m.id === id);
        const text = (msg && msg.content) ? String(msg.content) : '';
        if (!text) return;
        await navigator.clipboard.writeText(text);
        if (evt && evt.target) {
          const el = evt.target;
          const prev = el.textContent;
          el.textContent = '已复制';
          setTimeout(() => { el.textContent = prev && prev.includes('复制') ? '📋 复制' : '复制'; }, 1500);
        }
      } catch (e) {
        try {
          const ta = document.createElement('textarea');
          ta.value = (this.messages.find(m => m.id === id)?.content) || '';
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          if (evt && evt.target) {
            const el = evt.target;
            const prev = el.textContent;
            el.textContent = '已复制';
            setTimeout(() => { el.textContent = prev && prev.includes('复制') ? '📋 复制' : '复制'; }, 1500);
          }
        } catch (err2) {
          try { CustomModal.showError('复制失败，请手动选择文本复制'); } catch (_) { /* fallback ignored */ }
        }
      }
    },
    startRename() {
      if (!this.activeConversationId) return;
      const conv = this.conversations.find(c => c.id === this.activeConversationId);
      this.titleDraft = (conv?.title || '').trim();
      this.editingTitle = true;
    },
    async saveRename() {
      if (!this.activeConversationId) { this.editingTitle = false; return; }
      const title = (this.titleDraft || '').trim();
      if (!title) { this.editingTitle = false; return; }
      const conv = this.conversations.find(c => c.id === this.activeConversationId);
      conv.title = title;
      // 标记用户已手动重命名，后续不再自动修改
      conv.userRenamed = true;
      conv.updatedAt = Date.now();
      await ChatDBService.updateConversation(conv);
      this.conversations = await ChatDBService.listConversations();
      this.editingTitle = false;
    },
    cancelRename() {
      this.editingTitle = false;
      this.titleDraft = '';
    },
    async deleteConversation() {
      if (!this.activeConversationId) return;
      await ChatDBService.deleteConversation(this.activeConversationId);
      const list = await ChatDBService.listConversations();
      if (list.length === 0) {
        await this.newConversation();
      } else {
        this.conversations = list;
        this.activeConversationId = list[0].id;
        await this.loadMessages(this.activeConversationId);
      }
      // 删除会话后，强制重新应用当前配置，防止状态被误置导致未配置提示
      try {
        const currentId = localStorage.getItem('aiChat.currentConfigId');
        if (currentId) {
          const cfg = await ChatDBService.getModelConfigById(currentId);
          if (cfg) {
            this.selectedConfigId = cfg.id;
            this.configName = cfg.name || '';
            this.applyConfig(cfg);
          }
        }
      } catch (e) { /* 忽略兜底错误 */ }
    },
    stopStreaming() {
      if (this._abortController) {
        this._userStopped = true;
        this._abortController.abort();
      }
      this.isSending = false;
      this.connStatus = 'stopped';
      this.canRetry = true;
    },
    retryLast() {
      if (!this.canRetry || !this.lastPrompt) return;
      this.inputText = this.lastPrompt;
      this.$nextTick(() => this.sendMessage());
    },
    highlightCodes() {
      try {
        if (window.hljs) {
          const nodes = document.querySelectorAll('.chat-list pre.md-code code');
          nodes.forEach(n => window.hljs.highlightElement(n));
        }
      } catch (_) {}
    },
    formatRelativeTime(ts) {
      const diff = Date.now() - ts;
      if (diff < 60 * 1000) return '刚刚';
      if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + '分钟前';
      if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      if (days < 7) return days + '天前';
      const d = new Date(ts);
      return d.toLocaleString();
    },
    escapeHtml(str) {
      return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    },
    renderMarkdown(raw) {
      let text = raw || '';
      text = this.escapeHtml(text);
      // 代码块 ```lang\n...```
      text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => `<div class="md-code-block"><div class="code-toolbar"><button class="code-copy-btn">复制</button></div><pre class="md-code"><code class="language-${lang || 'plaintext'}">${code}</code></pre></div>`);

      const inline = (s) => {
        if (!s) return '';
        s = s.replace(/`([^`]+)`/g, (m, code) => `<code class="md-inline">${code}</code>`);
        s = s.replace(/\*\*([^*]+)\*\*/g, (m, bold) => `<strong>${bold}</strong>`);
        s = s.replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, (m, pre, ital) => `${pre}<em>${ital}</em>`);
        // 支持 http/https 以及 data: URI 的图片渲染
        s = s.replace(/!\[([^\]]*)\]\(((?:https?|data):[^\s)]+)\)/g, (m, alt, url) => `<img class="md-img" src="${url}" alt="${alt}">`);
        s = s.replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, (m, t, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${t}</a>`);
        return s;
      };

      const lines = text.split(/\r?\n/);
      let html = '';
      let inUl = false, inOl = false, inBq = false, inTable = false;
      let tableRows = [];

      const closeLists = () => {
        if (inUl) { html += '</ul>'; inUl = false; }
        if (inOl) { html += '</ol>'; inOl = false; }
      };
      const flushTable = () => {
        if (!inTable) return;
        inTable = false;
        if (tableRows.length >= 2 && /(^|\|)\s*-+\s*(\|\s*-+\s*)+/.test(tableRows[1])) {
          const header = tableRows[0].split('|').map(c => c.trim()).filter(c => c.length);
          const bodyRows = tableRows.slice(2).map(r => r.split('|').map(c => c.trim()).filter(c => c.length));
          html += '<table class="md-table"><thead><tr>' + header.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>' + bodyRows.map(cols => '<tr>' + cols.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
        } else {
          tableRows.forEach(r => { html += `<p>${inline(r)}</p>`; });
        }
        tableRows = [];
      };

      for (let line of lines) {
        const isTableLine = /\|/.test(line) && !/^\s*!\[/.test(line);
        const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
        const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
        const bqMatch = line.match(/^\s*>\s?(.*)$/);
        const heading = line.match(/^\s*(#{1,6})\s+(.*)$/);
        const hr = /^\s*([-*_]){3,}\s*$/.test(line);

        if (isTableLine) {
          closeLists();
          if (!inTable) { inTable = true; tableRows = []; }
          tableRows.push(line);
          continue;
        } else {
          flushTable();
        }

        if (heading) {
          closeLists();
          const level = heading[1].length;
          html += `<h${level} class="md-h${level}">${inline(heading[2])}</h${level}>`;
          continue;
        }
        if (hr) {
          closeLists();
          html += '<hr class="md-hr">';
          continue;
        }
        if (bqMatch) {
          closeLists();
          if (!inBq) { html += '<blockquote class="md-quote">'; inBq = true; }
          html += inline(bqMatch[1]) + '<br>';
          continue;
        } else if (inBq) {
          html += '</blockquote>';
          inBq = false;
        }

        if (ulMatch) {
          if (!inUl) { closeLists(); html += '<ul class="md-ul">'; inUl = true; }
          html += `<li>${inline(ulMatch[1])}</li>`;
          continue;
        }
        if (olMatch) {
          if (!inOl) { closeLists(); html += '<ol class="md-ol">'; inOl = true; }
          html += `<li>${inline(olMatch[1])}</li>`;
          continue;
        }

        if (inUl || inOl) { closeLists(); }
        if (line.trim().length === 0) { html += '<br>'; continue; }
        html += `<p>${inline(line)}</p>`;
      }

      if (inBq) { html += '</blockquote>'; inBq = false; }
      if (inUl || inOl) closeLists();
      flushTable();
      return html;
    },
    renderMessageHtml(m) {
      return this.renderMarkdown(m.content || '');
    }
  }
};

import ChatDBService from '/js/services/ChatDBService.js';

createApp(AiChatApp).mount('#app');