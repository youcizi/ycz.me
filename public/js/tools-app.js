// 在线工具页 Vue 应用
const { createApp, computed } = Vue;

const ToolsApp = {
  data() {
    return {
      tools: [
        { id: 'timestamp', name: '时间戳转换', icon: '⏱' },
        { id: 'base64', name: 'Base64 编解码', icon: '🔤' },
        { id: 'url', name: 'URL 编解码', icon: '🔗' }
      ],
      currentToolId: 'timestamp',
      // 日历相关
      calendarVisible: false,
      viewYear: new Date().getFullYear(),
      viewMonth: new Date().getMonth(), // 0-11
      selectedDate: new Date(),
      // 定位与天气（默认北京）
      locationName: '北京',
      weatherVisible: false,
      dateTriggerEl: null
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
    // 日历相关
    showCalendar() { this.calendarVisible = true; this.weatherVisible = false; },
    hideCalendar() { this.calendarVisible = false; },
    toggleCalendar() { this.calendarVisible = true; this.weatherVisible = false; },
    prevMonth() {
      if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear -= 1; }
      else { this.viewMonth -= 1; }
    },
    nextMonth() {
      if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear += 1; }
      else { this.viewMonth += 1; }
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
    // 外部点击关闭（仅点击外部隐藏）
    this.dateTriggerEl = document.getElementById('dateTrigger');
    document.addEventListener('click', this.onDocClick);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick);
  }
};

createApp(ToolsApp).mount('#app');