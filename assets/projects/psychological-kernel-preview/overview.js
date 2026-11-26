/* Keep the native image viewer, with descriptive names and keyboard access. */
(() => {
  if (!document.body.matches('[data-core-project-id="psychological-kernel-preview"]')) return;
  const descriptions = new Map([
    ['psychological-kernel-empty-carriage-v1.webp', '心理内核研究概念插画：雨夜列车空座与热饮，AI 生成。'],
    ['research-framework.svg', '研究框架：情境事实与角色特征，经轻量模型输出九轴状态，再分层检验机制响应。'],
    ['b-response-curves.png', '响应曲线：自我效能案例响应通过，可用精力案例响应不足。'],
    ['validation-summary.svg', '验证摘要：格式通过，曲线稳定性 37.5%，本轮工程迁移 REJECT。'],
    ['b-archive.webp', '研究情境插画：Mara 检查档案馆的传动带，AI 生成，非实验画面。'],
  ]);
  const bound = new WeakSet();
  let scheduled = false;
  function apply() {
    scheduled = false;
    document.querySelectorAll('img[src]').forEach(image => {
      const filename = image.getAttribute('src').split('/').pop().split('?')[0];
      const description = descriptions.get(filename);
      if (!description) return;
      if (image.alt !== description) image.alt = description;
      const frame = image.closest('section[data-framer-name="Image"]');
      if (!frame) return;
      frame.setAttribute('role', 'button');
      frame.setAttribute('tabindex', '0');
      frame.setAttribute('aria-label', description + ' 点击查看原图');
      if (bound.has(frame)) return;
      frame.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        frame.querySelector('img')?.click();
      });
      bound.add(frame);
    });
    document.querySelectorAll('button[aria-label="Close lightbox"]').forEach(button => {
      const viewer = button.closest('div[style*="position: fixed"]');
      const image = viewer?.querySelector('img[src]');
      if (!image) return;
      let original = viewer.querySelector('a.pk-original-image');
      if (!original) {
        original = document.createElement('a');
        original.className = 'pk-original-image';
        original.textContent = '打开原图 ↗';
        original.target = '_blank';
        original.rel = 'noopener noreferrer';
        original.setAttribute('aria-label', '在新窗口打开原图，可缩放查看细节');
        original.addEventListener('click', event => event.stopPropagation());
        viewer.appendChild(original);
      }
      original.href = image.src;
    });
  }
  apply();
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
})();
