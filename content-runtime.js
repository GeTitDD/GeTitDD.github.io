/* Stable element identities allow repeated edits, undo and live updates. */
(function () {
  // Keep the shared template navigation focused on Work and Contact.
  // CSS also covers the server markup while Framer hydrates its menu.
  const navigationStyle = document.createElement('style');
  navigationStyle.id = 'portfolio-primary-navigation';
  navigationStyle.textContent = `
    nav.framer-cSZEg :is(a.framer-1gci7t5,a.framer-1f6tv5q),
    .framer-juKxq [data-framer-name="Mobile Menu"] :is(a[data-framer-name="Menu Item B"],a[data-framer-name="Menu Item C"]),
    .wr-header nav :is(a[href="/studio"],a[href="/feed"]),
    #wr-mobile-nav :is(a[href="/studio"],a[href="/feed"]) { display:none!important; }
    @media(min-width:810px) {
      nav.framer-cSZEg [data-framer-name="Desktop Menu"] { justify-content:flex-end!important; gap:64px!important; }
      .wr-header nav { justify-content:flex-end!important; gap:64px!important; }
    }
  `;
  document.head.appendChild(navigationStyle);
  const STATIC_MODE = document.documentElement.dataset.portfolioStatic === 'true';
  const SEL = 'p,h1,h2,h3,h4,h5,h6,a,li,blockquote,figcaption,button,label,span[data-framer-component-type],div[data-framer-component-type]';
  const originals = new WeakMap(), mediaOriginals = new WeakMap();
  let data, entries = [], timer, lastOutline = '';
  function hash(s) { let h = 5381; for (let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))>>>0; return h.toString(16); }
  function routeKey() {
    if(STATIC_MODE && document.documentElement.dataset.portfolioRoute)return document.documentElement.dataset.portfolioRoute;
    const p=location.pathname;
    if (p==='/' || /\/live\/(?:index|home(?:\.raw)?)\.html$/.test(p)) return '/';
    const m=p.match(/\/live\/(.+)\.html$/);
    if(m) return '/'+m[1].replace(/^legal-(terms|privacy)$/, (_,v)=>'legal/'+(v==='terms'?'terms-of-service':'privacy-policy'));
    return p.replace(/\/$/,'') || '/';
  }
  function visible(el) { const r=el.getBoundingClientRect(); return r.width>=8 && r.height>=6; }
  function section(el) {
    const root=el.closest('[data-framer-name="Main Container"]');
    if(root) { let n=el; while(n.parentElement && n.parentElement!==root) n=n.parentElement; return n; }
    return el.closest('section,header,footer,nav') || el.parentElement;
  }
  const previewMotion=new Map();
  const wordOffsets=[[-950,130],[116,98],[654,710],[407,434],[252,-164],[-191,186],[899,-353],[338,-564],[8,687],[-422,-744],[-793,113],[-568,432],[520,169],[96,-441]];
  function updatePreviewMotion() {
    previewMotion.forEach((items,el)=>{
      if(!el.isConnected){previewMotion.delete(el);return;}
      const progress=Math.max(0,Math.min(1,(innerHeight-el.getBoundingClientRect().top)/(innerHeight/2)));
      items.forEach((item,index)=>{const offset=wordOffsets[index%wordOffsets.length];item.node.style.transform=`translate(${offset[0]*(1-progress)}px, ${offset[1]*(1-progress)}px)`;});
    });
  }
  function captureText(el, text) {
    const spans=Array.from(el.children);
    const motion=spans.length>1 && spans.every(node=>node.tagName==='SPAN' && node.style.transform);
    const original={text,nodes:Array.from(el.childNodes),motion:motion?spans.map(node=>({node,text:node.textContent,display:node.style.display})):null};
    // Keep nested font styles, responsive classes and animation wrappers.
    // A plain text replacement would discard the typography on those nodes.
    if (!motion && el.childNodes.length) {
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      original.slots=[];
      let node;
      while((node=walker.nextNode())) {
        if(!node.nodeValue.trim() || node.parentElement.closest('svg,script,style'))continue;
        const wrapper=node.parentElement;
        const hideable=wrapper.tagName==='SPAN' && wrapper.childNodes.length===1;
        original.slots.push({node,text:node.nodeValue,wrapper:hideable?wrapper:null,display:wrapper.style.display});
      }
    }
    if(parent!==window && original.motion)previewMotion.set(el,original.motion);
    return original;
  }
  function setNodeText(node, value) {
    if(node.childNodes.length===1 && node.firstChild.nodeType===Node.TEXT_NODE)node.firstChild.nodeValue=value;
    else if(!node.childNodes.length && value)node.appendChild(document.createTextNode(value));
  }
  function cardLabel(el, page) {
    if (!el.matches('h1,h2,h3,h4,h5,h6')) return;
    const link=el.closest('a[href]');
    if (!link?.querySelector('img')) return;
    const url=new URL(link.href,location.href);
    if (url.origin!==location.origin) return;
    const key=url.pathname.replace(/^\/live\//,'/').replace(/\.html$/,'');
    const target=(page.projectRoutes?.[key] || key).split(/[?#]/)[0];
    const label=page.projectLabels?.[target] || page.projectLabels?.[key];
    return label?.includes('\n') ? label : undefined;
  }
  const labelCanvas=document.createElement('canvas');
  function fitCardLabel(el, original, lines) {
    const width=el.clientWidth;
    if (!width) return;
    const key=[lines.join('\n'),innerWidth,width,document.fonts?.status].join('|');
    if (original.cardLayout===key) return;
    original.cardLayout=key;
    // Two lines need a little more breathing room than the native single name.
    // Keep its responsive sizing, then reduce further when a long line needs it.
    if (!Object.hasOwn(original,'cardFontSize')) {
      // Infinite-canvas tiles are cloned by the template. Carry their native
      // inline size so a clone never shrinks an already fitted heading again.
      original.cardFontSize=el.hasAttribute('data-cms-card-native-font-size')
        ? el.dataset.cmsCardNativeFontSize : el.style.fontSize;
      el.dataset.cmsCardNativeFontSize=original.cardFontSize;
    }
    el.style.fontSize=original.cardFontSize;
    const style=getComputedStyle(el.querySelector('strong') || el);
    const canvas=labelCanvas.getContext('2d');
    canvas.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const textWidth=Math.max(...lines.map(line=>canvas.measureText(line).width));
    const size=parseFloat(style.fontSize)*Math.min(5/6,width/textWidth*.97);
    el.style.fontSize=size+'px';
  }
  function updateText(el, original, value, restore, isCardLabel=false) {
    // Hydration can replace text/word nodes while retaining the parent element.
    // Rebind those slots before writing, rather than editing detached old nodes.
    const bound = original.motion || original.slots;
    if (bound?.some(item => !el.contains(item.node))) {
      const fresh = captureText(el, original.text);
      for (const kind of ['motion', 'slots']) {
        if (fresh[kind]?.length === original[kind]?.length) fresh[kind]?.forEach((item, index) => {
          item.text = original[kind][index].text;
          item.display = original[kind][index].display;
        });
      }
      fresh.changed = original.changed;
      Object.assign(original, fresh);
      if (!fresh.motion) delete original.motion;
      if (!fresh.slots) delete original.slots;
    }
    if (restore) {
      if (!original.changed) return;
      if (original.motion) original.motion.forEach(item=>{setNodeText(item.node,item.text);item.node.style.display=item.display;});
      else if(original.slots?.length) original.slots.forEach(item=>{
        if(item.node.nodeValue!==item.text)item.node.nodeValue=item.text;
        if(item.wrapper)item.wrapper.style.display=item.display;
      });
      else el.replaceChildren(...original.nodes);
      original.changed=false;
      return;
    }
    if (isCardLabel) {
      const lines=value.split('\n');
      el.dataset.cmsCardLabel='true';
      el.style.whiteSpace='pre-line';
      // Topic covers are pale; use their existing dark ink for readable labels.
      if (value.startsWith('子专题：')) el.style.setProperty('--framer-text-color','#263631');
      // Keep Framer's character nodes and transforms, using its first two
      // animated slots as complete lines instead of rebuilding the heading.
      if (original.slots?.length>=lines.length && original.slots.slice(0,lines.length).every(item=>item.wrapper)) {
        original.slots.forEach((item,index)=>{
          const text=lines[index] || '';
          if (item.node.nodeValue!==text) item.node.nodeValue=text;
          if (item.wrapper) item.wrapper.style.display=index<lines.length?'block':'none';
        });
      } else if (original.slots?.length===1) {
        // The mobile list uses a single bold text node below each image.
        if (original.slots[0].node.nodeValue!==value) original.slots[0].node.nodeValue=value;
      } else if (el.textContent!==value) el.textContent=value;
      original.changed=true;
      fitCardLabel(el,original,lines);
      return;
    }
    if (el.textContent===value) return;
    if (original.motion) {
      // Keep the elements owned by Framer Motion, including their scroll bindings.
      // Segment Chinese into words as well as handling space-separated languages.
      const units=typeof Intl.Segmenter==='function'
        ? Array.from(new Intl.Segmenter('zh',{granularity:'word'}).segment(value),part=>part.segment)
        : Array.from(value);
      const count=Math.min(units.length,original.motion.length);
      original.motion.forEach((item,index)=>{
        const from=Math.floor(index*units.length/(count||1));
        const to=Math.floor((index+1)*units.length/(count||1));
        const text=index<count?units.slice(from,to).join(''):'';
        if(item.node.textContent!==text)setNodeText(item.node,text);
        item.node.style.display=index<count?item.display:'none';
      });
    } else if (original.slots?.length) {
      const distribute=(slots,text)=>{
        const units=typeof Intl.Segmenter==='function'
          ? Array.from(new Intl.Segmenter('zh',{granularity:'word'}).segment(text),part=>part.segment)
          : Array.from(text);
        const count=Math.min(units.length,slots.length);
        slots.forEach((item,index)=>{
          const from=Math.floor(index*units.length/(count||1));
          const to=Math.floor((index+1)*units.length/(count||1));
          const text=index<count?units.slice(from,to).join(''):'';
          if(item.node.nodeValue!==text)item.node.nodeValue=text;
          if(item.wrapper)item.wrapper.style.display=index<count?item.display:'none';
        });
      };
      // Keep each homepage manifesto paragraph in its existing animation group.
      const paragraphs=value.split(/\n\s*\n/);
      const groups=routeKey()==='/' && el.closest('[data-framer-name="Scramble"]')
        && paragraphs.length>1 && el.children.length===paragraphs.length
        ? Array.from(el.children).map(group=>original.slots.filter(item=>group.contains(item.node)))
        : null;
      if(groups?.every(slots=>slots.length))groups.forEach((slots,index)=>distribute(slots,paragraphs[index]));
      else distribute(original.slots,value);
    } else el.textContent=value;
    original.changed=true;
  }
  function layoutIntro() {
    const links=Array.from(document.querySelectorAll('a[href]'));
    document.querySelectorAll('[data-framer-name="Intro"] p').forEach(paragraph=>{
      const box=paragraph.getBoundingClientRect();
      if(box.width<8 || box.height<6)return;
      const lineHeight=parseFloat(getComputedStyle(paragraph).lineHeight)||32;
      const name=links.find(link=>{
        const rect=link.getBoundingClientRect();
        const href=new URL(link.href,location.href);
        return href.origin===location.origin && ['/', '/live/index.html'].includes(href.pathname)
          && rect.width>0 && rect.width<box.width && Math.abs(rect.left-box.left)<4
          && Math.abs(rect.top-box.top)<lineHeight/2;
      });
      if(!name)return;
      const offset=Math.ceil(name.getBoundingClientRect().right-box.left+12);
      const separateLine=offset>box.width*0.6;
      const first=Array.from(paragraph.querySelectorAll('span')).find(node=>!node.children.length && node.textContent.trim());
      paragraph.style.paddingTop=separateLine?lineHeight+'px':'0px';
      if(first)first.style.marginLeft=separateLine?'0px':offset+'px';
      else {
        paragraph.style.display='block';
        paragraph.style.textIndent=separateLine?'0px':offset+'px';
      }
    });
  }
  function syncHomeProjectLinks(page) {
    if(!page.homeProjectLinks)return;
    const root=document.querySelector('[data-framer-name="Our Services"]');
    if(!root)return;
    if(!root.id)root.id='home-projects';
    entries.forEach(entry=>{
      const action=page.homeProjectLinks[entry.key];
      const heading=entry.el;
      if(!action || !heading.matches('h1,h2,h3,h4,h5,h6') || !root.contains(heading))return;
      const target=heading.parentElement;
      target.classList.add('home-project-heading-target');
      if(heading.getAttribute('data-home-project-href')!==action.href)heading.setAttribute('data-home-project-href',action.href);
      let link=target.querySelector(':scope > a[data-home-project-link]');
      if(!link) {
        link=document.createElement('a');
        link.className='home-project-title-link';
        target.append(link);
      }
      if(link.getAttribute('href')!==action.href)link.setAttribute('href',action.href);
      if(link.getAttribute('data-home-project-link')!==action.href)link.setAttribute('data-home-project-link',action.href);
      if(link.getAttribute('aria-label')!==action.label)link.setAttribute('aria-label',action.label);
      if(link.getAttribute('title')!==action.label)link.setAttribute('title',action.label);
      if(link.hasAttribute('target'))link.removeAttribute('target');
      if(!action.website)return;
      const parent=target.parentElement;
      let official=parent.querySelector(':scope > [data-home-project-official]');
      if(!official) {
        official=document.createElement('div');
        official.className='home-project-official';
        official.dataset.homeProjectOfficial='';
        const label=document.createElement('span');
        label.className='home-project-official-label';
        label.textContent='官方网站';
        const anchor=document.createElement('a');
        const domain=document.createElement('span');
        domain.dataset.homeProjectDomain='';
        const arrow=document.createElement('span');
        arrow.className='home-project-official-arrow';
        arrow.setAttribute('aria-hidden','true');
        arrow.textContent='↗';
        anchor.append(domain,arrow);
        official.append(label,anchor);
      }
      if(target.nextElementSibling!==official)target.after(official);
      const anchor=official.querySelector('a');
      if(anchor.getAttribute('href')!==action.website.href)anchor.setAttribute('href',action.website.href);
      if(anchor.target!=='_blank')anchor.target='_blank';
      if(anchor.rel!=='noopener noreferrer')anchor.rel='noopener noreferrer';
      const description='访问 MIRRISM 官网（新标签页打开）';
      if(anchor.getAttribute('aria-label')!==description)anchor.setAttribute('aria-label',description);
      const domain=anchor.querySelector('[data-home-project-domain]');
      if(domain.textContent!==action.website.domain)domain.textContent=action.website.domain;
    });
  }
  function applyPageCopy(page) {
    syncHomeProjectLinks(page);
    const root=document.querySelector('[data-framer-name="Main Container"]');
    if(root && page.layout?.endAfter) {
      const end=Array.from(root.children).find(node=>node.id===page.layout.endAfter);
      if(end) {
        let after=false;
        Array.from(root.children).forEach(node=>{
          if(after)node.style.setProperty('display','none','important');
          if(node===end)after=true;
        });
      }
    }
    if(page.layout?.focusWeights) {
      const weights=page.layout.focusWeights.map(value=>String(value).padStart(2,'0'));
      const nativeStops=['25','42','83'];
      // Keep the native rolling animation and photo masks on every breakpoint.
      // Mobile uses separate fixed-state counters instead of the sticky one.
      document.querySelectorAll('[data-framer-name="In Numbers"] [data-framer-name^="Digit "]').forEach(column=>{
        const position=column.dataset.framerName==='Digit A'?0:1;
        const digits=Array.from(column.querySelectorAll('p span')).filter(node=>!node.children.length && node.textContent.trim());
        if(digits.length!==10)return;
        digits.forEach((node,index)=>{
          const stop=nativeStops.findIndex(value=>value[position]===String(index));
          const value=stop<0?String(index):weights[stop][position];
          if(node.firstChild?.nodeValue!==value)node.firstChild.nodeValue=value;
        });
      });
      const group=document.querySelector('[data-framer-name="In Numbers"] [data-framer-name="Big Numbers"]');
      Array.from(group?.children || []).filter(node=>node.querySelector('h4')).forEach((section,index)=>{
        if(!weights[index])return;
        section.querySelectorAll('h4').forEach(heading=>heading.dataset.homeFocusWeight=weights[index]);
      });
    } else if(page.layout?.numberLabel) {
      const counters=document.querySelectorAll('[data-framer-name="In Numbers"] [data-framer-name="Sticky"] p');
      let index=0;
      counters.forEach(counter=>{
        const digits=Array.from(counter.querySelectorAll('span')).filter(node=>!node.children.length && node.textContent.trim());
        if(digits.length!==10)return;
        const label=page.layout.numberLabel[index++ % page.layout.numberLabel.length];
        digits.forEach(node=>{if(node.firstChild?.nodeValue!==label)node.firstChild.nodeValue=label;});
      });
    }
    if(page.layout?.hiddenProjectRoutes?.length) {
      const hidden=new Set(page.layout.hiddenProjectRoutes);
      document.querySelectorAll('a[href]').forEach(link=>{
        const url=new URL(link.href,location.href);
        if(url.origin!==location.origin)return;
        const key=url.pathname.replace(/^\/live\//,'/').replace(/\.html$/,'');
        if(!hidden.has(key))return;
        const parent=link.closest('[data-framer-name]');
        const tile=parent && /^\d+$/.test(parent.dataset.framerName||'') ? parent : link;
        tile.style.setProperty('display','none','important');
        tile.dataset.cmsHiddenProject='true';
      });
    }
    if(page.projectRoutes)document.querySelectorAll('a[href]').forEach(link=>{
      const url=new URL(link.href,location.href);
      if(url.origin!==location.origin)return;
      const key=url.pathname.replace(/^\/live\//,'/').replace(/\.html$/,'');
      const target=page.projectRoutes[key];
      if(target)link.href=target+url.search+url.hash;
    });
    if(page.projectLabels)document.querySelectorAll('a[href]').forEach(link=>{
      const pathname=new URL(link.href,location.href).pathname;
      const key=pathname.replace(/^\/live\//,'/').replace(/\.html$/,'');
      const title=page.projectLabels[key];
      if(!title)return;
      const description=title.replace(/\n/g,' ').replace(/([：:]) +/g,'$1');
      link.title=description;link.setAttribute('aria-label',description);
      link.querySelectorAll('img').forEach(img=>img.alt=description);
    });
    if(page.copyLinks)entries.forEach(entry=>{
      const href=page.copyLinks[originals.get(entry.el)?.text];
      const link=entry.el.closest('a')||entry.el.querySelector('a');
      if(href&&link)link.href=href;
    });
    const title=page.documentTitle || (page.projectTitle && page.projectTitle+' · Huang');
    if(title) {
      if(window.PortfolioIdentity)window.PortfolioIdentity.update({title,description:page.documentDescription || page.projectIntro});
      else document.title=title;
    }
    if(page.projectWebsite) {
      const intro=entries.find(entry=>entry.key==='6b095a05:1')?.el;
      const container=intro?.parentElement;
      if(container) {
        let link=container.querySelector('[data-project-website]');
        if(!link) {
          link=document.createElement('a');
          link.dataset.projectWebsite='';
          link.className='portfolio-project-website';
          intro.after(link);
        }
        const website=page.projectWebsite;
        if(link.getAttribute('href')!==website.href)link.setAttribute('href',website.href);
        if(link.target!=='_blank')link.target='_blank';
        if(link.rel!=='noopener noreferrer')link.rel='noopener noreferrer';
        const label=website.label+' ↗';
        if(link.textContent!==label)link.textContent=label;
        const description=website.label+'（新标签页打开）';
        if(link.getAttribute('aria-label')!==description)link.setAttribute('aria-label',description);
      }
    }
    if(page.projectAction)entries.forEach(entry=>{
      const original=originals.get(entry.el);
      if(original?.text!=='Live Project')return;
      const link=entry.el.closest('a') || entry.el.querySelector('a');
      if(link)link.href=page.projectAction.href;
    });
  }
  function syncPortfolioBranding() {
    document.querySelectorAll('footer .framer-fit-text').forEach(frame=>{
      const svg=frame.closest('svg');
      if(svg && frame.textContent.trim()==='Huang@' && !svg.hasAttribute('data-portfolio-wordmark'))svg.setAttribute('data-portfolio-wordmark','');
    });
    document.querySelectorAll('img[alt]').forEach(image=>{
      if(/m[oö]bius/i.test(image.alt))image.alt='Huang 项目配图';
    });
    document.querySelectorAll('a[href]').forEach(link=>{
      const href=link.getAttribute('href');
      if(/^https?:\/\/mobius\.framer\.website(?:\/|$)/i.test(href)) {
        const original=new URL(href);link.href=original.pathname+original.search+original.hash;
      } else if(/^mailto:hello@(?:mobius\.(?:com|studio)|wearemobis\.com|world\.com)/i.test(href)) {
        link.href=location.pathname.includes('contacts')?'/work':'/contacts';
      } else if(/^tel:(?:00000000|\+?49)/.test(href))link.href='/work';
    });
    document.querySelectorAll('footer a[href],footer a[data-portfolio-credit]').forEach(link=>{
      const href=link.getAttribute('href');
      const kind=link.dataset.portfolioCredit ||
        (/templatoria\.com/.test(href)?'author':/framer\.link\/drukarov|^https:\/\/(?:www\.)?framer\.com\/?$/.test(href)?'brand':null);
      if(!kind)return;
      link.dataset.portfolioCredit=kind;
      if(href!=='/')link.setAttribute('href','/');
      link.removeAttribute('target');
      if(link.getAttribute('aria-label')!=='Huang')link.setAttribute('aria-label','Huang');
      const pairs=Array.from(link.querySelectorAll('div')).filter(element=>element.children.length===2 && Array.from(element.children).every(child=>child.tagName==='DIV' && child.children.length===0));
      const letters=Array.from(kind==='brand'?'HUANG@':'HUANG');
      pairs.forEach((pair,index)=>{
        const display=index<letters.length?'inline-block':'none';
        if(pair.parentElement.style.display!==display)pair.parentElement.style.display=display;
        Array.from(pair.children).forEach(glyph=>{
          const value=letters[index] || '';
          if(glyph.textContent!==value)glyph.textContent=value;
        });
      });
      if(!pairs.length && link.textContent!=='Huang@')link.textContent='Huang@';
    });
    // A few archived animated words have different text identities from the CMS.
    // Clean those leaves without rebuilding their animation or layout wrappers.
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())) {
      if(!/m[oö]bius|wearemobis/i.test(node.nodeValue) || node.parentElement.closest('script,style,noscript,textarea,pre,code'))continue;
      node.nodeValue=node.nodeValue
        .replace(/hello@(?:mobius\.(?:com|studio)|wearemobis\.com)/gi,'联系交流')
        .replace(/m[oö]bius(?:®)?/gi,'Huang@');
    }
  }
  function syncPrimaryNavigation() {
    document.querySelectorAll('nav.framer-cSZEg a[href], .framer-juKxq a[href]').forEach(link => {
      const pathname = new URL(link.href, location.href).pathname;
      const label = /(?:^|\/)work(?:\.html)?$/.test(pathname) ? '核心项目'
        : /(?:^|\/)contacts(?:\.html)?$/.test(pathname) ? '联系方式' : null;
      if (!label) return;
      const pairs = Array.from(link.querySelectorAll('div')).filter(element =>
        element.children.length === 2 && Array.from(element.children).every(child => child.tagName === 'DIV' && child.children.length === 0));
      if (pairs.length) {
        const characters = Array.from(label);
        pairs.forEach((pair, index) => {
          const display = index < characters.length ? 'inline-block' : 'none';
          if (pair.parentElement.style.display !== display) pair.parentElement.style.display = display;
          Array.from(pair.children).forEach(glyph => {
            const value = characters[index] || '';
            if (glyph.textContent !== value) glyph.textContent = value;
          });
        });
      } else {
        const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let node;
        while ((node = walker.nextNode())) {
          if (node.nodeValue.trim() && !node.parentElement.closest('svg,script,style')) nodes.push(node);
        }
        nodes.forEach((node, index) => {
          const value = index === 0 ? label : '';
          if (node.nodeValue !== value) node.nodeValue = value;
        });
      }
      if (link.getAttribute('aria-label') !== label) link.setAttribute('aria-label', label);
      if (link.getAttribute('title') !== label) link.setAttribute('title', label);
    });
  }
  function syncCoreReady() {
    if(!document.body.hasAttribute('data-core-project-page'))return;
    const page=data?.pages[routeKey()];
    const key=document.body.dataset.coreProjectPage==='overview'?'78a9aefc:1':'b89c5f30:1';
    const expected=page?.texts?.[key]?.value?.replace(/\s+/g,'');
    const ready=Boolean(expected && Array.from(document.querySelectorAll('#main h1')).some(heading=>
      visible(heading) && (heading.innerText||heading.textContent).replace(/\s+/g,'')===expected));
    document.body.toggleAttribute('data-core-project-ready',ready);
  }
  function apply() {
    const page=data?.pages[routeKey()]; if(!page) return;
    const counts={}, next=[];
    document.querySelectorAll(SEL).forEach(el=>{
      if(el.closest('script,style,noscript') || !visible(el)) return;
      let o=originals.get(el);
      if(!o) {
        const text=(el.innerText || el.textContent || '').replace(/\s+/g,' ').trim();
        if(text.length<2 || text.length>2400) return;
        const inner=el.querySelector(SEL);
        if(inner && (inner.innerText || inner.textContent || '').trim().length>=2) return;
        o=captureText(el,text); originals.set(el,o);
      }
      const h=hash(o.text), key=h+':'+(counts[h]=(counts[h]||0)+1);
      const e=page.texts[key] || page.texts[h+':1'];
      const label=cardLabel(el,page);
      if(!e && !label) return;
      updateText(el,o,label || e.value,!label && e.value===e.orig,Boolean(label));
      next.push({el,key,kind:'text',group:section(el)});
    });
    document.querySelectorAll('img,video,source').forEach(el=>{
      let o=mediaOriginals.get(el);
      if(!o) {
        const src=el.getAttribute('src'); if(!src) return;
        const sourceKey=el.getAttribute('data-cms-media-key') || hash(src.split('/').pop().split('?')[0]);
        const key=page.mediaAliases?.[sourceKey] || sourceKey;
        o={key,src:page.media[key]?.src || src,srcset:el.getAttribute('data-cms-original-srcset') || el.getAttribute('srcset'),poster:el.getAttribute('poster')};
        mediaOriginals.set(el,o);
      }
      const key=o.key, e=page.media[key]; if(!e) return;
      const changed=e.value!==e.src && e.value!==e.orig;
      const src=changed?e.value:o.src;
      if(el.tagName==='IMG') {
        // A designed gallery poster can open its underlying screenshot. If the
        // CMS replaces that poster, the newly chosen image remains its own original.
        const original=e.lightboxPoster===src ? e.lightboxSrc : null;
        if(original) {
          if(el.getAttribute('data-lightbox-src')!==original)el.setAttribute('data-lightbox-src',original);
        } else if(el.hasAttribute('data-lightbox-src'))el.removeAttribute('data-lightbox-src');
      }
      if(el.tagName==='VIDEO' && e.poster) {
        const poster=changed?e.poster:o.poster;
        if(el.getAttribute('poster')!==poster) {
          if(poster)el.setAttribute('poster',poster);else el.removeAttribute('poster');
        }
      }
      if(el.getAttribute('src')!==src) {el.setAttribute('src',src); if(el.tagName==='SOURCE') el.parentElement.load?.();}
      if(changed) el.removeAttribute('srcset'); else if(o.srcset && el.getAttribute('srcset')!==o.srcset) el.setAttribute('srcset',o.srcset);
      if(visible(el)) next.push({el,key,kind:'media',group:section(el)});
    });
    entries=next.sort((a,b)=>a.el===b.el?0:(a.el.compareDocumentPosition(b.el)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1));
    applyPageCopy(page);
    syncPortfolioBranding();
    syncPrimaryNavigation();
    layoutIntro();
    updatePreviewMotion();
    syncCoreReady();
    document.documentElement.removeAttribute('data-cms-pending');
    sendOutline();
  }
  function sendOutline() {
    if(parent===window) return;
    const groups=[],seen=new Set();
    const outline=entries.filter(e=>{const k=e.kind+e.key;if(seen.has(k))return false;seen.add(k);return true;}).map(e=>{
      let g=groups.indexOf(e.group);if(g<0){g=groups.length;groups.push(e.group);}
      const heading=e.group.querySelector('h1,h2,h3,h4,h5,h6');
      const title=((heading && (originals.get(heading)?.text || heading.textContent)) || e.group.getAttribute('data-framer-name') || '页面内容').trim().slice(0,65);
      return {key:e.key,kind:e.kind,section:g,title};
    });
    const payload=JSON.stringify(outline);
    if(payload!==lastOutline){lastOutline=payload;parent.postMessage({type:'cms:outline',route:routeKey(),outline},location.origin);}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,document.body.hasAttribute('data-core-project-page')?40:180);}
  async function refresh(){try{const r=await fetch('/api/content',{cache:'no-store'});if(!r.ok)throw Error();data=await r.json();apply();}catch(e){console.warn('内容更新失败，等待重连');}}
  window.addEventListener('message',e=>{
    if(e.origin!==location.origin || e.source!==parent || parent===window) return;
    if(e.data.type==='cms:update'){data=e.data.data;apply();}
    if(e.data.type==='cms:outline-request'){lastOutline='';apply();}
    if(e.data.type==='cms:locate'){
      const item=entries.find(x=>x.kind===e.data.kind && x.key===e.data.key);
      if(item){item.el.scrollIntoView({behavior:'smooth',block:'center'});item.el.animate([{outline:'3px solid #9678ff',outlineOffset:'5px'},{outline:'3px solid transparent',outlineOffset:'5px'}],{duration:1800});}
    }
  });
  function start(){
    const seed=document.getElementById('cms-page-seed');
    let seeded=false;
    if(seed) {
      try { data={pages:{[routeKey()]:JSON.parse(seed.textContent)}}; apply(); seeded=true; }
      catch(e) { console.warn('页面初始内容不可用'); }
    }
    if(!seeded && !STATIC_MODE)refresh();
    new MutationObserver(()=>{
      // A template hydration commit must be corrected in this microtask, before
      // the browser paints it. Debouncing this previously exposed old copy.
      apply();
    }).observe(document.body,{childList:true,subtree:true,characterData:true});
    new MutationObserver(syncPortfolioBranding).observe(document.body,{subtree:true,attributes:true,attributeFilter:['href','alt']});
    window.addEventListener('resize',apply);
    document.fonts?.ready.then(schedule);
    window.addEventListener('scroll',()=>requestAnimationFrame(updatePreviewMotion),{passive:true});
    if(STATIC_MODE) { setTimeout(schedule,1000);setTimeout(schedule,2500);return; }
    const events=new EventSource('/api/events');
    events.addEventListener('content',refresh);
    events.addEventListener('page-update',event=>{
      const change=JSON.parse(event.data);
      if (/^admin\./.test(change.path)) return;
      if (document.getElementById('cms-page-update')) return;
      const button=document.createElement('button');
      button.id='cms-page-update';
      button.textContent='页面有更新 · 点击刷新';
      button.style.cssText='position:fixed;right:20px;bottom:20px;z-index:2147483647;padding:10px 16px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#222;font:13px sans-serif;cursor:pointer;box-shadow:0 2px 12px #0002';
      button.onclick=()=>location.reload();
      document.body.appendChild(button);
    });
    events.onopen=refresh;
    setTimeout(schedule,1000);setTimeout(schedule,2500);
  }
  // This script sits after the page markup. Do not wait for the large template
  // module (and its imports) to finish before applying the already-inline copy.
  if(document.body && document.getElementById('main'))start();
  else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
