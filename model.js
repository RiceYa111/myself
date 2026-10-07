(function(root){
'use strict';
const R=typeof module!=='undefined'?require('./agent-rules.js'):root.AgentRules;
const W=typeof module!=='undefined'?require('./wardrobe-catalog.js'):root.WardrobeCatalog;
const id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const day=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const plusDay=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return day(d)};
const cfg={cardCost:500,maxGoals:5,monthlyCancel:2,monthlyUndo:2,rewards:[100,150,200]};
function seed(mode='default') {const s={schema:1,userId:id(),coins:['empty','first'].includes(mode)?0:400,cards:mode==='free'?0:3,xp:mode==='first'?0:300,goals:[],memories:[],messages:[],ledger:[],events:[],requests:{},quota:{month:day().slice(0,7),cancel:0,undo:0},freeDate:null,email:null};if(mode==='default'){s.cards=2;s.memories=[{id:id(),text:'喜欢简短、温和的回应',source:'演示用户的明确表达'}];s.goals=[{id:id(),title:'5天阅读小计划',status:'active',version:1,restores:0,createdAt:new Date().toISOString(),context:'已选好一本散文集，每晚有15分钟。',tasks:Array.from({length:5},(_,i)=>({id:id(),title:`阅读第${i*5+1}—${i*5+5}页`,date:plusDay(day(),i),reward:100,difficulty:'低',state:'ready',stage:0}))}]}return s}
const slots=s=>s.goals.filter(g=>['active','paused'].includes(g.status)).length;
const eligible=s=>s.cards===0&&s.coins<cfg.cardCost&&slots(s)===0;
function progress(g){const stages=[...new Set(g.tasks.map(t=>t.stage))];const completed=g.tasks.filter(t=>t.state==='done').length;const completedStages=stages.filter(st=>g.tasks.filter(t=>t.stage===st).every(t=>t.state==='done')).length;return{completed,total:g.tasks.length,stages:stages.length,completedStages,percent:Math.round(completed/g.tasks.length*100),goalPercent:Math.round(completedStages/stages.length*100)}}
function event(s,name,props={}){s.events.push({id:id(),at:new Date().toISOString(),userId:s.userId,name,...props});}
function change(s,coins,cards,reason,goalId){s.coins+=coins;s.cards+=cards;s.ledger.unshift({id:id(),at:new Date().toISOString(),coins,cards,balance:s.coins,cardBalance:s.cards,reason,goalId})}
function apply(original,action,p={},requestId=id(),today=day()){
const s=JSON.parse(JSON.stringify(original));if(s.requests[requestId])return{state:original,result:s.requests[requestId],duplicate:true};
if(s.quota.month!==today.slice(0,7))s.quota={month:today.slice(0,7),cancel:0,undo:0};
const fail=m=>{throw new Error(m)};let g=s.goals.find(x=>x.id===p.goalId),t=g?.tasks.find(x=>x.id===p.taskId),result={};
const requireGoal=()=>{if(!g)fail('目标不存在，请刷新后重试。')};
switch(action){
case 'purchaseClothes':{
const ids=[...new Set(p.ids||[])];if(!ids.length)fail('请先勾选要购买的装扮。');
const owned=s.ownedClothes||[];const items=ids.map(id=>W.items.find(i=>i.id===id));
if(items.some(i=>!i))fail('装扮不存在，请刷新。');if(ids.some(id=>owned.includes(id)))fail('已有装扮不可重复购买。');
const total=items.reduce((n,i)=>n+i.price,0);if(s.coins<total)fail('金币不足，还差 '+(total-s.coins)+' 金币。');
change(s,-total,0,'兑换装扮：'+items.map(i=>i.name).join('、'));s.ownedClothes=[...owned,...ids];result={total,ids};break;}
case 'saveOutfit':{
const outfit=p.outfit||{};for(const slot of W.slots){const value=outfit[slot];if(value===W.defaults[slot])continue;const item=W.items.find(i=>i.id===value&&i.slot===slot);if(!item||!(s.ownedClothes||[]).includes(value))fail('请先购买当前试穿的装扮，再保存。');}
s.outfit=Object.fromEntries(W.slots.map(slot=>[slot,outfit[slot]]));result={outfit:s.outfit};break;}
case 'create':{
if(s.goals.some(x=>x.draftId===p.draftId))return{state:original,result:{},duplicate:true};
if(slots(s)>=cfg.maxGoals)fail('进行中与暂停目标已达5个，请先完成或取消一个目标。');if(s.cards<1)fail('任务卡不足，请先兑换任务卡。');
if(!p.title?.trim()||!p.tasks?.length||p.tasks.some(x=>!x.title?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||!cfg.rewards.includes(x.reward)))fail('方案不完整，请返回修改。');
R.checkTasks(p.tasks);
g={id:id(),draftId:p.draftId,title:p.title.trim(),context:p.context||'',status:'active',version:1,restores:0,createdAt:new Date().toISOString(),tasks:p.tasks.map(x=>({...x,id:id(),state:'ready',stage:Number.isInteger(x.stage)&&x.stage>=0?x.stage:0}))};g.baseBudget=g.tasks.reduce((n,t)=>n+t.reward,0);g.configVersion='prd-6.3-v2';s.goals.push(g);change(s,0,-1,'创建目标',g.id);result={goalId:g.id};break;}
case 'start':requireGoal();if(g.status!=='active'||!t||t.state==='done')fail('当前任务不能开始。');t.state='running';t.startedAt=t.startedAt||new Date().toISOString();break;
case 'pauseAction':requireGoal();if(g.status!=='active'||t?.state!=='running')fail('任务当前不在进行中。');t.state='paused';break;
case 'complete':requireGoal();if(g.status!=='active'||!t)fail('目标已暂停或取消，不能提交完成。');if(p.version!==g.version)fail('计划已更新，请返回并重新打开任务。');if(t.state==='done')return{state:original,result:{},duplicate:true};if(t.state!=='running')fail('请先开始或继续本次行动。');t.state='done';t.completedAt=new Date().toISOString();t.selfReported=true;s.xp+=t.reward;change(s,t.reward,0,'完成：'+t.title,g.id);if(g.tasks.every(x=>x.state==='done'))g.status='completed';result={reward:t.reward,taskTitle:t.title,goalId:g.id};break;
case 'pause':requireGoal();if(g.status!=='active')fail('目标状态已变化。');g.tasks.filter(x=>x.state==='running').forEach(x=>x.state='paused');g.status='paused';break;
case 'resume':requireGoal();if(g.status!=='paused')fail('目标状态已变化。');g.status='active';break;
case 'cancel':requireGoal();if(!['active','paused'].includes(g.status))fail('此目标无法取消。');if(s.quota.cancel>=2)fail('本月2次取消机会已用完，仍可暂停。');g.previousStatus=g.status;g.status='cancelled';g.tasks.filter(x=>x.state==='running').forEach(x=>x.state='paused');g.cancelledAt=new Date().toISOString();s.quota.cancel++;break;
case 'undo':requireGoal();if(g.status!=='cancelled')fail('当前目标未取消。');if(g.restores>=1)fail('每个目标只能撤回一次。');if(s.quota.undo>=2)fail('本月2次撤回机会已用完。');if(slots(s)>=5)fail('目标名额已满，暂时不能撤回。');g.status=g.previousStatus||'active';g.restores++;s.quota.undo++;break;
case 'adjust':requireGoal();if(!['active','paused'].includes(g.status)||!t||t.state==='done')fail('仅可调整尚未完成的任务。');if(t.state==='running')fail('请先暂停本次行动，再调整安排。');if(p.version!==g.version)fail('计划已变化，请重新生成调整方案。');if(!p.title?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(p.date))fail('请填写任务内容与日期。');t.title=p.title.trim();t.date=p.date;g.version++;result={goalId:g.id};break;
case 'adjustBatch':{requireGoal();const checked=R.replacements(g,p,today);const ids=new Set(p.taskIds),at=g.tasks.findIndex(t=>ids.has(t.id));g.history=g.history||[];g.history.push({version:g.version,tasks:JSON.parse(JSON.stringify(g.tasks)),at:new Date().toISOString()});const replacements=checked.tasks.map(t=>({...t,id:id(),state:'ready'}));g.tasks=[...g.tasks.slice(0,at).filter(t=>!ids.has(t.id)),...replacements,...g.tasks.slice(at).filter(t=>!ids.has(t.id))];g.version++;result={budget:checked.budget,goalId:g.id};break;}
case 'review':{requireGoal();if(!t||t.state!=='done'||g.status==='cancelled')fail('仅可复盘有效已完成任务');const text=p.text?.trim();if(!text)fail('请先写下感想、收获或困难');const paid=!!t.reviewRewarded;t.review={text:text.slice(0,2000),at:new Date().toISOString()};let bonus=0;if(!paid){bonus=Math.floor(t.reward*0.2);s.xp+=bonus;change(s,bonus,0,'复盘：'+t.title,g.id);t.reviewRewarded=true;}result={bonus,goalId:g.id,taskId:t.id};break;}
case 'memorySync':{for(const m of p.ops||[]){if(m.op==='upsert'&&typeof p.userText==='string'&&p.userText.includes(m.quote)&&String(m.quote||'').length>=2){const old=m.topic==='other'?null:s.memories.find(x=>x.topic===m.topic);if(old){old.text=m.text;old.source=m.quote;old.updatedAt=new Date().toISOString()}else if(!s.memories.some(x=>x.text===m.text))s.memories.push({id:id(),topic:m.topic,text:m.text,source:m.quote,updatedAt:new Date().toISOString()});}if(m.op==='delete'&&/删除|删掉|忘掉|忘记|别再记|不要记/.test(p.userText||'')){s.memories=s.memories.filter(x=>!m.ids.includes(x.id));s.aiContextStart=s.messages.length;s.agentFlow={mode:'chat',data:{}};}}break;}
case 'exchange':if(s.coins<cfg.cardCost)fail('金币不足，需要500金币兑换1张任务卡。');change(s,-cfg.cardCost,1,'兑换任务卡');break;
case 'free':if(!eligible(s))fail('当前不满足免费基础行动条件。');if(s.freeDate===today)fail('今日奖励已领取，明天再来。');s.freeDate=today;change(s,100,0,'免费基础行动');result={reward:100,free:true,taskTitle:'整理桌面一角'};break;
case 'memoryAdd':if(!p.text?.trim())fail('请输入要记住的内容。');s.memories.push({id:id(),text:p.text.trim().slice(0,200),source:'用户明确表达'});break;
case 'memoryEdit':{const m=s.memories.find(x=>x.id===p.id);if(!m||!p.text?.trim())fail('记忆不存在或内容为空。');m.text=p.text.trim().slice(0,200);m.source='用户更正';s.aiContextStart=s.messages.length;s.agentFlow={mode:'chat',data:{}};break;}
case 'memoryDelete':s.memories=s.memories.filter(x=>x.id!==p.id);s.aiContextStart=s.messages.length;s.agentFlow={mode:'chat',data:{}};break;
default:fail('未知操作。');}
event(s,action+'_success',{goalId:g?.id,taskId:t?.id,version:g?.version,requestId});s.requests[requestId]=result;return{state:s,result};
}
const api={id,day,plusDay,cfg,seed,slots,eligible,progress,event,apply};if(typeof module!=='undefined')module.exports=api;else root.Myself=api;
})(typeof window!=='undefined'?window:globalThis);
