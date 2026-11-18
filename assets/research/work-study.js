(()=>{
 'use strict';
 const groups={
  memory:[['base','none','无记忆'],['base','raw_experience','原始经验'],['base','structured','结构化经验'],['base','relevant','紧凑记忆']],
  matched:[['base','none','原始基座（参考）'],['teacher-731','none','教师 SFT 父模型'],['rl-matched-sft','none','父模型 → 继续 SFT'],['episodic-731','none','父模型 → Episode RL']],
  seeds:[['base','none','基础模型'],['self-731','none','SFT / 731'],['self-947','none','SFT / 947'],['self-1201','none','SFT / 1201']]
 };
 const descriptions={memory:'冻结同一基座，不更新权重。relevant 是来源经验证的紧凑 top-1 记忆，不等同于严格适用性过滤。99/120 是上下文条件收益，不是权重内化收益。',matched:'teacher-731 是共同父 checkpoint，已有 48 次 SFT 更新。两增量分支均 7 次更新、535,322 个处理 token、优化 seed 731；不包含父训练，也不代表含 rollout 等所有成本的等 GPU 时间 / 等 FLOPs。RL 为当前策略完整 Episode REINFORCE 类更新。',seeds:'475 条自生成成功样本来自同一次采集快照，分别以三个优化 seed 训练；不是三次独立数据采集。Test/OOD 胜局均未超过本轮基线。'};
 const strengths={memory:'冻结基座 / 上下文条件对照 / 探索性比较',matched:'探索性 / 单优化 seed 731 / 教师 SFT 暖启动',seeds:'三优化 seed / 共享一次采集 / 本轮未观察到提升'};
 const byId=id=>document.getElementById(id);
 const buttons=[...document.querySelectorAll('[data-branch],[data-split]')];
 let branch='memory',split='test',rows=[];
 const percent=row=>(Number(row.win_rate)*100).toFixed(1)+'%';
 const total=row=>row.victories+'/'+row.episodes;
 function find(name,mode='none'){const row=rows.find(r=>r.split===split&&r.name===name&&r.mode===mode);if(!row)throw Error('缺少冻结实验行：'+split+'/'+name+'/'+mode);return row;}
 function render(){
  const selected=groups[branch].map(([name,mode,label])=>({row:find(name,mode),label}));
  const bars=byId('wr-bars'),table=byId('wr-table');bars.replaceChildren();table.replaceChildren();
  selected.forEach(({row,label})=>{
   const rate=Number(row.win_rate)*100,bar=document.createElement('div');bar.className='wr-bar-row';bar.dataset.name=row.name;
   const name=document.createElement('span');name.textContent=label;
   const track=document.createElement('div');track.className='wr-bar-track';const fill=document.createElement('div');fill.className='wr-bar-fill';fill.style.width=rate+'%';track.append(fill);
   const value=document.createElement('span');value.className='wr-bar-value';value.textContent=percent(row);bar.append(name,track,value);bars.append(bar);
   const tr=document.createElement('tr');tr.dataset.name=row.name;[label,total(row),percent(row)].forEach(text=>{const td=document.createElement('td');td.textContent=text;tr.append(td)});table.append(tr);
  });
  bars.setAttribute('aria-busy','false');bars.setAttribute('aria-label',split.toUpperCase()+' 任务成功率；精确数据见下方表格');
  byId('wr-condition').textContent=descriptions[branch];byId('wr-strength').textContent=strengths[branch];
  byId('wr-scope').textContent=({memory:'冻结基座',matched:'父模型配对 / seed 731',seeds:'共享采集 / 三优化 seed'})[branch]+' / '+split.toUpperCase();
  byId('wr-lineage').hidden=branch!=='matched';
  const base=find('base');let finding;
  if(branch==='memory'){
   const compact=find('base','relevant');finding=`紧凑记忆 ${total(compact)}（${percent(compact)}），无记忆 ${total(base)}（${percent(base)}）。差 ${((Number(compact.win_rate)-Number(base.win_rate))*100).toFixed(1)} 个百分点，来自上下文条件变化，不是参数内化的证据。`;
   if(split==='ood')finding+=' OOD 仍是同一游戏的规则变化，不代表跨任务泛化。';
  }else if(branch==='matched'){
   const parent=find('teacher-731'),sft=find('rl-matched-sft'),rl=find('episodic-731');finding=`教师父模型 ${total(parent)}；从该父模型出发，继续 SFT ${total(sft)}（${percent(sft)}），完整 Episode RL ${total(rl)}（${percent(rl)}）。RL 相对配对 SFT 差 ${((Number(rl.win_rate)-Number(sft.win_rate))*100).toFixed(1)} 个百分点，仅覆盖一个训练 seed，不是纯自主发现。`;
  }else{finding=`三个自生成 SFT 优化 seed 均为 ${total(find('self-731'))}（${percent(find('self-731'))}），与基线 ${total(base)} 相同。三 seed 共享一次采集快照，不能据此证明未来任务等价。`;}
  byId('wr-finding').textContent=finding;
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.branch?b.dataset.branch===branch:b.dataset.split===split)));
 }
 function dataFailure(error){
  rows=[];document.querySelector('.wr-result-panel').hidden=true;byId('wr-lineage').hidden=true;byId('wr-strength').textContent='数据未加载 / 不展示实验对照';byId('wr-bars').replaceChildren();byId('wr-table').replaceChildren();byId('wr-bars').setAttribute('aria-busy','false');byId('wr-bars').setAttribute('aria-label','实验数据加载失败');byId('wr-data-error').hidden=false;
  byId('wr-finding').textContent='实验数据未加载，不显示预设结果。请重试或核对页尾原始证据。';byId('wr-condition').textContent='图表、表格及结论均等待同一份冻结数据。';buttons.forEach(b=>b.disabled=true);
 }
 async function loadResults(){
  byId('wr-data-error').hidden=true;buttons.forEach(b=>b.disabled=true);byId('wr-bars').setAttribute('aria-busy','true');byId('wr-retry').disabled=true;
  try{
   const response=await fetch('/assets/research/case-a-evidence.json');if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();
   if(!Array.isArray(data.rows)||!data.rows.length)throw Error('缺少实验数据');
   rows=data.rows;
   for(const candidate of ['test','ood'])for(const group of Object.values(groups))for(const [name,mode] of group){
    const row=rows.find(r=>r.split===candidate&&r.name===name&&r.mode===mode);const n=candidate==='test'?120:48;
    if(!row||!Number.isFinite(Number(row.win_rate))||Number(row.episodes)!==n||!Number.isInteger(Number(row.victories))||Number(row.victories)<0||Number(row.victories)>n||Math.abs(Number(row.win_rate)-Number(row.victories)/n)>1e-8)throw Error('不完整或无效的冻结数据');
   }
   render();document.querySelector('.wr-result-panel').hidden=false;buttons.forEach(b=>b.disabled=false);
  }catch(error){dataFailure(error)}finally{byId('wr-retry').disabled=false;}
 }
 buttons.forEach(b=>b.addEventListener('click',()=>{if(b.dataset.branch)branch=b.dataset.branch;else split=b.dataset.split;try{render()}catch(error){dataFailure(error)}}));
 byId('wr-retry').addEventListener('click',loadResults);loadResults();
 // Local navigation: native keyboard behavior, current-section text and horizontal containment.
 const menu=document.querySelector('.wr-menu'),nav=byId('wr-mobile-nav');
 menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.hidden=!open;menu.querySelector('span').textContent=open?'−':'＋'});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!nav.hidden){nav.hidden=true;menu.setAttribute('aria-expanded','false');menu.querySelector('span').textContent='＋';menu.focus()}});
 const index=document.querySelector('.wr-index'),links=[...index.querySelectorAll('a')],sections=links.map(a=>document.querySelector(a.getAttribute('href')));let pending=false,current='';
 function trackSection(){pending=false;const edge=index.getBoundingClientRect().bottom+80;let active=sections[0];for(const section of sections){if(section.getBoundingClientRect().top<=edge)active=section;}
  if(!active||active.id===current)return;current=active.id;
  links.forEach(a=>{if(a.hash==='#'+current){a.setAttribute('aria-current','location');const r=a.getBoundingClientRect(),n=index.getBoundingClientRect();if(r.left<n.left||r.right>n.right)index.scrollLeft+=r.left-n.left-12;}else a.removeAttribute('aria-current')});
 }
 window.addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(trackSection)}},{passive:true});window.addEventListener('resize',trackSection);trackSection();
 document.querySelectorAll('[data-game]').forEach(button=>button.addEventListener('click',()=>{const game=button.dataset.game;document.querySelectorAll('[data-game]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.game===game)));document.querySelectorAll('[data-game-panel]').forEach(p=>p.hidden=p.dataset.gamePanel!==game)}));
 // Aggregate-only evidence browser. No synthetic intermediate states or playback controls.
 const select=byId('wr-rpg-condition');let gameplay;
 function renderBrowser(){
  const row=gameplay.rpg.rows.find(r=>r.name===select.value);if(!row)throw Error('缺少 RPG 汇总');
  const state=row.end_state,fields=[['模型条件',row.condition],['世界 / 训练 seed',row.world_seed+' / 731'],['评估窗口',row.game_minutes+' 游戏分钟 / 10 天'],['终点生存 / 饥饿',(state.alive?'存活':'死亡')+' / '+state.hunger.estado],['终点钱数',row.end_money],['终点随身口粮',row.end_portable_food_days+' 天'],['终点胃内口粮',state.hunger.diasEnEstomago+' 天'],['原生感悟增量',row.insight_pp+' 个百分点'],['观察到的消费',row.observed_money_decreases],['已执行动作总数',row.steps+'（汇总，非能力得分）']];
  const dl=byId('wr-browser-details');dl.replaceChildren();fields.forEach(([label,value])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;div.append(dt,dd);dl.append(div)});
  const names={esperar:'等待',contemplar:'参悟',trabajar:'工作',comprar_racion:'买粮'};
  byId('wr-browser-actions').textContent='动作计数（不含顺序）：'+Object.entries(names).map(([key,label])=>label+' '+(row.actions[key]||0)+' 次').join(' / ')+'。原始动作字母与逐步工具回复待接入。';
  byId('wr-browser-hash').textContent='Episode SHA-256: '+row.episode_sha256;
  byId('wr-browser-status').textContent='当前：'+row.condition+' / 封存终点汇总 / 非逐步回放';
 }
 select.addEventListener('change',renderBrowser);
 fetch('/assets/research/gameplay-evidence.json').then(r=>{if(!r.ok)throw Error('游戏汇总加载失败');return r.json()}).then(data=>{
  if(!Array.isArray(data.rpg?.rows)||data.rpg.rows.length!==4||data.rpg.rows.some(r=>!r.end_state||!r.actions))throw Error('缺少终点记录');
  gameplay=data;select.replaceChildren();data.rpg.rows.forEach(row=>{const option=document.createElement('option');option.value=row.name;option.textContent=row.condition;select.append(option)});select.disabled=false;renderBrowser();
 }).catch(()=>{byId('wr-browser-status').textContent='游戏汇总数据加载失败；原始逐步轨迹仍待接入。可下载页尾 JSON 核对，或刷新重试。';select.disabled=true;});
})();
