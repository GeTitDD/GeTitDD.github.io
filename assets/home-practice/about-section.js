/* An independent homepage section, immediately before the practice directions. */
(() => {
  'use strict';

  // Defaults are registered in the existing content editor for live editing.
  const profile = {
    statement: '在这里，\n写下我的自我陈述。',
    description: '关于我的经历、思考，以及接下来想做的事。',
    photo: '/assets/uploads/home-about-portrait.webp',
    photoAlt: '个人照片',
  };
  let section;
  let pending = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function createSection(example) {
    const root = element('section', 'home-about');
    root.id = 'about';
    root.dataset.homeAboutOwned = '';
    root.setAttribute('aria-labelledby', 'home-about-heading');

    const heading = element('h2', `${example.className} home-about-heading`, '关于我');
    heading.id = 'home-about-heading';

    const copy = element('div', 'home-about-copy');
    copy.append(
      element('p', 'home-about-eyebrow', '自我陈述 · 待补充'),
      element('p', 'home-about-statement', profile.statement),
      element('p', 'home-about-description', profile.description),
    );

    const portrait = element('figure', 'home-about-portrait');
    const photo = element('div', 'home-about-photo');
    const placeholder = element('div', 'home-about-photo-placeholder');
    placeholder.setAttribute('role', 'img');
    placeholder.setAttribute('aria-label', '个人照片位置，待添加真实照片');
    const photoLabel = element('span', 'home-about-photo-label', '个人照片');
    const photoNote = element('span', 'home-about-photo-note', 'PORTRAIT / TO BE ADDED');
    photoLabel.setAttribute('aria-hidden', 'true');
    photoNote.setAttribute('aria-hidden', 'true');
    placeholder.append(photoLabel, photoNote);
    photo.append(placeholder);

    if (profile.photo) {
      const image = element('img', 'home-about-photo-image');
      image.alt = profile.photoAlt;
      image.dataset.cmsMediaKey = 'home-about-portrait';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('load', () => { image.style.visibility = 'visible'; placeholder.hidden = true; });
      image.addEventListener('error', () => { image.style.visibility = 'hidden'; placeholder.hidden = false; });
      image.src = profile.photo;
      photo.append(image);
    }
    const caption = element('figcaption', 'home-about-caption');
    caption.append(element('p', 'home-about-caption-text', '个人照片'));
    portrait.append(photo, caption);

    const next = element('a', 'home-about-next');
    next.href = '#awards';
    next.setAttribute('aria-label', '继续查看我的实践与技术栈');
    next.append(element('span', '', '我的实践与技术栈'));
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('viewBox', '0 0 24 24');
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 4v16m-7-7 7 7 7-7');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.4');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    arrow.append(path);
    next.append(arrow);

    root.append(heading, copy, portrait, next);
    root.dataset.homeAboutReady = '';
    return root;
  }

  function intact(focus) {
    return section?.isConnected && section.nextElementSibling === focus
      && section.querySelector('#home-about-heading')
      && section.querySelector('.home-about-photo');
  }

  function mount() {
    pending = false;
    const awards = document.getElementById('awards');
    const focus = document.querySelector('[data-framer-name="In Numbers"]');
    const example = awards?.querySelector('h2');
    if (!focus || !example || intact(focus)) return;
    if (section?.isConnected && section.querySelector('#home-about-heading') && section.querySelector('.home-about-photo')) {
      focus.before(section);
      return;
    }
    // Framer may rebuild its responsive tree; only replace our own section.
    document.querySelectorAll('[data-home-about-owned]').forEach(node => node.remove());
    section = createSection(example);
    focus.before(section);
  }

  mount();
  new MutationObserver(() => {
    if (pending || intact(document.querySelector('[data-framer-name="In Numbers"]'))) return;
    pending = true;
    requestAnimationFrame(mount);
  }).observe(document.body, { childList: true, subtree: true });
})();
