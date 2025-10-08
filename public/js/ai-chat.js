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
  tongyi: { label: '通义千问（DashScope兼容）', baseUrl: 'https://dashscope.aliyuncs.com/v1/chat/completions', model: 'qwen-turbo' },
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
      messages: [],
      inputText: '',
      isSending: false,
      connStatus: 'idle',
      canRetry: false,
      lastPrompt: '',
      autoScroll: true,
      configModalVisible: false,
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
    });
  },

  computed: {
    isConfigured() {
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

    openConfigModal() {
      this.configModalVisible = true;
    },

    closeConfigModal() {
      this.configModalVisible = false;
    },

    saveConfig() {
      localStorage.setItem(STORAGE.provider, this.provider);
      localStorage.setItem(STORAGE.baseUrl, (this.baseUrl || '').trim());
      localStorage.setItem(STORAGE.apiKey, (this.apiKey || '').trim());
      localStorage.setItem(STORAGE.model, (this.model || '').trim());
      localStorage.setItem(STORAGE.systemPrompt, this.systemPrompt || '');
      localStorage.setItem(STORAGE.temperature, String(this.temperature ?? 0.7));
      localStorage.setItem(STORAGE.timeoutSec, String(this.streamTimeoutSec || 30));
      try { CustomModal.showSuccess('配置已保存'); } catch (_) { /* fallback ignored */ }
      this.closeConfigModal();
    },

    resetToProviderDefaults() {
      const p = PROVIDERS[this.provider] || PROVIDERS.deepseek;
      this.baseUrl = p.baseUrl;
      this.model = p.model;
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

    async sendMessage() {
      const content = (this.inputText || '').trim();
      if (!content) return;
      if (!this.isConfigured) {
        try { CustomModal.showWarning('请先完成模型配置：基础地址与模型名称'); } catch (_) { /* fallback ignored */ }
        this.openConfigModal();
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
            const msg = retryErr?.response?.data?.error?.message || retryErr?.message || e?.response?.data?.error?.message || e?.message || '未知错误';
            this.messages.push({ role: 'assistant', content: `错误：${msg}` });
            this.connStatus = 'error';
            this.canRetry = true;
          }
        }
      } finally {
        this.isSending = false;
        this.$nextTick(() => { this.scrollToBottom(); this.highlightCodes(); });
        this._abortController = null;
        this._userStopped = false;
        this._timedOut = false;
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
        s = s.replace(/!\[([^\]]*)\]\((https?:[^\s)]+)\)/g, (m, alt, url) => `<img class="md-img" src="${url}" alt="${alt}">`);
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