/* Soma Studio presentation behavior, using its local component timings.
 * Existing case scripts retain ownership of all evidence and data controls. */
(() => {
  'use strict';
  if (!document.body.classList.contains('soma-work') || window.__somaWorkPresentation) return;
  window.__somaWorkPresentation = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const liveAnimations = new Set();
  const once = new WeakSet();
  function animate(element, frames, options) {
    if (reduced.matches || !element.animate) return Promise.resolve();
    const animation = element.animate(frames, options);
    liveAnimations.add(animation);
    return animation.finished.catch(() => {}).finally(() => liveAnimations.delete(animation));
  }
  const observed = new WeakMap();
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const show = observed.get(entry.target);
      if (show) show();
    });
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' }) : null;
  function inView(element, show) {
    if (once.has(element)) return;
    once.add(element);
    if (reduced.matches || !observer) { show(); return; }
    observed.set(element, show);
    observer.observe(element);
  }
  // Native Intro / Year mount: scale 1.6, opacity .001, .8 seconds, no bounce.
  const intros = document.querySelectorAll('.framer-1iej295');
  const years = document.querySelectorAll('.framer-m8sx61');
  const mountTargets = [...(intros.length ? intros : document.querySelectorAll('.wr-hero')),
    ...(years.length ? years : document.querySelectorAll('.wr-year')),
    ...document.querySelectorAll('.framer-1633omm')];
  mountTargets.forEach(element => {
    if (element.getClientRects().length === 0) return;
    element.style.opacity = '';
    element.style.transform = '';
    animate(element, [{ opacity: .001, transform: 'scale(1.6)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 800, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
  // Keep every original text node's characters and whitespace in the same order.
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', { granularity: 'word' }) : null;
  function wrapText(element, mode) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('script,style,button,select,option,textarea,.soma-token')) continue;
      if (node.nodeValue) texts.push(node);
    }
    const inners = [];
    texts.forEach(text => {
      const fragment = document.createDocumentFragment();
      const chunks = mode === 'character' ? Array.from(text.nodeValue) : segmenter
        ? Array.from(segmenter.segment(text.nodeValue), item => item.segment)
        : (text.nodeValue.match(/\s+|[^\s]+/gu) || []);
      chunks.forEach(chunk => {
        if (/^\s+$/u.test(chunk)) { fragment.append(document.createTextNode(chunk)); return; }
        const clip = document.createElement('span');
        clip.className = 'soma-token';
        clip.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;text-indent:0;';
        const inner = document.createElement('span');
        inner.style.cssText = 'display:inline-block;white-space:pre-wrap;';
        inner.textContent = chunk;
        clip.append(inner);
        fragment.append(clip);
        inners.push(inner);
      });
      text.replaceWith(fragment);
    });
    return inners;
  }
  if (!reduced.matches) {
    document.querySelectorAll('.soma-quote').forEach(element => {
      const words = wrapText(element, 'word');
      // Native quote: each word rises through its mask in 600ms; stagger 60ms.
      words.forEach(word => { word.style.transform = 'translateY(100%)'; });
      inView(element, () => words.forEach((word, index) => {
        word.style.transform = '';
        animate(word, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
          { duration: 600, delay: index * 60, easing: 'cubic-bezier(.4,1,.4,1)', fill: 'backwards' });
      }));
    });
    const stats = [...document.querySelectorAll('.soma-stat-value, .wr-data-strip strong, .wr-game-metrics strong, .oa-report-snapshot strong')]
      .filter(element => !element.closest('table, .wr-result-panel, .pk-epochs, .pk-metric, [aria-live]'));
    [...new Set(stats)].forEach((element, statIndex) => {
      if (!element.textContent.trim()) return;
      const characters = wrapText(element, 'character');
      characters.forEach(character => { character.style.opacity = '.001'; character.style.transform = 'translateY(80px)'; });
      inView(element, () => characters.forEach((character, index) => {
        character.style.opacity = ''; character.style.transform = '';
        animate(character, [{ opacity: .001, transform: 'translateY(80px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 800, delay: (statIndex % 4) * 100 + index * 75, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      }));
    });
  }
  // Native image reveal is a left-to-right mask, duration 1.2s, ease .6/0/.4/1.
  const imageCandidates = [...document.querySelectorAll('.soma-art, .soma-image, .vr-figure')]
    .map(element => element.matches('img,picture') ? element.parentElement : element)
    .filter(element => element && element.querySelector('img'));
  const imageHosts = [...new Set(imageCandidates)].filter(element => !imageCandidates.some(other => other !== element && other.contains(element)));
  imageHosts.forEach(host => {
    if (reduced.matches) return;
    host.style.clipPath = 'inset(0 100% 0 0)';
    inView(host, () => {
      host.style.clipPath = '';
      animate(host, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }],
        { duration: 1200, easing: 'cubic-bezier(.6,0,.4,1)' });
    });
  });
  // The individual case scripts already own Menu click toggling.
  const menuButton = document.querySelector('.wr-menu');
  const mobileMenu = document.getElementById('wr-mobile-nav');
  function closeMenu(returnFocus) {
    if (!menuButton || !mobileMenu || mobileMenu.hidden) return;
    mobileMenu.hidden = true; menuButton.setAttribute('aria-expanded', 'false');
    const indicator = menuButton.querySelector('span');
    if (indicator) indicator.textContent = '＋';
    if (returnFocus) menuButton.focus();
  }
  if (menuButton && mobileMenu) {
    mobileMenu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(false); });
    document.addEventListener('pointerdown', event => {
      if (!mobileMenu.contains(event.target) && !menuButton.contains(event.target)) closeMenu(false);
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(true); });
    window.matchMedia('(min-width: 810px)').addEventListener('change', event => { if (event.matches) closeMenu(false); });
  }
  reduced.addEventListener('change', event => {
    if (!event.matches) return;
    liveAnimations.forEach(animation => animation.finish());
    document.querySelectorAll('.soma-token > span').forEach(element => { element.style.opacity = ''; element.style.transform = ''; });
    imageHosts.forEach(host => { host.style.clipPath = ''; });
    if (observer) observer.disconnect();
  });
  // Soma's full-gallery lightbox: 400ms fade, arrows/counter, wrapping traversal,
  // Escape / arrows / backdrop, and a 100px horizontal swipe threshold.
  const pictures = imageHosts.map(host => ({ host, image: host.querySelector('img') }));
  if (!pictures.length || typeof HTMLDialogElement === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = '.soma-lightbox{position:fixed;inset:0;box-sizing:border-box;width:100vw;max-width:none;height:100svh;max-height:none;margin:0;padding:40px;border:0;background:rgba(0,0,0,.95);color:#fff;overflow:hidden;z-index:999999}.soma-lightbox::backdrop{background:transparent}.soma-lightbox[open]{display:flex;align-items:center;justify-content:center}.soma-lightbox-stage{height:100%;width:100%;display:flex;align-items:center;justify-content:center;position:relative}.soma-lightbox img{display:block;width:auto;height:auto;max-width:100%;max-height:100%;object-fit:contain;touch-action:pan-y;user-select:none;-webkit-user-drag:none;cursor:grab}.soma-lightbox button{font:700 14px/1 "Inter Display",sans-serif;letter-spacing:.02em;display:flex;align-items:center;justify-content:center;color:#fff;border:0;cursor:pointer}.soma-lightbox-close{position:absolute;right:20px;top:20px;padding:12px;border-radius:9999px;background:rgba(0,0,0,.5);z-index:2}.soma-lightbox-controls{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);display:flex;gap:16px;align-items:center;padding:8px 12px;border-radius:9999px;background:rgba(0,0,0,.5);z-index:2}.soma-lightbox-controls[hidden]{display:none}.soma-lightbox-controls button{height:22px;padding:0;background:transparent}.soma-lightbox-counter{font:700 14px/1 "Inter Display",sans-serif;letter-spacing:.02em;white-space:nowrap}.soma-lightbox :focus-visible{outline:2px solid white;outline-offset:5px}.soma-lightbox svg{width:22px;height:22px;display:block;stroke:currentColor;fill:none;stroke-width:2.5}.soma-lightbox-trigger{cursor:pointer}.soma-lightbox-trigger:focus-visible{outline:2px solid currentColor;outline-offset:5px}@media(max-width:809px){.soma-lightbox{padding:64px 20px 90px}}';
  document.head.append(style);
  const dialog = document.createElement('dialog');
  dialog.className = 'soma-lightbox'; dialog.setAttribute('aria-label', '项目图像预览');
  const icon = path => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>';
  const closeButton = document.createElement('button');
  closeButton.type = 'button'; closeButton.className = 'soma-lightbox-close';
  closeButton.setAttribute('aria-label', '关闭图像预览'); closeButton.innerHTML = icon('M6 6l12 12M18 6 6 18');
  const stage = document.createElement('div'); stage.className = 'soma-lightbox-stage';
  const controls = document.createElement('div'); controls.className = 'soma-lightbox-controls';
  const previousButton = document.createElement('button'); previousButton.type = 'button'; previousButton.setAttribute('aria-label', '上一张图像'); previousButton.innerHTML = icon('M15 18l-6-6 6-6');
  const nextButton = document.createElement('button'); nextButton.type = 'button'; nextButton.setAttribute('aria-label', '下一张图像'); nextButton.innerHTML = icon('M9 6l6 6-6 6');
  const counter = document.createElement('div'); counter.className = 'soma-lightbox-counter'; counter.setAttribute('role', 'status'); counter.setAttribute('aria-live', 'polite');
  controls.append(previousButton, counter, nextButton); dialog.append(stage, closeButton, controls); document.body.append(dialog);
  let index = 0, activeImage = null, opener = null, previousOverflow = '', closing = false, dragStart = null, dragOffset = 0;
  function configureImage(image) {
    image.draggable = false;
    image.addEventListener('pointerdown', event => {
      if (event.button !== 0 || pictures.length < 2) return;
      dragStart = event.clientX; dragOffset = 0;
      if (image.setPointerCapture) image.setPointerCapture(event.pointerId);
    });
    image.addEventListener('pointermove', event => {
      if (dragStart === null) return;
      dragOffset = event.clientX - dragStart;
      image.style.transform = 'translateX(' + dragOffset + 'px)';
      image.style.opacity = String(Math.max(0, 1 - Math.abs(dragOffset) / 100));
    });
    function endDrag() {
      if (dragStart === null) return;
      const offset = dragOffset; dragStart = null; dragOffset = 0;
      image.style.transform = ''; image.style.opacity = '';
      if (Math.abs(offset) > 100) navigate(offset > 0 ? -1 : 1);
    }
    image.addEventListener('pointerup', endDrag); image.addEventListener('pointercancel', endDrag);
  }
  function showImage(direction) {
    const source = pictures[index].image;
    const image = document.createElement('img'); image.src = source.currentSrc || source.src; image.alt = source.alt;
    configureImage(image);
    const old = activeImage; activeImage = image;
    counter.textContent = (index + 1) + ' / ' + pictures.length;
    controls.hidden = pictures.length < 2;
    const distance = innerWidth * 1.05;
    if (old && direction) {
      old.style.position = 'absolute';
      animate(old, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + (-direction * distance) + 'px)', opacity: 0 }],
        { duration: 400, easing: 'ease-in-out' }).then(() => old.remove());
    } else if (old) old.remove();
    stage.append(image);
    animate(image, [{ transform: 'translateX(' + (direction * distance) + 'px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
      { duration: 400, easing: 'ease-in-out' });
  }
  function navigate(direction) {
    if (!dialog.open || closing || pictures.length < 2) return;
    index = (index + direction + pictures.length) % pictures.length; showImage(direction);
  }
  function openImage(at, trigger) {
    if (dialog.open) return;
    index = at; opener = trigger; closing = false;
    previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.showModal(); showImage(0); closeButton.focus();
    animate(dialog, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-in-out' });
  }
  function closeImage() {
    if (!dialog.open || closing) return;
    closing = true;
    animate(dialog, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-in-out' }).then(() => {
      dialog.close(); document.body.style.overflow = previousOverflow; closing = false;
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    });
  }
  pictures.forEach(({ image }, at) => {
    image.classList.add('soma-lightbox-trigger');
    image.tabIndex = 0; image.setAttribute('role', 'button'); image.setAttribute('aria-label', '放大图像：' + (image.alt || '项目配图'));
    image.addEventListener('click', () => openImage(at, image));
    image.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault(); openImage(at, image);
    });
  });
  previousButton.addEventListener('click', () => navigate(-1)); nextButton.addEventListener('click', () => navigate(1)); closeButton.addEventListener('click', closeImage);
  dialog.addEventListener('click', event => { if (event.target === dialog || event.target === stage) closeImage(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeImage(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); navigate(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); navigate(1); }
  });
})();
