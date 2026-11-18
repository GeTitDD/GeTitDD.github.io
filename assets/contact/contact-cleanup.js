/* Keep removed template fields out of native validation and form payloads. */
(() => {
  if (!document.body.hasAttribute('data-contact-page')) return;


  function setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function syncChineseContact() {
    const labels = {Name: ['姓名（必填）', '你的姓名'], Email: ['邮箱（必填）', '你的邮箱'], Message: ['留言内容（必填）', '留言内容']};
    document.querySelectorAll('form.framer-XWLdX').forEach(form => {
      Object.entries(labels).forEach(([name, [placeholder, label]]) => {
        const field = form.querySelector(`[name="${name}"]`);
        if (!field) return;
        setAttribute(field, 'placeholder', placeholder);
        setAttribute(field, 'aria-label', label);
      });
    });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('script,style,noscript,textarea,pre,code')) continue;
      const text = node.nodeValue.trim();
      const replacement = /^(menu)$/i.test(text) ? '菜单' : /^(close)$/i.test(text) ? '关闭'
        : /^SHANGHAI, CN$/i.test(text) ? '上海，中国'
        : /^(?:Huang@?\.?|M[oö]bius(?:®)?\.?)?\s*All rights reserved\.$/i.test(text) ? '版权所有。' : null;
      if (replacement && node.nodeValue !== replacement) node.nodeValue = replacement;
    }
    const container = document.querySelector('.framer-xtdzzo');
    if (!container || document.getElementById('contact-direct-details')) return;
    let details;
    try { details = JSON.parse(document.getElementById('cms-page-seed')?.textContent || '{}').contactDetails; } catch { return; }
    if (!details?.email || !details?.wechat) return;
    const list = document.createElement('dl');
    list.id = 'contact-direct-details';
    list.className = 'contact-direct';
    list.setAttribute('aria-label', '直接联系');
    [['邮箱', details.email], ['微信', details.wechat]].forEach(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      const content = document.createElement(label === '邮箱' ? 'a' : 'span');
      content.textContent = value;
      if (label === '邮箱') content.href = 'mailto:' + value;
      else content.setAttribute('data-contact-wechat', '');
      description.append(content);
      row.append(term, description);
      list.append(row);
    });
    container.append(list);
  }

  function cleanContactControls() {
    syncChineseContact();
    document.querySelectorAll('form.framer-XWLdX').forEach(form => {
      form.querySelectorAll('input[name="Company Name"], select[name="Budget"], select[name="Timeframe"]').forEach(field => {
        if (field.required) field.required = false;
        if (!field.disabled) field.disabled = true;
      });
    });
    document.querySelectorAll('footer form[data-framer-name="Newsletter Form"] input, footer form[data-framer-name="Newsletter Form"] button').forEach(field => {
      if (field.required) field.required = false;
      if (!field.disabled) field.disabled = true;
    });
  }

  cleanContactControls();
  // Responsive hydration can replace controls. Reapply without touching values.
  new MutationObserver(cleanContactControls).observe(document.body, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['required', 'disabled', 'placeholder']
  });
})();
