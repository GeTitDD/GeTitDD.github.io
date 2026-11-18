/* Complete articles keep their original data controls; shared behavior stays small. */
(() => {
  'use strict';
  const menu = document.querySelector('.wr-menu');
  const mobile = document.getElementById('wr-mobile-nav');
  const header = document.querySelector('.core-site-header');
  const footer = document.querySelector('.core-site-footer');
  const count = document.querySelector('.core-article-count');
  if (header && footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      header.classList.toggle('is-at-footer', entries[0].isIntersecting);
      count?.classList.toggle('is-at-footer', entries[0].isIntersecting);
    }).observe(footer);
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile && !mobile.hidden) {
      mobile.hidden = true;
      menu.setAttribute('aria-expanded', 'false');
      menu.focus();
    }
  });
  mobile?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    mobile.hidden = true;
    menu.setAttribute('aria-expanded', 'false');
  }));
  // The original charts and screenshots remain in the same document, with local links.
  document.querySelectorAll('a[href$="-full"]').forEach(link => {
    link.href = link.getAttribute('href').replace(/-full$/, '-detail');
  });
})();
