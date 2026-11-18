/* Page-only navigation. The case never calls models or runs project code. */
(() => {
  const button = document.querySelector('.wr-menu');
  const menu = document.getElementById('wr-mobile-nav');
  if (!button || !menu) return;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    button.querySelector('span').textContent = open ? '−' : '＋';
  });
  menu.addEventListener('click', event => {
    if (!event.target.closest('a')) return;
    button.setAttribute('aria-expanded', 'false');
    button.querySelector('span').textContent = '＋';
    menu.hidden = true;
  });
})();
