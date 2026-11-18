/* Static publishing keeps full-page navigation and uses the visitor's mail app. */
(() => {
  'use strict';
  const configNode = document.getElementById('portfolio-static-routes');
  const routes = configNode ? JSON.parse(configNode.textContent) : {};
  const destinationFor = pathname => routes[pathname] || routes[pathname.replace(/\/$/, '')];

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || link.target === '_blank') return;
    const raw = link.getAttribute('href');
    if (!raw || raw.startsWith('#')) return;
    const url = new URL(link.href, document.baseURI);
    if (url.origin !== location.origin) return;
    const destination = destinationFor(url.pathname);
    if (!destination) return;
    const next = new URL(destination, location.origin);
    if (url.search) next.search = url.search;
    if (url.hash) next.hash = url.hash;
    if (next.pathname === location.pathname && next.hash && next.search === location.search) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(next.href);
  }, true);

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('form.framer-XWLdX')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    const seed = document.getElementById('cms-page-seed');
    let email;
    try { email = JSON.parse(seed?.textContent || '{}').contactDetails?.email; } catch { return; }
    if (!email) return;
    const data = new FormData(form);
    const name = String(data.get('Name') || '').trim();
    const sender = String(data.get('Email') || '').trim();
    const message = String(data.get('Message') || '').trim();
    const subject = encodeURIComponent('来自个人网站的联系 · ' + name);
    const body = encodeURIComponent('姓名：' + name + '\n邮箱：' + sender + '\n\n' + message);
    location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
  }, true);
})();
