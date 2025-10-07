// 在线工具页 Vue 应用
const { createApp, computed } = Vue;

const ToolsApp = {
  data() {
    return {
      tools: [
        { id: 'timestamp', name: '时间戳转换', icon: '⏱' },
        { id: 'base64', name: 'Base64 编解码', icon: '🔤' },
        { id: 'url', name: 'URL 编解码', icon: '🔗' },
        { id: 'json', name: 'JSON 格式化与校验', icon: '🧾' },
        { id: 'code', name: 'JS/CSS 格式化与压缩', icon: '🛠️' }
      ],
      currentToolId: 'timestamp',
      // 时间戳转换
      tsInput: '',
      tsUnit: 's', // s|ms
      tsToDateOutput: '',
      dtInput: '', // datetime-local 字符串
      dtOutputUnit: 's', // s|ms
      dtToTsOutput: '',
      // Base64
      b64Input: '',
      b64Output: '',
      // URL
      urlInput: '',
      urlOutput: '',
      // JSON
      jsonInput: '',
      jsonOutput: '',
      // 代码（JS/CSS）
      codeType: 'javascript', // javascript | css
      codeInput: '',
      codeOutput: '',
      // 日历相关
      calendarVisible: false,
      viewYear: new Date().getFullYear(),
      viewMonth: new Date().getMonth(), // 0-11
      selectedDate: new Date(),
      // 定位与天气（默认北京）
      locationName: '北京',
      weatherVisible: false,
      dateTriggerEl: null,
      // 年月选择器
      ymPickerVisible: false,
      ymSelectYear: new Date().getFullYear(),
      ymSelectMonth: new Date().getMonth() + 1,
      yearOptions: [],
      monthOptions: []
    };
  },
  computed: {
    currentToolName() {
      const t = this.tools.find(x => x.id === this.currentToolId);
      return t ? t.name : '请选择工具';
    },
    currentDateDisplay() {
      const d = this.selectedDate;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const weekday = ['日','一','二','三','四','五','六'][d.getDay()];
      return `${y}年${m}月${day}日 星期${weekday}`;
    },
    monthDays() {
      const year = this.viewYear;
      const month = this.viewMonth; // 0-11
      const firstDay = new Date(year, month, 1);
      const startWeek = firstDay.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const prevMonthDays = new Date(year, month, 0).getDate();

      const cells = [];
      // 上月补位
      for (let i = startWeek - 1; i >= 0; i--) {
        const d = new Date(year, month - 1, prevMonthDays - i);
        cells.push(this.makeDayCell(d, false));
      }
      // 当月
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        cells.push(this.makeDayCell(d, true));
      }
      // 下月补齐整周
      const total = cells.length;
      const pad = (Math.ceil(total / 7) * 7) - total;
      for (let i = 1; i <= pad; i++) {
        const d = new Date(year, month + 1, i);
        cells.push(this.makeDayCell(d, false));
      }
      return cells.map((c, idx) => ({ ...c, key: `${c.date.getFullYear()}-${c.date.getMonth()}-${c.date.getDate()}-${idx}` }));
    }
  },
  methods: {
    selectTool(id) {
      this.currentToolId = id;
    },
    // 时间戳转换
    tsToDate() {
      const raw = (this.tsInput || '').trim();
      if (!raw) { this.tsToDateOutput = ''; return; }
      let num = Number(raw);
      if (!Number.isFinite(num)) { this.tsToDateOutput = '输入不是有效数字'; return; }
      // 允许输入过长/过短的字符串，做简单归一
      if (this.tsUnit === 's') {
        // 若明显是毫秒（>=1e12），仍按毫秒处理
        num = num >= 1e12 ? num : num * 1000;
      } else {
        // ms
        num = num >= 1e12 ? num : num; // 保持毫秒
      }
      const d = new Date(num);
      if (isNaN(d.getTime())) { this.tsToDateOutput = '无法解析为日期'; return; }
      this.tsToDateOutput = this.formatDateTime(d);
    },
    dateToTs() {
      const s = (this.dtInput || '').trim();
      if (!s) { this.dtToTsOutput = ''; return; }
      const d = new Date(s);
      if (isNaN(d.getTime())) { this.dtToTsOutput = '无法解析输入的日期时间'; return; }
      const ms = d.getTime();
      this.dtToTsOutput = this.dtOutputUnit === 's' ? String(Math.floor(ms / 1000)) : String(ms);
    },
    formatDateTime(d) {
      const pad2 = (n) => String(n).padStart(2, '0');
      const y = d.getFullYear();
      const m = pad2(d.getMonth() + 1);
      const day = pad2(d.getDate());
      const hh = pad2(d.getHours());
      const mm = pad2(d.getMinutes());
      const ss = pad2(d.getSeconds());
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
    },
    // Base64 编解码
    b64Encode() {
      try {
        // 处理非ASCII字符
        const utf8 = new TextEncoder().encode(this.b64Input || '');
        let bin = '';
        utf8.forEach(b => bin += String.fromCharCode(b));
        this.b64Output = btoa(bin);
      } catch (e) {
        this.b64Output = `编码失败：${e?.message || e}`;
      }
    },
    b64Decode() {
      try {
        const bin = atob((this.b64Input || '').trim());
        const bytes = Uint8Array.from(bin.split('').map(ch => ch.charCodeAt(0)));
        this.b64Output = new TextDecoder().decode(bytes);
      } catch (e) {
        this.b64Output = `解码失败：${e?.message || e}`;
      }
    },
    clearB64() { this.b64Input = ''; this.b64Output = ''; },
    // URL 编解码
    urlEncode() {
      try {
        this.urlOutput = encodeURIComponent(this.urlInput || '');
      } catch (e) {
        this.urlOutput = `编码失败：${e?.message || e}`;
      }
    },
    urlDecode() {
      try {
        this.urlOutput = decodeURIComponent((this.urlInput || '').trim());
      } catch (e) {
        this.urlOutput = `解码失败：${e?.message || e}`;
      }
    },
    clearUrl() { this.urlInput = ''; this.urlOutput = ''; },
    // JSON 工具
    jsonFormat() {
      const raw = this.jsonInput || '';
      if (!raw.trim()) { this.jsonOutput = ''; return; }
      try {
        const obj = JSON.parse(raw);
        this.jsonOutput = JSON.stringify(obj, null, 2);
        if (window.CustomModal && typeof window.CustomModal.showSuccess === 'function') {
          window.CustomModal.showSuccess('JSON 已格式化并通过校验');
        }
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        this.jsonOutput = `JSON 解析错误：${msg}`;
        if (window.CustomModal && typeof window.CustomModal.showError === 'function') {
          window.CustomModal.showError(`JSON 解析失败：${msg}`);
        }
      }
    },
    jsonValidate() {
      const raw = this.jsonInput || '';
      if (!raw.trim()) { this.jsonOutput = ''; return; }
      try {
        JSON.parse(raw);
        this.jsonOutput = '校验通过：JSON 结构有效';
        if (window.CustomModal && typeof window.CustomModal.showSuccess === 'function') {
          window.CustomModal.showSuccess('JSON 校验通过');
        }
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        this.jsonOutput = `校验失败：${msg}`;
        if (window.CustomModal && typeof window.CustomModal.showError === 'function') {
          window.CustomModal.showError(`JSON 校验失败：${msg}`);
        }
      }
    },
    clearJson() { this.jsonInput = ''; this.jsonOutput = ''; },
    // JS/CSS 工具
    codeFormat() {
      const src = this.codeInput || '';
      if (!src.trim()) { this.codeOutput = ''; return; }
      const lang = this.codeType;
      try {
        if (typeof window.prettier === 'undefined' || typeof window.prettier.format !== 'function') {
          throw new Error('未加载格式化库（Prettier）');
        }
        const plugins = window.prettierPlugins || {};
        let parser = 'babel';
        let pluginList = [];
        if (lang === 'javascript') {
          parser = 'babel';
          pluginList = plugins.babel ? [plugins.babel] : (Array.isArray(plugins) ? plugins : []);
        } else if (lang === 'css') {
          parser = 'css';
          pluginList = plugins.postcss ? [plugins.postcss] : (Array.isArray(plugins) ? plugins : []);
        }
        const out = window.prettier.format(src, { parser, plugins: pluginList, tabWidth: 2, singleQuote: true });
        this.codeOutput = out;
        if (window.CustomModal && typeof window.CustomModal.showSuccess === 'function') {
          window.CustomModal.showSuccess(`${lang.toUpperCase()} 已格式化`);
        }
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        this.codeOutput = `格式化失败：${msg}`;
        if (window.CustomModal && typeof window.CustomModal.showError === 'function') {
          window.CustomModal.showError(`格式化失败：${msg}`);
        }
      }
    },
    async codeMinify() {
      const src = this.codeInput || '';
      if (!src.trim()) { this.codeOutput = ''; return; }
      const lang = this.codeType;
      try {
        if (lang === 'javascript') {
          if (!window.Terser || typeof window.Terser.minify !== 'function') {
            throw new Error('未加载压缩库（Terser）');
          }
          const result = await window.Terser.minify(src, { compress: true, mangle: true });
          if (result.error) throw result.error;
          this.codeOutput = result.code || '';
        } else if (lang === 'css') {
          if (!window.csso || typeof window.csso.minify !== 'function') {
            throw new Error('未加载压缩库（CSSO）');
          }
          const result = window.csso.minify(src);
          this.codeOutput = (result && result.css) ? result.css : '';
        }
        if (window.CustomModal && typeof window.CustomModal.showSuccess === 'function') {
          window.CustomModal.showSuccess(`${lang.toUpperCase()} 已压缩`);
        }
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        this.codeOutput = `压缩失败：${msg}`;
        if (window.CustomModal && typeof window.CustomModal.showError === 'function') {
          window.CustomModal.showError(`压缩失败：${msg}`);
        }
      }
    },
    clearCode() { this.codeInput = ''; this.codeOutput = ''; },
    // 日历相关
    showCalendar() { this.calendarVisible = true; this.weatherVisible = false; },
    hideCalendar() { this.calendarVisible = false; this.ymPickerVisible = false; },
    toggleCalendar() { this.calendarVisible = true; this.weatherVisible = false; },
    prevMonth() {
      if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear -= 1; }
      else { this.viewMonth -= 1; }
    },
    nextMonth() {
      if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear += 1; }
      else { this.viewMonth += 1; }
    },
    openYmPicker() {
      this.ymSelectYear = this.viewYear;
      this.ymSelectMonth = this.viewMonth + 1;
      this.ymPickerVisible = true;
    },
    closeYmPicker() { this.ymPickerVisible = false; },
    applyYmSelection() {
      const y = Number(this.ymSelectYear);
      const m = Number(this.ymSelectMonth) - 1; // 0-11
      if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 0 && m <= 11) {
        this.viewYear = y;
        this.viewMonth = m;
      }
      this.ymPickerVisible = false;
    },
    gotoToday() {
      const now = new Date();
      this.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      this.viewYear = this.selectedDate.getFullYear();
      this.viewMonth = this.selectedDate.getMonth();
      this.weatherVisible = false;
      this.calendarVisible = true;
    },
    selectDate(d) {
      this.selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      this.viewYear = this.selectedDate.getFullYear();
      this.viewMonth = this.selectedDate.getMonth();
      // 需求：点击日历内部不隐藏
    },
    makeDayCell(d, inMonth) {
      const today = new Date();
      const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      const sel = this.selectedDate;
      const isSelected = d.getFullYear() === sel.getFullYear() && d.getMonth() === sel.getMonth() && d.getDate() === sel.getDate();
      let lunar = '农历';
      if (window.LunarUtil && typeof window.LunarUtil.formatLunar === 'function') {
        lunar = window.LunarUtil.formatLunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
      }
      return { date: d, inMonth, isToday, isSelected, lunar };
    },
    // 天气面板
    showWeather() { this.weatherVisible = true; this.calendarVisible = false; },
    hideWeather() { this.weatherVisible = false; },
    onDocClick(e) {
      if (!this.dateTriggerEl) return;
      const inside = this.dateTriggerEl.contains(e.target);
      if (!inside) {
        this.calendarVisible = false;
        this.weatherVisible = false;
      }
    }
  },
  mounted() {
    // 定位（失败则保留默认北京）
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { this.locationName = '当前位置'; },
        () => { this.locationName = '北京'; },
        { timeout: 2000 }
      );
    }
    // 初始化年月选项
    for (let y = 1900; y <= 2100; y++) this.yearOptions.push(y);
    this.monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
    // 外部点击关闭（仅点击外部隐藏）
    this.dateTriggerEl = document.getElementById('dateTrigger');
    document.addEventListener('click', this.onDocClick);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick);
  }
};

createApp(ToolsApp).mount('#app');