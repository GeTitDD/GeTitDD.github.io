/* Keep the first HTML title, browser icons and hydrated metadata on one identity. */
(() => {
  'use strict';
  const seed = document.getElementById('site-identity-data');
  if (!seed) return;
  const identity = JSON.parse(seed.textContent);
  const absolute = value => new URL(value, location.origin).href;
  const presentation = document.createElement('style');
  presentation.id = 'portfolio-brand-presentation';
  presentation.textContent = '#framer-badge-container,a[aria-label="Made in Framer"],a[href="https://www.framer.com"],a[href="https://framer.com/"],form[data-framer-name="Newsletter Form"]{display:none!important}footer svg[data-portfolio-wordmark]{overflow:visible!important}';
  document.head.append(presentation);
  function meta(name, value, property = false) {
    const attribute = property ? 'property' : 'name';
    let tag = document.head.querySelector(`meta[${attribute}="${name}"]`);
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, name); document.head.append(tag); }
    if (tag.content !== value) tag.content = value;
  }
  function sync() {
    if (document.title !== identity.title) document.title = identity.title;
    meta('description', identity.description);
    meta('og:title', identity.title, true);
    meta('og:description', identity.description, true);
    meta('og:site_name', identity.brand, true);
    meta('og:url', absolute(identity.route), true);
    meta('og:image', absolute(identity.socialImage), true);
    meta('twitter:title', identity.title);
    meta('twitter:description', identity.description);
    meta('twitter:image', absolute(identity.socialImage));
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href !== absolute(identity.route)) canonical.href = absolute(identity.route);
    const expectedIcon = absolute(identity.favicon);
    let primaryIcon = document.head.querySelector('link[data-portfolio-favicon]');
    if (!primaryIcon) {
      primaryIcon = document.createElement('link');
      primaryIcon.setAttribute('data-portfolio-favicon', '');
      document.head.append(primaryIcon);
    }
    const icons = [...document.head.querySelectorAll('link[rel~="icon"],link[data-portfolio-favicon]')];
    icons.forEach(link => {
      if (link.rel !== 'icon') link.rel = 'icon';
      if (link.type !== 'image/x-icon') link.type = 'image/x-icon';
      if (link.href !== expectedIcon) link.href = expectedIcon;
      if (link.hasAttribute('media')) link.removeAttribute('media');
    });
    // A template can insert another favicon during hydration. Keep the owned
    // icon last among favicon candidates so browser selection stays explicit.
    if (icons.at(-1) !== primaryIcon) document.head.append(primaryIcon);
    document.head.querySelectorAll('link[rel="mask-icon"]').forEach(link => {
      if (link.href !== absolute(identity.maskIcon)) link.href = absolute(identity.maskIcon);
    });
    document.head.querySelectorAll('link[rel^="apple-touch-icon"]').forEach(link => {
      if (link.href !== absolute(identity.touchIcon)) link.href = absolute(identity.touchIcon);
    });
  }
  window.PortfolioIdentity = {
    get title() { return identity.title; },
    get description() { return identity.description; },
    get socialImage() { return absolute(identity.socialImage); },
    get favicon() { return absolute(identity.favicon); },
    update(values) {
      if (values.title) identity.title = values.title;
      if (values.description) identity.description = values.description;
      sync();
    },
  };
  sync();
  new MutationObserver(sync).observe(document.head, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ['content', 'href', 'rel', 'type', 'media'],
  });
})();
