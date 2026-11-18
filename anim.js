/* Möbius 镜像交互层 —— 近似还原原站 Framer Motion 效果
   1) 入场 fade-up（原站 data-framer-appear-id）
   2) 滚动视差（原站 will-change: transform 图层）
   3) Work 页拖拽平移画布（原站 scroll / drag）
   4) 实时时钟（原站 BERLIN, DE 02:29 PM）
   5) 导航 hover 下划线（原站 JS 变体）
   注：均为等效近似，非原站代码。 */
(function () {
  if (window.__mobiusAnim) return;
  window.__mobiusAnim = true;
  // 说明：镜像默认开启动效（即使系统开了“减少动态效果”），
  // 方便对比原站；右下角 MOTION 按钮可随时关闭。
  var reduce = false;

  // ---------- 1. 入场动画 ----------
  function appear() {
    var els = document.querySelectorAll('[data-framer-appear-id]');
    if (!els.length) return;
    var style = document.createElement('style');
    style.textContent = '@keyframes mb-appear{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}' +
      '[data-framer-appear-id]{animation:mb-appear .7s cubic-bezier(.22,.61,.36,1) both}' +
      '@media (prefers-reduced-motion: reduce){[data-framer-appear-id]{animation:none}}';
    document.head.appendChild(style);
    els.forEach(function (el, i) {
      el.style.animationDelay = Math.min(i * 60, 480) + 'ms';
    });
  }

  // ---------- 2. 滚动视差 ----------
  function parallax() {
    if (reduce) return;
    var docH = document.body.scrollHeight;
    if (docH < window.innerHeight * 1.6) return;
    // 取视差目标：页面主视觉里的图片（保守：只动 img，不动布局容器）
    var imgs = [].slice.call(document.querySelectorAll('main img, #main img, img')).filter(function (im) {
      var r = im.getBoundingClientRect();
      return r.width > 240 && r.height > 160;
    }).slice(0, 14);
    if (!imgs.length) return;
    var base = imgs.map(function (im) { return { el: im, y: 0 }; });
    var ticking = false;
    function frame() {
      var sy = window.scrollY || 0;
      base.forEach(function (o, i) {
        var r = o.el.getBoundingClientRect();
        // 元素越靠视口中部，偏移越小；系数 0.045 为轻微视差
        var center = r.top + r.height / 2 - window.innerHeight / 2;
        var target = -center * 0.045;
        target = Math.max(-70, Math.min(70, target));
        o.y += (target - o.y) * 0.18;
        o.el.style.transform = 'translate3d(0,' + o.y.toFixed(2) + 'px,0)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    frame();
  }

  // ---------- 3. Work 页拖拽平移 ----------
  function dragPan() {
    var scrollable = document.body.scrollHeight > window.innerHeight * 1.3;
    if (scrollable) return; // 只有固定画布页（Work）启用
    var allImgs = [].slice.call(document.querySelectorAll('img'));
    if (allImgs.length < 25) return;

    // 原站结构：[data-framer-name="Infinite Canvas Container"] 内是散落项目图
    var canvas = document.querySelector('[data-framer-name="Infinite Canvas Container"]');
    if (!canvas) {
      // 兜底：包含 ≥85% 图片且不含导航文案的容器
      var total = allImgs.length;
      var cands = [].slice.call(document.querySelectorAll('div')).filter(function (d) {
        var r = d.getBoundingClientRect();
        return r.width > window.innerWidth * 0.8 && d.querySelectorAll('img').length >= total * 0.85 && !/CONTACT/.test(d.textContent || '');
      });
      cands.sort(function (a, b) { var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.width * ra.height - rb.width * rb.height; });
      canvas = cands[0];
    }
    if (!canvas) return;

    var tx = 0, ty = 0, sx = 0, sy = 0, vx = 0, vy = 0, dragging = false, moved = false;
    canvas.style.willChange = 'transform';
    var surface = document.getElementById('main') || document.body;
    surface.style.cursor = 'grab';

    function apply() {
      canvas.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
    }
    function inertia() {
      if (Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05) return;
      tx += vx; ty += vy; vx *= 0.94; vy *= 0.94;
      tx = Math.max(-360, Math.min(360, tx));
      ty = Math.max(-260, Math.min(260, ty));
      apply();
      requestAnimationFrame(inertia);
    }
    surface.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a')) return;
      dragging = true; moved = false; sx = e.clientX - tx; sy = e.clientY - ty;
      vx = vy = 0; surface.style.cursor = 'grabbing';
    });
    surface.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var nx = e.clientX - sx, ny = e.clientY - sy;
      vx = nx - tx; vy = ny - ty;
      tx = Math.max(-360, Math.min(360, nx));
      ty = Math.max(-260, Math.min(260, ny));
      moved = true; apply();
    });
    function end() {
      if (!dragging) return;
      dragging = false; surface.style.cursor = 'grab';
      if (moved) requestAnimationFrame(inertia);
    }
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
    surface.addEventListener('pointerleave', end);
  }

  // ---------- 4. 实时时钟 ----------
  function clock() {
    var re = /\d{1,2}:\d{2}\s*[AP]M/;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var node, timeNodes = [];
    while ((node = walker.nextNode())) {
      if (re.test(node.nodeValue || '')) timeNodes.push(node);
      if (timeNodes.length >= 4) break;
    }
    timeNodes.forEach(function (n) {
      var el = n.parentElement;
      for (var i = 0; i < 4 && el; i++) {
        if (/, [A-Z]{2}/.test(el.textContent || '')) break;
        el = el.parentElement;
      }
      if (!el) return;
      var city = ((el.textContent || '').match(/([A-Z][A-Za-z]+),\s*[A-Z]{2}/) || [])[1] || 'Berlin';
      var tz = /BERLIN/i.test(city) ? 'Europe/Berlin' : (/NEW\s*YORK/i.test(city) ? 'America/New_York' : 'Europe/Berlin');
      function tick() {
        var s = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz }).format(new Date());
        n.nodeValue = n.nodeValue.replace(re, s);
      }
      tick();
      setInterval(tick, 30000);
    });
  }

  // ---------- 5. hover ----------
  function hover() {
    var style = document.createElement('style');
    style.textContent = 'a{transition:opacity .25s ease}a:hover{opacity:.55}' +
      'a[data-nav]:hover{opacity:1;box-shadow:inset 0 -1.5px 0 currentColor}';
    document.head.appendChild(style);
  }

  // ---------- 6. Feed 三列跑马灯（原站实测：-50 / +75 / -25 px/s） ----------
  function marquee() {
    if (reduce) return;
    var cols = [];
    [].slice.call(document.querySelectorAll('div')).forEach(function (d) {
      var r = d.getBoundingClientRect();
      if (r.height < 1800 || r.width < 300 || r.width > 700) return;
      if (d.children.length < 2) return;
      var h0 = d.children[0].getBoundingClientRect().height;
      var h1 = d.children[1].getBoundingClientRect().height;
      if (Math.abs(h0 - h1) < 6 && h0 > 800 && h0 < r.height) {
        cols.push({ el: d, half: h0, x: Math.round(r.x) });
      }
    });
    // 去重（嵌套容器只留一层）
    cols = cols.filter(function (c, i) { return !cols.some(function (o, j) { return j !== i && o.el.contains(c.el); }); });
    if (!cols.length) return;
    cols.sort(function (a, b) { return a.x - b.x; });
    var speeds = [-50, 75, -25, 50, -75, 25];
    cols.forEach(function (c, i) {
      var speed = speeds[i % speeds.length];
      var y = 0;
      var last = performance.now();
      function tick(now) {
        var dt = Math.min(64, now - last) / 1000;
        last = now;
        y += speed * dt;
        // 无缝循环：向下滚动时从 -half 开始
        if (y <= -c.half) y += c.half;
        if (y >= 0) y -= c.half;
        c.el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
        c.el.style.willChange = 'transform';
        requestAnimationFrame(tick);
      }
      // 初始错开相位，避免三列同步
      y = -c.half * (0.15 + i * 0.27);
      requestAnimationFrame(tick);
    });
  }

  // ---------- 7. 自定义光标徽标（原站 Play / Drag Arrows，按 data-framer-cursor 切换图标） ----------
  function cursorBadge() {
    if (reduce) return;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
    var ICONS = {
      arrow: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M12 5l7 7-7 7"/></svg>',
      drag: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9l-4 3 4 3M16 9l4 3-4 3M12 5v14"/></svg>',
      play: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M8 5l11 7-11 7z"/></svg>'
    };
    // data-framer-cursor id → 图标（实测取样）
    var MAP = { '97rtuy': 'arrow', '15fzu3i': 'arrow', 'ouofdt': 'drag', '1hxs4ni': 'drag' };

    var badge = document.createElement('div');
    badge.id = 'mb-cursor';
    badge.innerHTML = ICONS.arrow;
    badge.style.cssText = 'position:fixed;left:0;top:0;width:64px;height:64px;border-radius:50%;background:#111;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:99999;opacity:0;transform:translate3d(-100px,-100px,0) scale(.4);transition:opacity .18s ease,transform .18s ease;will-change:transform';
    document.body.appendChild(badge);

    var tx = -100, ty = -100, cx = -100, cy = -100, visible = false, raf = null, curIcon = 'arrow';
    function loop() {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      badge.style.transform = 'translate3d(' + (cx - 32) + 'px,' + (cy - 32) + 'px,0) scale(' + (visible ? 1 : 0.4) + ')';
      if (Math.abs(tx - cx) > 0.2 || Math.abs(ty - cy) > 0.2 || visible) raf = requestAnimationFrame(loop);
      else raf = null;
    }
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      var host = e.target.closest('[data-framer-cursor]');
      // 原站徽标只出现在“图片卡片”上，文字链接不触发
      var want = !!host && (!!host.querySelector('img') || /^(97rtuy|ouofdt|1hxs4ni)$/.test(host.getAttribute('data-framer-cursor') || ''));
      if (want) {
        var id = host.getAttribute('data-framer-cursor');
        var icon = MAP[id] || 'arrow';
        if (host.querySelectorAll('img').length > 20) icon = 'drag';
        if (icon !== curIcon) { curIcon = icon; badge.innerHTML = ICONS[icon] || ICONS.arrow; }
      }
      if (want !== visible) {
        visible = want;
        badge.style.opacity = want ? '1' : '0';
      }
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { visible = false; badge.style.opacity = '0'; });
  }

  // ---------- 8. 右下角状态指示（便于确认动效是否生效） ----------
  function statusChip() {
    var chip = document.createElement('div');
    chip.id = 'mb-motion';
    chip.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:99998;display:flex;align-items:center;gap:7px;background:rgba(17,17,17,.9);color:#fff;font:11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.08em;padding:8px 11px;border-radius:999px;cursor:pointer;opacity:.86;user-select:none';
    chip.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#39d98a;display:inline-block"></span><span>MOTION ON</span>';
    document.body.appendChild(chip);

    var on = true;
    chip.addEventListener('click', function () {
      on = !on;
      document.documentElement.classList.toggle('mb-motion-off', !on);
      chip.children[0].style.background = on ? '#39d98a' : '#777';
      chip.children[1].textContent = on ? 'MOTION ON' : 'MOTION OFF';
      // 关闭：停止 CSS 动画
      var st = document.getElementById('mb-motion-off-style');
      if (!on) {
        if (!st) {
          st = document.createElement('style');
          st.id = 'mb-motion-off-style';
          st.textContent = '*{animation:none!important}';
          document.head.appendChild(st);
        }
      } else if (st) { st.remove(); }
    });
  }

  // ---------- 9. Hero 照片入场：1.16x → 1x（原站实测宽度 647→556） ----------
  function heroZoom() {
    if (reduce) return;
    var imgs = [].slice.call(document.querySelectorAll('img')).filter(function (im) {
      var r = im.getBoundingClientRect();
      return r.width > 250 && r.height > 200 && (r.top + window.scrollY) < window.innerHeight * 1.2;
    }).slice(0, 8);
    if (imgs.length < 2) return;
    imgs.forEach(function (im, i) {
      im.style.transformOrigin = '50% 50%';
      im.style.transition = 'none';
      im.style.transform = 'scale(1.16)';
      im.style.opacity = '0';
      setTimeout(function () {
        im.style.transition = 'transform .75s cubic-bezier(.22,.61,.36,1), opacity .5s ease-out';
        im.style.transform = 'scale(1)';
        im.style.opacity = '1';
      }, 60 + i * 70);
    });
  }

  // ---------- 10. 文字动能排版：随滚动从偏移归位（原站实测偏移） ----------
  function wordKinetic() {
    if (reduce) return;
    // 原站实测初值（px）：负 dx 在左、正 dx 在右
    var OFFSETS = {
      'turning': [899, -353],
      'imagination': [338, -564],
      'beauty.': [96, -441],
      'brings': [116, 98]
    };
    var items = [];
    [].slice.call(document.querySelectorAll('h1,h2,h3,p,span,div')).forEach(function (el) {
      if (el.children.length) return;
      var t = (el.textContent || '').trim();
      var off = OFFSETS[t];
      if (!off) return;
      var r = el.getBoundingClientRect();
      if (r.width < 40) return;
      items.push({ el: el, ox: off[0], oy: off[1], cur: [off[0], off[1]] });
    });
    if (!items.length) return;

    var ticking = false;
    function frame() {
      var vh = window.innerHeight;
      var active = false;
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        // 原站实测：视口 0.75 处开始，跨越 0.5 视口高度完成收敛
        var p = (vh * 0.75 - r.top) / (vh * 0.5);
        p = Math.max(0, Math.min(1, p));
        var e = 1 - Math.pow(1 - p, 3);
        var tx = it.ox * (1 - e);
        var ty = it.oy * (1 - e);
        var dx = tx - it.cur[0], dy = ty - it.cur[1];
        if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) active = true;
        it.cur[0] += dx * 0.28;
        it.cur[1] += dy * 0.28;
        it.el.style.transform = 'translate3d(' + it.cur[0].toFixed(1) + 'px,' + it.cur[1].toFixed(1) + 'px,0)';
        it.el.style.willChange = 'transform';
      });
      ticking = false;
      if (active) requestAnimationFrame(frame);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    frame();
  }

  function init() {
    hover();
    setTimeout(function () {
      try { clock(); } catch (e) {}
      try { appear(); } catch (e) {}
      try { marquee(); } catch (e) {}
      try { cursorBadge(); } catch (e) {}
      try { parallax(); } catch (e) {}
      try { dragPan(); } catch (e) {}
      try { statusChip(); } catch (e) {}
      try { heroZoom(); } catch (e) {}
      try { wordKinetic(); } catch (e) {}
    }, 120);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
