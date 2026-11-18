(()=>{
 'use strict';
 const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';let data,step=1,exampleKey='response',position=0;
 const metrics={loss:'总训练 Loss',fixed_prefix_token_loss:'固定前缀 Token Loss',value_token_loss:'数值 Token Loss'};
 const explanations={goal_relevance:'事件对指定目标的相关程度，不等于角色一般有多重视该目标。',perceived_gain:'相对比较基准，主观感知到的额外目标进展。',perceived_cost:'相对比较基准，主观感知到的额外阻碍或损失。',expectancy_violation:'事件相对既有预期的违背程度，不等于事件客观罕见性。',claim_acceptance:'对指定主张的认可，不等于喜爱来源或服从要求。',coping_potential:'当前主观应对判断，不是客观胜率。',engagement_readiness:'对指定行动的投入准备，不表示行动已发生。',withdrawal_readiness:'停止或退出该行动的准备，不必与投入互补。',resistance_readiness:'反对外部要求或安排的准备，不只是退出。'};
 function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
 function svgNode(tag,attrs,text){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text!==undefined)e.textContent=text;return e;}
 function plot(svg,points,{label,yMax=1,xTicks,selected=0}){
  const width=Math.round(svg.getBoundingClientRect().width);if(width<10)return;
  const height=svg.id==='pk-training-chart'&&innerWidth>809?320:280,left=48,right=18,top=25,bottom=40;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-label',label);svg.replaceChildren();
  const xs=points.map(p=>p.x),lo=Math.min(...xs),hi=Math.max(...xs);const x=v=>left+(v-lo)/(hi-lo||1)*(width-left-right),y=v=>height-bottom-v/yMax*(height-top-bottom);
  [0,.25,.5,.75,1].forEach(t=>{const yy=y(t*yMax);svg.append(svgNode('line',{x1:left,x2:width-right,y1:yy,y2:yy,stroke:'#e8e8e8'}));svg.append(svgNode('text',{x:left-10,y:yy+4,'text-anchor':'end',fill:'#666','font-size':11,'font-family':'Inter Display, sans-serif'},(t*yMax).toFixed(yMax<.1?3:2)))});
  (xTicks||xs).forEach(t=>svg.append(svgNode('text',{x:x(t),y:height-14,'text-anchor':'middle',fill:'#666','font-size':11,'font-family':'Inter Display, sans-serif'},t)));
  svg.append(svgNode('path',{d:points.map((p,i)=>(i?'L':'M')+x(p.x).toFixed(3)+' '+y(p.y).toFixed(3)).join(' '),fill:'none',stroke:'#111','stroke-width':1.8,'stroke-linejoin':'round'}));
  const current=points[selected]||points[0];svg.append(svgNode('circle',{cx:x(current.x),cy:y(current.y),r:4,fill:'#fff',stroke:'#111','stroke-width':1.8}));
 }
 function renderTraining(){
  if(!data)return;const field=$('pk-loss').value,row=data.training_rows[step-1];
  plot($('pk-training-chart'),data.training_rows.map(r=>({x:r.step,y:r[field]})),{label:`${metrics[field]}，120 个实际优化步；当前第 ${step} 步为 ${row[field]}`,yMax:Math.max(...data.training_rows.map(r=>r[field]))*1.1,xTicks:[1,40,80,120],selected:step-1});
  $('pk-step-label').textContent=step+' / 120';$('pk-training-value').textContent=`Step ${row.step} / epoch ${row.epoch} · ${metrics[field]} = ${row[field].toFixed(6)}。这是该步真实训练记录，不是验证分数。`;
 }
 const percent=v=>v===null?'支持不足':(v*100).toFixed(2)+'%';
 function renderComparison(){
  const scope=$('pk-scope').value,group=data.comparisons[scope];$('pk-metric-bars').replaceChildren();$('pk-metric-table').replaceChildren();
  for(const row of group.rows){
   const metric=node('div',undefined,'pk-metric');metric.append(node('span',row.label,'pk-metric-label'));
   for(const [key,label] of [['new','0.8B'],['old','1.7B']]){
    const line=node('div',undefined,'pk-track-row');line.append(node('span',label));const track=node('div',undefined,'pk-track');
    if(row[key]!==null){const fill=node('div',undefined,'pk-fill'+(key==='old'?' old':''));fill.style.width=row[key]*100+'%';track.append(fill)}
    line.append(track,node('b',percent(row[key])));metric.append(line);
   }
   $('pk-metric-bars').append(metric);const tr=node('tr');tr.dataset.metric=row.metric;
   for(const text of [row.label,percent(row.new),percent(row.old),row.delta===null?'支持不足':(row.delta>0?'+':'')+(row.delta*100).toFixed(2)])tr.append(node('td',text));
   if(row.delta!==null&&row.delta<0)tr.lastChild.dataset.direction='down';$('pk-metric-table').append(tr);
  }
  const findings={overall:'确认集总体可见响应 44.64%，低于旧参照 46.43%；稳定性 86.11% 对 95.83%，情境调节 16.67% 对 33.33%。格式正确不能替代这些验收项。',domain_self_efficacy:'可见响应与趋势均为 100%，但曲线稳定性仅 37.50%，旧参照为 100%。能随输入变化，不等于响应足够稳定。',pre_event_available_energy:'可见响应为 81.25%，旧参照为 87.50%；趋势为 100% 对 87.50%。不同分项应分别验收，不能只挑改善项。',autonomy_priority:'可见响应、趋势和情境调节均为 0。曲线稳定为 100% 不代表有效性，输出不变化也可能得到稳定曲线。',pre_event_mental_occupation:'可见响应为 0，趋势为 37.50%。不变性没有合格参考支持，保留缺失，不补成零或通过。'};
  $('pk-comparison-finding').textContent=group.label+'：'+findings[scope];$('pk-table-caption').textContent=group.label+' / 报告定义的合格曲线与机制指标，非输入分类准确率';
 }
 const basisLabels={strong:'强支持',indirect:'间接支持',prior:'先验估计',insufficient:'支持不足'};
 function currentExample(){return data.examples.find(e=>e.key===exampleKey);}
 function renderExample(){
  const example=currentExample(),record=example.records[position];
  $('pk-example-description').textContent='中文概述：'+example.description_zh;$('pk-record-id').textContent=record.id;
  $('pk-context').replaceChildren();
  const fields={pre_event_background:'事件前背景',current_event:'当前事件',evaluation_target:'评价目标',comparison_baseline:'比较基准'};
  for(const [key,label] of Object.entries(fields)){const div=node('div');div.append(node('dt',label+' / '+key),node('dd',record.input.context[key].value===null?'未提供':record.input.context[key].value));$('pk-context').append(div)}
  $('pk-features').replaceChildren();Object.entries(record.input.features).forEach(([field,v])=>{const tr=node('tr');tr.append(node('td',field),node('td',v.value===null?'null / 未提供':v.value));$('pk-features').append(tr)});
  $('pk-output').replaceChildren();for(const [field,label] of Object.entries(data.contract.axis_labels_zh)){
   const reference=record.reference_sidecar[field]||(field===example.axis?record.reference_sidecar:null),basis=reference?.basis;
   const tr=node('tr');tr.dataset.axis=field;tr.append(node('td',label),node('td',record.values[field].toFixed(2)),node('td',basis?(basisLabels[basis]||basis):'此例未提供'));$('pk-output').append(tr);
  }
  $('pk-raw-output').textContent=record.raw_output;$('pk-raw-hash').textContent='显示的原始 JSON SHA-256: '+record.raw_output_sha256+'\n原始生成证据文件 SHA-256: '+record.source_evidence_sha256;
  if(example.axis){
   $('pk-example-chart').hidden=false;plot($('pk-example-chart'),example.records.map(r=>({x:r.input.features[example.feature].value,y:r.values[example.axis]})),{label:`${example.feature} 改变时的 ${example.axis}，五个真实输出点`,yMax:1,xTicks:[.1,.3,.5,.7,.9],selected:position});
   const first=example.records[0].values[example.axis],last=example.records.at(-1).values[example.axis];
   $('pk-example-curve-note').textContent=`横轴：${example.feature}；纵轴：${example.axis}（0–1）。封存输出 ${first.toFixed(2)} → ${last.toFixed(2)}，差 ${(last-first).toFixed(2)}；报告可见响应判定 ${example.tests.visible_response===1?'通过':'未通过'}。参考为合成间接证据，非独立心理真值。`;
  }else{$('pk-example-chart').hidden=true;$('pk-example-curve-note').textContent='此类只有一条冻结示例，不绘制响应曲线。部分轴参考依赖先验估计，不能据此验真模型的心理准确性。';}
 }
 function changeExample(){
  exampleKey=$('pk-example').value;position=0;$('pk-copy-status').textContent='';const example=currentExample();$('pk-position').replaceChildren();
  example.records.forEach((record,i)=>{const option=node('option',record.position===undefined||record.position===null?'单条封存记录':({domain_self_efficacy:'自我效能',pre_event_available_energy:'可用精力'}[example.feature]||example.feature)+' = '+record.position);option.value=i;$('pk-position').append(option)});
  $('pk-position').disabled=example.records.length===1;renderExample();
 }
 function validate(d){
  if(d.training_rows?.length!==120||d.validation?.length!==3||d.examples?.length!==3||Object.keys(d.contract?.outputs||{}).length!==9)throw Error('研究数据不完整');
  d.training_rows.forEach((r,i)=>{if(r.step!==i+1||Object.keys(metrics).some(k=>!Number.isFinite(r[k])))throw Error('训练记录无效')});
  if(Object.values(d.comparisons).some(g=>g.rows.some(r=>['new','old'].some(k=>r[k]!==null&&(!Number.isFinite(r[k])||r[k]<0||r[k]>1)))))throw Error('指标无效');
  for(const e of d.examples)for(const r of e.records){const parsed=JSON.parse(r.raw_output);if(Object.keys(parsed).length!==9||Object.keys(d.contract.outputs).some(k=>parsed[k].value!==r.values[k]))throw Error('原始输出不一致');}
 }
 async function load(){
  $('pk-load-error').hidden=true;$('pk-retry').disabled=true;
  try{const response=await fetch('/assets/research/psychological-kernel-evidence.json',{cache:'no-store'});if(!response.ok)throw Error('研究数据加载失败');const d=await response.json();validate(d);data=d;
   $('pk-axes').replaceChildren();Object.entries(d.contract.axis_labels_zh).forEach(([key,label])=>{const article=node('article');article.append(node('h3',label),node('code',key),node('p',explanations[key]));$('pk-axes').append(article)});
   $('pk-epochs').replaceChildren();d.validation.forEach(r=>{const epoch=node('div',undefined,'pk-epoch');epoch.dataset.selected=String(r.epoch===2);epoch.append(node('span','EPOCH '+r.epoch),node('strong',r.score.toFixed(4)),node('small',r.epoch===2?'已锁定 / 固定验证集最高分':'未选用'));$('pk-epochs').append(epoch)});
   ['pk-loss','pk-step','pk-scope','pk-example','pk-copy'].forEach(id=>$(id).disabled=false);$('pk-selection-rule').textContent='原报告选择规则（英文原文）：'+d.selection_rule;renderTraining();renderComparison();changeExample();
  }catch(error){data=undefined;['pk-loss','pk-step','pk-scope','pk-example','pk-position','pk-copy'].forEach(id=>$(id).disabled=true);$('pk-load-error').hidden=false;$('pk-training-chart').replaceChildren();$('pk-example-chart').replaceChildren();$('pk-metric-bars').replaceChildren();$('pk-metric-table').replaceChildren();$('pk-training-value').textContent='研究数据未加载；不使用示意数字兜底。请重试或查看独立报告。';$('pk-comparison-finding').textContent='数据未加载，不展示分项对照。';}finally{$('pk-retry').disabled=false;}
 }
 $('pk-loss').addEventListener('change',renderTraining);$('pk-step').addEventListener('input',()=>{step=Number($('pk-step').value);renderTraining()});$('pk-scope').addEventListener('change',renderComparison);$('pk-example').addEventListener('change',changeExample);$('pk-position').addEventListener('change',()=>{position=Number($('pk-position').value);$('pk-copy-status').textContent='';renderExample()});$('pk-retry').addEventListener('click',load);
 $('pk-copy').addEventListener('click',async()=>{$('pk-copy-status').textContent='正在复制…';try{await navigator.clipboard.writeText(currentExample().records[position].raw_output);$('pk-copy-status').textContent='已复制原始 JSON。'}catch{$('pk-copy-status').textContent='浏览器未允许复制，可在上方选中原始 JSON 后复制。'}});
 new ResizeObserver(()=>{if(data){renderTraining();renderExample()}}).observe($('pk-training-chart'));
 // Same native navigation behavior and current-section convention as Case A.
 const menu=document.querySelector('.wr-menu'),mobile=$('wr-mobile-nav');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));mobile.hidden=!open;menu.querySelector('span').textContent=open?'−':'＋'});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mobile.hidden){mobile.hidden=true;menu.setAttribute('aria-expanded','false');menu.querySelector('span').textContent='＋';menu.focus()}});
 const index=document.querySelector('.wr-index'),links=[...index.querySelectorAll('a')],sections=links.map(a=>document.querySelector(a.hash));let pending=false,current='';
 function track(){pending=false;const edge=index.getBoundingClientRect().bottom+80;let active=sections[0];for(const section of sections){if(section.getBoundingClientRect().top<=edge)active=section;}if(active.id===current)return;current=active.id;links.forEach(a=>{if(a.hash==='#'+current){a.setAttribute('aria-current','location');const r=a.getBoundingClientRect(),n=index.getBoundingClientRect();if(r.left<n.left||r.right>n.right)index.scrollLeft+=r.left-n.left-12;}else a.removeAttribute('aria-current')});}
 window.addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(track)}},{passive:true});window.addEventListener('resize',track);track();load();
})();
