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
      <button class="ann-open" title="查看重要提示">📣公告</button>
	  <button class="ann-open feedback" title="留言反馈">💬留言反馈</button>
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

  // ===== 留言反馈弹窗 =====
  const feedbackUrl = (typeof window.__FEEDBACK_URL__ !== 'undefined' && window.__FEEDBACK_URL__) 
    ? window.__FEEDBACK_URL__ 
    : 'https://admin.ycz.me/api/site.index/feedback';

  const fbOverlay = document.createElement('div');
  fbOverlay.className = 'first-visit-modal fv-hidden';
  fbOverlay.innerHTML = `
    <div class="fv-backdrop"></div>
    <div class="fv-modal fv-feedback" role="dialog" aria-modal="true" aria-labelledby="fb-title">
      <button class="fv-close" aria-label="关闭">×</button>
      <div class="fv-header">
        <h3 id="fb-title" class="fv-title">留言反馈</h3>
      </div>
      <div class="fv-body">
        <div class="fv-form">
          <label>姓名/昵称</label>
          <input type="text" class="fb-name" placeholder="可留空" autocomplete="off">
          <label>联系方式</label>
          <input type="text" class="fb-contact" placeholder="邮箱/微信/电话，选填" autocomplete="off">
          <label>留言内容</label>
          <textarea class="fb-msg" placeholder="请输入你的建议、问题或需求" rows="4"></textarea>
        </div>
        <div class="fb-status" style="margin-top:8px;color:#6b7280;font-size:13px;display:none;"></div>
      </div>
      <div class="fv-footer">
        <button class="fv-link" style="display:none;"></button>
        <button class="fb-submit">提交</button>
      </div>
    </div>
  `;
  document.body.appendChild(fbOverlay);

  const showFeedback = () => {
    fbOverlay.classList.remove('fv-hidden');
  };
  const hideFeedback = () => {
    fbOverlay.classList.add('fv-hidden');
  };

  // 事件绑定
  const fbBackdropEl = fbOverlay.querySelector('.fv-backdrop');
  const fbCloseBtn = fbOverlay.querySelector('.fv-close');
  const fbSubmitBtn = fbOverlay.querySelector('.fb-submit');
  const fbNameInput = fbOverlay.querySelector('.fb-name');
  const fbContactInput = fbOverlay.querySelector('.fb-contact');
  const fbMsgInput = fbOverlay.querySelector('.fb-msg');
  const fbStatusEl = fbOverlay.querySelector('.fb-status');

  const feedbackBtn = widget.querySelector('.ann-open.feedback');
  feedbackBtn && feedbackBtn.addEventListener('click', showFeedback);
  fbBackdropEl.addEventListener('click', hideFeedback);
  fbCloseBtn.addEventListener('click', hideFeedback);

  const setFbStatus = (text, type = 'info') => {
    if (!fbStatusEl) return;
    fbStatusEl.style.display = 'block';
    fbStatusEl.style.color = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#6b7280');
    fbStatusEl.textContent = text || '';
  };

  fbSubmitBtn.addEventListener('click', async () => {
    const name = fbNameInput.value.trim();
    const contact = fbContactInput.value.trim();
    const msg = fbMsgInput.value.trim();

    if (!msg) {
      setFbStatus('请填写留言内容', 'error');
      fbMsgInput.focus();
      return;
    }

    try {
      setFbStatus('提交中...', 'info');
      fbSubmitBtn.disabled = true;

      const res = await fetch(feedbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, msg })
      });

      let data = null;
      try { data = await res.json(); } catch (e) {}

      if (res.ok) {
        setFbStatus('提交成功，感谢你的反馈！', 'success');
        fbNameInput.value = '';
        fbContactInput.value = '';
        fbMsgInput.value = '';
        setTimeout(() => hideFeedback(), 1200);
      } else {
        const message = (data && (data.msg || data.message)) || `提交失败(${res.status})`;
        setFbStatus(message, 'error');
      }
    } catch (error) {
      setFbStatus('网络异常或跨域限制，稍后重试', 'error');
    } finally {
      fbSubmitBtn.disabled = false;
    }
  });

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