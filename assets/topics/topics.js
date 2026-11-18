/* Keep native motion while adapting the template's sample clock and credits. */
(() => {
  if (!document.body.matches('[data-topic-page], [data-core-project-page]')) return;
  const sourceData = document.getElementById('topic-source-data');
  const sources = sourceData ? JSON.parse(sourceData.textContent) : [];
  const sourceByPoster = new Map(sources.map(source => [source.poster, source]));
  const cmsSeed = document.getElementById('cms-page-seed');
  const seededPage = cmsSeed ? JSON.parse(cmsSeed.textContent) : {};
  const projectVideoByPoster = new Map(Object.entries(seededPage.projectVideoLinks || {}));
  let scheduled = false;
  const clean = () => {
    scheduled = false;
    document.querySelectorAll('span').forEach(element => {
      if (element.children.length || element.textContent.trim() !== 'BERLIN, DE') return;
      element.parentElement.dataset.topicClock = '';
    });
    document.querySelectorAll('img[src]').forEach(picture => {
      const poster = picture.getAttribute('src');
      const source = sourceByPoster.get(poster);
      const path = new URL(poster, location.href).pathname;
      const projectVideo = projectVideoByPoster.get(poster) || projectVideoByPoster.get(path);
      if (!source && !projectVideo) return;
      const frame = picture.closest('[data-framer-background-image-wrapper]');
      if (!frame) return;
      if (source) picture.alt = source.title + ' — ' + source.author;
      else picture.alt = projectVideo.title + ' — 实机画面截帧';
      frame.dataset.topicVideo = source?.video_id || 'local-file';
      if (frame.querySelector('a.topic-video-link')) return;
      const link = document.createElement('a');
      link.className = 'topic-video-link';
      link.href = source?.url || projectVideo.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      if (source) {
        link.setAttribute('aria-label', source.label + '：' + source.title + '，' + source.author + '，在 YouTube 打开');
        link.title = source.title + ' — ' + source.author;
      } else {
        link.dataset.label = projectVideo.label;
        link.setAttribute('aria-label', projectVideo.label + '，' + projectVideo.title + '，在新窗口播放');
        link.title = projectVideo.title;
      }
      // Let the native link open the video without triggering the image viewer.
      link.addEventListener('click', event => event.stopPropagation());
      frame.appendChild(link);
    });
    document.querySelectorAll('footer a[href], footer a[data-topic-credit]').forEach(link => {
      const href = link.getAttribute('href');
      const kind = link.dataset.topicCredit ||
        (href === 'https://templatoria.com/' ? 'author' :
          href === 'https://framer.link/drukarov' ? 'brand' : null);
      if (!kind) return;
      const pairs = Array.from(link.querySelectorAll('div')).filter(element =>
        element.children.length === 2 && Array.from(element.children).every(child =>
          child.tagName === 'DIV' && child.children.length === 0));
      if (!pairs.length) return;
      link.dataset.topicCredit = kind;
      link.setAttribute('href', '/');
      link.removeAttribute('target');
      link.setAttribute('aria-label', 'Huang');
      const letters = Array.from(kind === 'brand' ? 'HUANG@' : 'HUANG');
      pairs.forEach((pair, index) => {
        pair.parentElement.style.display = index < letters.length ? 'inline-block' : 'none';
        Array.from(pair.children).forEach(glyph => {
          const value = letters[index] || '';
          if (glyph.textContent !== value) glyph.textContent = value;
        });
      });
    });
  };
  clean();
  window.addEventListener('load', clean, { once: true });
  setTimeout(clean, 1500);
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(clean);
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src'] });
})();
