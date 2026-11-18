/* Keep the original practice list; enhance it with one reversible stack view. */
(() => {
  'use strict';
  const stack = [
    ['前端工程', 'React · TypeScript · Tailwind CSS'],
    ['交互与图形', 'DOM / SVG · WebGL2 · Oklab'],
    ['服务端开发', 'Python · Django · DRF · Node.js'],
    ['Agent 开发', 'Pi SDK · OpenClaw · MCP'],
    ['异步与调度', 'PostgreSQL Skip-Locked · Celery · Redis · 租约状态机'],
    ['数据与存储', 'PostgreSQL · SQLite (WAL/FTS5) · NumPy · S3 / OSS'],
    ['模型与实验', 'LoRA · SFT · 结构化评估'],
    ['部署与交付', 'Docker Compose · Nginx · Git'],
  ];
  let view = 'practice';
  let mounted;
  let pending = false;

  function select(next, announce = false) {
    if (!mounted) return;
    view = next;
    const isStack = next === 'stack';
    const { root, list, panel, title, lines, control, label, status, intro, mobileIntro } = mounted;
    root.dataset.homePracticeView = next;
    list.inert = isStack;
    list.setAttribute('aria-hidden', String(isStack));
    panel.inert = !isStack;
    panel.setAttribute('aria-hidden', String(!isStack));
    title.setAttribute('aria-hidden', String(!isStack));
    lines.forEach(line => line.setAttribute('aria-hidden', String(isStack)));
    control.setAttribute('aria-expanded', String(isStack));
    control.setAttribute('aria-label', isStack ? '向上切换，返回我的实践记录' : '向上切换，查看我的技术栈');
    label.textContent = isStack ? '我的实践' : '我的技术栈';
    mobileIntro.textContent = isStack ? '覆盖端侧图形渲染、全栈高可用架构、Agent 编排与轻量模型微调的端到端工具链。' : '核心工程项目、模型实验课题与当前演进状态。';
    intro?.setAttribute('aria-hidden', String(isStack));
    if (announce) status.textContent = isStack ? '已切换到我的技术栈，共八个方向。' : '已切换到我的实践记录。';
  }

  function mount() {
    pending = false;
    const root = document.getElementById('awards');
    const headline = root?.querySelector(':scope > [data-framer-name="Headline"]');
    const layout = headline?.querySelector('[data-framer-name="Headline Container"]');
    const stage = layout?.querySelector('[data-framer-name="Title Container"]');
    const list = root?.querySelector(':scope > [data-framer-name="List"]');
    const introLayout = layout?.querySelector('[data-framer-name="Text & Button Container"]');
    if (!root || !layout || !stage || !list) return;
    if (mounted?.root === root && mounted.list === list && mounted.stage === stage
      && mounted.introLayout === introLayout
      && (!introLayout || (mounted.intro?.isConnected && mounted.description?.isConnected))
      && [mounted.panel, mounted.control, mounted.title, mounted.mobileIntro, ...mounted.lines].every(node => node.isConnected)) return;

    root.querySelectorAll('[data-home-practice-owned]').forEach(node => node.remove());
    const lines = Array.from(stage.children);
    const example = stage.querySelector('h2');
    if (!example || !lines.length) return;
    stage.dataset.homePracticeHeadingStage = '';
    layout.dataset.homePracticeHeadingLayout = '';
    lines.forEach(line => { line.dataset.homePracticeNativeTitle = ''; });
    list.dataset.homePracticePanel = '';
    list.setAttribute('role', 'region');
    list.setAttribute('aria-label', '我的实践记录');

    const owned = (tag, className) => {
      const node = document.createElement(tag);
      node.className = className;
      node.dataset.homePracticeOwned = '';
      return node;
    };
    const title = owned('div', 'home-stack-title');
    title.id = 'home-tech-stack-heading';
    ['我的', '技术栈'].forEach(text => {
      const heading = document.createElement('h2');
      heading.className = example.className;
      heading.textContent = text;
      title.append(heading);
    });
    stage.append(title);

    const control = owned('button', 'home-practice-switch');
    control.type = 'button';
    control.setAttribute('aria-controls', 'home-tech-stack-panel');
    const label = document.createElement('span');
    control.append(label);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 20V4m-7 7 7-7 7 7');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.4');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    control.append(svg);
    stage.insertAdjacentElement('afterend', control);
    control.addEventListener('click', () => select(view === 'stack' ? 'practice' : 'stack', true));
    const mobileIntro = owned('p', 'home-practice-mobile-intro');
    control.insertAdjacentElement('afterend', mobileIntro);

    const intro = introLayout?.firstElementChild;
    let description;
    if (introLayout && intro) {
      introLayout.dataset.homePracticeIntroLayout = '';
      intro.dataset.homePracticeNativeIntro = '';
      description = owned('p', 'home-stack-intro');
      description.textContent = '覆盖端侧图形渲染、全栈高可用架构、Agent 编排与轻量模型微调的端到端工具链。';
      introLayout.prepend(description);
    }

    const panel = owned('section', 'home-stack-panel');
    panel.id = 'home-tech-stack-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', title.id);
    for (const [category, tools] of stack) {
      const row = document.createElement('article');
      row.className = 'home-stack-row';
      const heading = document.createElement('h3');
      heading.textContent = category;
      const content = document.createElement('p');
      content.textContent = tools;
      row.append(heading, content);
      panel.append(row);
    }
    root.append(panel);
    const status = owned('span', 'home-practice-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    root.append(status);
    mounted = { root, list, stage, panel, title, lines, control, label, status, intro, introLayout, description, mobileIntro };
    select(view);
    root.dataset.homePracticeReady = '';
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(mount);
  }
  mount();
  // Framer can replace responsive nodes during hydration or a breakpoint change.
  new MutationObserver(() => {
    if (!mounted || !mounted.panel.isConnected || !mounted.control.isConnected
      || !mounted.stage.isConnected || !mounted.mobileIntro.isConnected || !mounted.lines.every(node => node.isConnected)
      || (mounted.introLayout && (!mounted.introLayout.isConnected
        || !mounted.intro?.isConnected || !mounted.description?.isConnected))) schedule();
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', schedule, { passive: true });
})();
