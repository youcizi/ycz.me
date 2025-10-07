// First-visit modal and announcement widget
document.addEventListener('DOMContentLoaded', () => {
  const LS_MODAL_KEY = 'firstVisitModalShown';
  const LS_WIDGET_COLLAPSED_KEY = 'announcementWidgetCollapsed';

  // Create modal elements
  const backdrop = document.createElement('div');
  backdrop.className = 'first-visit-modal fv-hidden';
  backdrop.innerHTML = `
    <div class="fv-backdrop"></div>
    <div class="fv-modal" role="dialog" aria-modal="true" aria-labelledby="fv-title">
      <button class="fv-close" aria-label="关闭">×</button>
      <div class="fv-header">
        <h3 id="fv-title" class="fv-title">重要提示</h3>
      </div>
      <div class="fv-body">
        <p>本站所有数据保存在你的浏览器本地（IndexedDB / localStorage），不会上传到 <strong>ycz.me</strong> 或任何后台。</p>
        <p>所有数据以及接口均需你自行配置。请<strong>及时备份和保存</strong>网站数据，以免丢失。</p>
        <p>项目开源地址：<a href="https://github.com/youcizi/ycz.me" target="_blank" rel="noopener noreferrer">https://github.com/youcizi/ycz.me</a></p>
      </div>
      <div class="fv-footer">
        <a class="fv-link" href="https://github.com/youcizi/ycz.me" target="_blank" rel="noopener noreferrer">GitHub 开源</a>
        <button class="fv-ok">我知道了</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const showModal = () => {
    backdrop.classList.remove('fv-hidden');
    // 标记为已展示，确保多次打开仅弹一次
    try { localStorage.setItem(LS_MODAL_KEY, '1'); } catch (e) {}
  };
  const hideModal = () => backdrop.classList.add('fv-hidden');

  backdrop.querySelector('.fv-backdrop').addEventListener('click', hideModal);
  backdrop.querySelector('.fv-close').addEventListener('click', hideModal);
  backdrop.querySelector('.fv-ok').addEventListener('click', hideModal);

  // Create announcement widget
  const widget = document.createElement('div');
  widget.className = 'announcement-widget';
  widget.innerHTML = `
    <div class="ann-panel">
      <button class="ann-open" title="查看重要提示">📣 公告</button>
      <button class="ann-collapse" style="font-size:12px;" title="收起">▶︎</button>
    </div>
    <button class="ann-collapsed-arrow" title="展开">◀</button>
  `;
  document.body.appendChild(widget);

  const annPanel = widget.querySelector('.ann-panel');
  const annOpen = widget.querySelector('.ann-open');
  const annCollapse = widget.querySelector('.ann-collapse');
  const annArrow = widget.querySelector('.ann-collapsed-arrow');

  const setCollapsed = (collapsed) => {
    widget.classList.toggle('collapsed', !!collapsed);
    try { localStorage.setItem(LS_WIDGET_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch (e) {}
  };

  annOpen.addEventListener('click', showModal);
  annCollapse.addEventListener('click', () => setCollapsed(true));
  annArrow.addEventListener('click', () => setCollapsed(false));

  // Init from localStorage
  let collapsed = false;
  try { collapsed = localStorage.getItem(LS_WIDGET_COLLAPSED_KEY) === '1'; } catch (e) {}
  setCollapsed(collapsed);

  // Show modal once per user
  let shown = false;
  try { shown = localStorage.getItem(LS_MODAL_KEY) === '1'; } catch (e) {}
  if (!shown) {
    showModal();
  }
});