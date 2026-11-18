/* Page-scoped controls. Shared Soma motion/navigation remains in soma-work.js. */
(() => {
  'use strict';
  const menu = document.querySelector('.wr-menu');
  const mobile = document.getElementById('wr-mobile-nav');
  menu?.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(expanded));
    mobile.hidden = !expanded;
    menu.querySelector('span').textContent = expanded ? '−' : '＋';
  });

  const groups = new Map();
  document.querySelectorAll('[data-ow-tabs]').forEach(group => {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    const panels = [...group.querySelectorAll('[role="tabpanel"]')];
    function select(index, focus = false) {
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
      if (focus) tabs[index].focus();
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', event => {
        const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length,
          Home: 0, End: tabs.length - 1 }[event.key];
        if (next !== undefined) { event.preventDefault(); select(next, true); }
      });
    });
    groups.set(group.dataset.owTabs, { tabs, panels, select });
  });

  const dialog = document.getElementById('ow-atlas-viewer');
  const viewport = dialog.querySelector('.ow-viewer-body');
  const surface = dialog.querySelector('.ow-zoom-surface');
  const picture = dialog.querySelector('.ow-zoom-image');
  const title = dialog.querySelector('.ow-viewer-title');
  const level = dialog.querySelector('.ow-zoom-level');
  const buttons = Object.fromEntries([...dialog.querySelectorAll('[data-viewer]')].map(b => [b.dataset.viewer, b]));
  const figures = [...document.querySelectorAll('.ow-atlas-open')];
  const photos = [...document.querySelectorAll('.ow-photo-open')];
  const albums = { atlas: figures, photos };
  let album = 'atlas', current = 0, zoom = 1, fitWidth = 0, imageRatio = 1.5, opener, previousOverflow;
  const pointers = new Map();
  let pinch;

  function render(newZoom = zoom, anchor) {
    const oldWidth = fitWidth * zoom;
    const rect = viewport.getBoundingClientRect();
    const ax = anchor ? anchor.x - rect.left : rect.width / 2;
    const ay = anchor ? anchor.y - rect.top : rect.height / 2;
    const oldX = viewport.scrollLeft + ax - Math.max(0, (viewport.clientWidth - oldWidth) / 2);
    const oldY = viewport.scrollTop + ay - Math.max(0, (viewport.clientHeight - oldWidth / imageRatio) / 2);
    const maxZoom = 12;
    zoom = Math.max(1, Math.min(maxZoom, newZoom));
    const nativeWidth = Number(picture.getAttribute('width')) || Infinity;
    fitWidth = Math.max(1, Math.min(viewport.clientWidth - 32, (viewport.clientHeight - 32) * imageRatio, nativeWidth));
    const width = fitWidth * zoom, height = width / imageRatio;
    picture.style.width = width + 'px';
    picture.style.height = height + 'px';
    surface.style.width = Math.max(viewport.clientWidth, width + 32) + 'px';
    surface.style.height = Math.max(viewport.clientHeight, height + 32) + 'px';
    if (oldWidth) {
      viewport.scrollLeft = oldX * width / oldWidth - ax + Math.max(0, (viewport.clientWidth - width) / 2);
      viewport.scrollTop = oldY * width / oldWidth - ay + Math.max(0, (viewport.clientHeight - height) / 2);
    }
    level.value = Math.round(zoom * 100) + '%';
    buttons.out.disabled = zoom <= 1;
    buttons.in.disabled = zoom >= maxZoom;
  }
  function selectImage(index) {
    const items = albums[album];
    current = (index + items.length) % items.length;
    const item = items[current];
    const source = item.querySelector('img');
    picture.src = source.currentSrc || source.src;
    picture.alt = source.alt;
    const sourceWidth = Number(source.getAttribute('width'));
    const sourceHeight = Number(source.getAttribute('height'));
    picture.width = sourceWidth;
    picture.height = sourceHeight;
    imageRatio = sourceWidth / sourceHeight;
    title.textContent = album === 'atlas' ? groups.get('atlas').tabs[current].textContent
      : `${String(current + 1).padStart(2, '0')} / ${item.dataset.photoTitle} · ${current + 1} / ${items.length}`;
    if (album === 'atlas') groups.get('atlas').select(current);
    fitWidth = 0;
    render(1);
    viewport.scrollTo(0, 0);
  }
  function openImage(kind, index, trigger) {
    if (dialog.open) return;
    album = kind;
    opener = trigger;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    selectImage(index);
    buttons.close.focus();
  }
  figures.forEach((button, i) => button.addEventListener('click', () => openImage('atlas', i, button)));
  document.querySelectorAll('[data-photo-index]').forEach(button => {
    button.addEventListener('click', () => openImage('photos', Number(button.dataset.photoIndex), button));
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow || '';
    pointers.clear(); pinch = null;
    // Arrow navigation changes the active panel, so restore focus to its opener.
    (album === 'atlas' ? figures[current] : opener)?.focus({ preventScroll: true });
  });
  buttons.close.addEventListener('click', () => dialog.close());
  buttons.previous.addEventListener('click', () => selectImage(current - 1));
  buttons.next.addEventListener('click', () => selectImage(current + 1));
  buttons.in.addEventListener('click', () => render(zoom * 1.4));
  buttons.out.addEventListener('click', () => render(zoom / 1.4));
  buttons.actual.addEventListener('click', () => { render(picture.naturalWidth / fitWidth); viewport.scrollTo(0, 0); });
  buttons.fit.addEventListener('click', () => { fitWidth = 0; render(1); viewport.scrollTo(0, 0); });
  dialog.addEventListener('keydown', event => {
    if (event.key === '+' || event.key === '=') { event.preventDefault(); render(zoom * 1.4); }
    if (event.key === '-') { event.preventDefault(); render(zoom / 1.4); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); selectImage(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); selectImage(current + 1); }
    if (event.key === '0') { event.preventDefault(); fitWidth = 0; render(1); viewport.scrollTo(0, 0); }
  });
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    render(zoom * Math.exp(-event.deltaY * 0.002), { x: event.clientX, y: event.clientY });
  }, { passive: false });
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('ow-dragging');
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  });
  viewport.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      render(pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.distance, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    } else {
      viewport.scrollLeft -= event.clientX - previous.x;
      viewport.scrollTop -= event.clientY - previous.y;
    }
  });
  function release(event) {
    pointers.delete(event.pointerId); pinch = null;
    if (!pointers.size) viewport.classList.remove('ow-dragging');
  }
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);
  window.addEventListener('resize', () => { if (dialog.open) render(); });
})();
