/* Restore figure geometry after native hydration; retain the existing viewer. */
(() => {
  let page;
  try { page = JSON.parse(document.getElementById('cms-page-seed')?.textContent || '{}'); } catch { return; }
  if (!Array.isArray(page.galleryFigures)) return;
  const filename = src => src.split('/').pop().split('?')[0];
  const figures = new Map(page.galleryFigures.map(figure => [filename(figure.src), figure]));
  const cover = page.media?.['96ab4e27']?.value;
  const bound = new WeakSet();
  let scheduled = false;
  function apply() {
    scheduled = false;
    document.querySelectorAll('img[src]').forEach(image => {
      const name = filename(image.getAttribute('src'));
      const figure = figures.get(name);
      const alt = figure?.alt || (cover && filename(cover) === name ? page.projectCoverAlt : null);
      if (alt && image.alt !== alt) image.alt = alt;
      if (!figure) return;
      const frame = image.closest('section[data-framer-name="Image"]');
      if (!frame) return;
      frame.dataset.projectGalleryFigure = '';
      frame.style.setProperty('--project-image-ratio', `${figure.width} / ${figure.height}`);
      // Video cards remain native links, including their keyboard behavior.
      if (frame.querySelector('.topic-video-link')) {
        frame.removeAttribute('role');
        frame.removeAttribute('tabindex');
        frame.removeAttribute('aria-label');
        return;
      }
      frame.setAttribute('role', 'button');
      frame.setAttribute('tabindex', '0');
      frame.setAttribute('aria-label', figure.alt + ' 点击查看原图');
      if (bound.has(frame)) return;
      frame.addEventListener('keydown', event => {
        if (event.target !== frame || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        frame.querySelector('img')?.click();
      });
      bound.add(frame);
    });
    document.querySelectorAll('button[aria-label="Close lightbox"]').forEach(button => {
      const viewer = button.closest('div[style*="position: fixed"]');
      const image = viewer?.querySelector('img[src]');
      if (!image) return;
      let original = viewer.querySelector('a.project-original-image');
      if (!original) {
        original = document.createElement('a');
        original.className = 'project-original-image';
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
