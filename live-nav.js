/* 让 Framer 原生路由在离线环境下退化为整页跳转（保留原脚本动效） */
(function () {
  function routeOf(href) {
    if (!href) return null;
    var h = href;
    if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(h)) return null;
    var hash = '';
    var i = h.indexOf('#');
    if (i >= 0) { hash = h.slice(i); h = h.slice(0, i); }
    if (!h) return null;
    h = h.replace(/^\.\//, '').replace(/^\//, '').replace(/\/$/, '');
    var MAP = { 'work': '/work', 'studio': '/studio', 'feed': '/feed', 'contacts': '/contacts',
      'legal/terms-of-service': '/legal/terms-of-service', 'legal/privacy-policy': '/legal/privacy-policy',
      'privacy-policy': '/legal/privacy-policy', 'terms-of-service': '/legal/terms-of-service' };
    if (!h) return '/' + hash;
    if (MAP[h]) return MAP[h] + hash;
    if (/^(work|feed)\/[a-z0-9-]+$/.test(h)) return '/' + h + hash;
    if (/\.html$/.test(h)) return null; // 已经是本地页
    return null;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var target = routeOf(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    location.assign(target);
  }, true);
})();
