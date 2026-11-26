/* Semantic emphasis inside the template's existing text and motion layers. */
(() => {
  const seed = document.getElementById('cms-page-seed');
  let page;
  try { page = JSON.parse(seed?.textContent || '{}'); } catch { return; }
  if (!page.textEmphasis) return;
  const compact = value => value.replace(/\s+/g, '');
  const byValue = new Map(Object.entries(page.textEmphasis).map(([key, phrases]) =>
    [compact(page.texts[key]?.value || ''), phrases]));
  let scheduled = false;

  function decorate(element, phrases) {
    const value = element.textContent;
    const ranges = [];
    for (const phrase of phrases) {
      if (!phrase) continue;
      let start = 0, offset;
      while ((offset = value.indexOf(phrase, start)) !== -1) {
        ranges.push([offset, offset + phrase.length]);
        start = offset + phrase.length;
      }
    }
    const merged = [];
    ranges.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
      const last = merged.at(-1);
      if (last && start <= last[1]) last[1] = Math.max(last[1], end);
      else merged.push([start, end]);
    });
    if (!merged.length) return;
    const existing = [...element.querySelectorAll('strong[data-cms-emphasis]')];
    const expected = merged.map(([a, b]) => value.slice(a, b)).join('');
    if (existing.length && existing.map(node => node.textContent).join('') === expected) return;
    existing.forEach(node => node.replaceWith(...node.childNodes));
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    let offset = 0;
    for (const node of nodes) {
      const text = node.nodeValue, end = offset + text.length;
      const cuts = merged.filter(([a, b]) => a < end && b > offset)
        .map(([a, b]) => [Math.max(a, offset) - offset, Math.min(b, end) - offset]);
      if (cuts.length) {
        const fragment = document.createDocumentFragment();
        let position = 0;
        for (const [a, b] of cuts) {
          if (a > position) fragment.append(document.createTextNode(text.slice(position, a)));
          const strong = document.createElement('strong');
          strong.dataset.cmsEmphasis = '';
          strong.textContent = text.slice(a, b);
          fragment.append(strong);
          position = b;
        }
        if (position < text.length) fragment.append(document.createTextNode(text.slice(position)));
        node.replaceWith(fragment);
      }
      offset = end;
    }
  }
  function apply() {
    scheduled = false;
    document.querySelectorAll('p,h1,h2,h3,h4,h5,h6').forEach(element => {
      if (element.closest('footer')) return;
      const phrases = page.textEmphasis[element.dataset.cmsTextKey] || byValue.get(compact(element.textContent));
      if (phrases) decorate(element, phrases);
    });
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }
  apply();
  new MutationObserver(records => {
    if (records.some(record => {
      const node = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      return node && !node.closest('footer');
    })) schedule();
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', schedule, { passive: true });
})();
