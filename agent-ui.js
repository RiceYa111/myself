/* Local guided conversation prototype. No remote model is connected. */
const welcome='今天想聊聊什么？有什么新的计划或者分享，都可以说给我听。';
const fields=[['title','你想实现什么目标？希望最后达到什么结果？'],['foundation','你现在的基础或执行情况怎么样？'],['time','你每天能留出多少时间？哪个时段比较方便？'],['days','这次想先安排多少天？请填写 1—30 天。'],['obstacle','有什么现实困难或其他安排需要避开吗？没有也可以告诉我。'],['action','我们把第一步说具体：每天做什么、做到什么程度算完成？例如“阅读5页”。']];
function flow(){return state.agentFlow||(state.agentFlow={mode:'chat',data:{},pending:null})}
function say(text){state.messages.push({role:'assistant',text});save()}
function agentTop(){return '<div class="agent-banner">'+pixelArt('agent')+'<div><h2>Agent</h2><small>陪你把目标变成行动</small></div></div>'+btn('◷ 历史记录','agentHistory','agent-history')}
function conversationCard(){const f=flow();if(f.mode==='review'){const d=f.data;return '<section class="agent-confirm"><h3>▤ 计划确认表</h3><p class="caption">本地演示草稿 · 确认后才会创建目标</p><form id="agent-plan-form"><label class="field">目标<input name="title" value="'+esc(d.title)+'" required maxlength="60"></label><div class="agent-facts">已有基础：'+esc(d.foundation)+'<br>可用时间：'+esc(d.time)+'<br>现实限制：'+esc(d.obstacle)+'</div><label class="field">当日及每日安排<input name="action" value="'+esc(d.action)+'" required maxlength="100"></label><div class="agent-form-row"><label class="field">开始日期<input name="date" type="date" value="'+esc(d.date||M.day())+'" required></label><label class="field">安排天数<input name="days" type="number" min="1" max="30" value="'+d.days+'" required></label></div><div class="agent-facts">阶段安排：第一阶段，按每日行动建立节奏。<br>总安排：'+d.days+' 天，每日 1 项，共 '+d.days+' 项。<br>演示基础奖励：每项 100 经验、100 金币。<br>创建消耗：1 张任务卡；当前占用 '+M.slots(state)+'/5。</div><p class="caption">本地版本仅演示单阶段安排与低难度初始值，可返回补充；真实拆解与难度评定待接入模型。</p><div class="actions">'+btn('继续修改','agentEdit')+'<button class="primary" type="submit">确认创建</button></div></form></section>'}
if(f.mode==='adjust'){const g=goal(f.goalId),tasks=g?.tasks.filter(t=>t.state!=='done')||[];if(!tasks.length)return '<div class="agent-confirm">当前目标没有可调整的任务。</div>';const t=tasks.find(t=>t.id===f.taskId)||tasks[0];return '<section class="agent-confirm"><h3>▤ 任务安排调整</h3><form id="agent-adjust-form"><label class="field">本次调整的任务<select id="agent-task-choice" name="taskId">'+tasks.map(x=>'<option value="'+x.id+'" '+(x.id===t.id?'selected':'')+'>'+esc(x.title)+'</option>').join('')+'</select></label><div class="agent-facts">当前：'+esc(t.title)+' · '+t.date+'</div><label class="field">修改为<input name="title" value="'+esc(f.proposed||t.title)+'" required maxlength="100"></label><label class="field">计划日期<input name="date" type="date" value="'+t.date+'" required></label><div class="agent-facts">✓ 其余任务保持不变<br>✓ 已完成记录与奖励不变<br>✓ 本项奖励仍为 '+t.reward+' 经验 / 金币</div><p class="caption">确认后才会更新计划。</p><div class="actions">'+btn('暂不调整','agentDiscard')+'<button type="submit" class="primary">确认调整</button></div></form></section>'}return ''}
agent=function(){const f=flow();return '<section class="agent-window" aria-label="Agent对话窗口"><div class="agent-topic"><span>'+esc(chatContext?goal(chatContext)?.title||'日常交流':f.mode==='chat'?'日常交流':'新目标规划中')+'</span>'+btn('切换','context','subtle')+'</div><div class="agent-thread" aria-live="polite"><div class="agent-message"><div class="chat-portrait">'+pixelArt('agent')+'</div><div class="agent-bubble">'+welcome+'</div></div>'+state.messages.slice(-30).map(m=>'<div class="agent-message '+(m.role==='user'?'from-user':'')+'"><div class="chat-portrait">'+pixelArt(m.role==='user'?'avatar':'agent')+'</div><div class="agent-bubble">'+esc(m.text)+'</div></div>').join('')+conversationCard()+'</div><div class="agent-tools">'+btn('✧ 新建目标','newGoal')+btn('♡ 聊聊近况','agentCasual')+btn('我被记住的事','memories')+'</div><form id="chat-form" class="agent-composer"><textarea id="chat-input" placeholder="说说你的想法…" aria-label="和Agent说说你的想法" rows="2" maxlength="500" required></textarea><button class="primary" type="submit" aria-label="发送消息">➤</button></form><small class="agent-disclaimer">本地对话演示 · 尚未接入大模型 API</small></section>'}
// Preserve a reader's position on passive renders; new turns deliberately reveal the latest message.
const renderBeforeChatScroll=render;
render=function(){const old=document.querySelector('.agent-thread'),position=old?.scrollTop,input=document.querySelector('#chat-input'),value=input?.value||'';renderBeforeChatScroll();const el=document.querySelector('.agent-thread');if(el){el.scrollTop=position===undefined?el.scrollHeight:position;const next=document.querySelector('#chat-input');if(next)next.value=value;}if(document.getElementById('plan-review-root')){for(const sel of ['.agent-window','#nav','#top']){const node=document.querySelector(sel);if(node)node.inert=true;}}};
function refreshChat(toEnd=true){render();if(toEnd){const el=document.querySelector('.agent-thread');if(el)el.scrollTop=el.scrollHeight;requestAnimationFrame(()=>{const latest=document.querySelector('.agent-thread');if(latest)latest.scrollTop=latest.scrollHeight;});}}
newDraft=function(){state.agentFlow={mode:'clarify',data:{},pending:'title'};chatContext=null;say(fields[0][1]);go('agent')};
const legacyChatSend=chatSend;
chatSend=function(text){const content=text.trim();if(!content)return;if(offline||!navigator.onLine)return toast('当前离线，消息未发送。');if(/^记住[:：]|记得|偏好/.test(content)){legacyChatSend(content);refreshChat();return}state.messages.push({role:'user',text:content});const f=flow();const matched=state.goals.filter(g=>['active','paused'].includes(g.status)&&content.includes(g.title));if(matched.length===1)chatContext=matched[0].id;
if(/只是分享|先不做计划|先聊聊|不想制定计划/.test(content)){say('好，先不做安排。我在听，你愿意多说一点吗？');refreshChat();return}
if(/生成.*计划|生成.*表|可以.*计划/.test(content)&&f.mode==='clarify'&&f.pending){say('可以，我们先补充一下：'+fields.find(x=>x[0]===f.pending)[1]);refreshChat();return}
if(/调整|改计划|缩短|改成|改为/.test(content)&&f.mode==='chat'){const gs=state.goals.filter(g=>['active','paused'].includes(g.status)),g=goal(chatContext)|| (gs.length===1?gs[0]:null);if(!g){say(gs.length?'先通过上方“切换”选择要调整的目标，再告诉我需要怎么改。':'目前还没有可调整的目标。你可以先和我聊聊想做什么。')}else{chatContext=g.id;Object.assign(f,{mode:'adjust',goalId:g.id,version:g.version,taskId:null,proposed:null});say('我们先确认要调整的任务、内容和日期。其他安排与奖励保持不变。')} }
else if(f.mode==='adjust'){f.proposed=content.replace(/^.*?(改成|改为)/,'').trim();say('已放入修改草稿，请核对下面的任务与日期，确认后才会更新。')}
else if(f.mode==='clarify'||f.mode==='review'||/我想.*(习惯|学习|阅读|读书|运动|提升|考试|计划|完成)|制定.*计划|生成.*计划|新目标/.test(content)){if(f.mode==='chat'){f.mode='clarify';f.data={title:content};f.pending=null} else if(f.pending){if(f.pending==='days'){const n=content.match(/\d+/);if(!n||+n[0]<1||+n[0]>30){say('本地演示请先安排 1—30 天，例如“5天”。');refreshChat();return}f.data.days=+n[0]}else f.data[f.pending]=content;f.pending=null}
const missing=fields.find(([k])=>!f.data[k]);if(missing){f.mode='clarify';f.pending=missing[0];say(missing[1])}else{beginPlanGeneration(f)}}
else{say(/开心|成功|完成|高兴/.test(content)?'听起来这件事让你很开心。最让你有成就感的是哪个瞬间？':/累|难过|烦|压力/.test(content)?'听起来你现在有些累。我们可以先不安排任务，你愿意说说今天发生了什么吗？':'我在听。你想继续说说这件事，还是聊聊它带给你的感受？')}track('chat_reply',{mode:'rule-demo',goalId:chatContext||undefined});refreshChat()};
document.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a==='agentHistory')openModal('历史记录','<div class="agent-history-list">'+(state.messages.map(m=>'<p><b>'+(m.role==='user'?'我':'Agent')+'：</b>'+esc(m.text)+'</p>').join('')||'<p>还没有聊天记录。</p>')+'</div>',null);if(a==='agentCasual'||a==='agentDiscard'){state.agentFlow={mode:'chat',data:{},pending:null};say('好呀，你有什么想分享的事都可以说，我都很乐意听～开心事、小烦恼、哪怕是今天吃了什么，都行。');refreshChat()}if(a==='agentEdit'){flow().mode='clarify';flow().pending='action';say('你想把每日行动改成什么？也可以在确认表里直接修改目标、日期和天数。');refreshChat()}});
document.addEventListener('change',e=>{if(e.target.id==='agent-task-choice'){flow().taskId=e.target.value;flow().proposed=null;save();refreshChat()}});
document.addEventListener('submit',e=>{if(!['agent-plan-form','agent-adjust-form'].includes(e.target.id))return;e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),f=flow();if(e.target.id==='agent-plan-form'){const days=Number(d.days);if(!Number.isInteger(days)||days<1||days>30)return toast('请填写1—30天。');const r=transact('create',{title:d.title,draftId:f.draftId,context:[f.data.foundation,f.data.time,f.data.obstacle].join('；'),tasks:Array.from({length:days},(_,i)=>({title:d.action,date:M.plusDay(d.date,i),difficulty:'低',reward:100}))},f.draftId);if(r){chatContext=r.result.goalId;state.agentFlow={mode:'chat',data:{}};say('行动创建成功，已消耗1张任务卡。你可以在计划窗口查看安排，准备好了再开始。');refreshChat()}}else{const r=transact('adjust',{goalId:f.goalId,taskId:d.taskId,title:d.title,date:d.date,version:f.version});if(r){state.agentFlow={mode:'chat',data:{}};say('安排已更新，其他任务和奖励保持不变。');refreshChat()}}});
render();
// Desktop shortcut: Enter sends; Shift+Enter inserts a line. IME confirmation must never send.
const chatComposing=new WeakSet(),chatCompositionEnded=new WeakMap();
document.addEventListener('compositionstart',e=>{if(e.target.id==='chat-input')chatComposing.add(e.target)});
document.addEventListener('compositionend',e=>{if(e.target.id==='chat-input'){chatComposing.delete(e.target);chatCompositionEnded.set(e.target,performance.now())}});
document.addEventListener('keydown',e=>{
 const input=e.target;
 if(input.id!=='chat-input'||e.key!=='Enter'||e.shiftKey||e.ctrlKey||e.altKey||e.metaKey)return;
 if(e.isComposing||e.keyCode===229||chatComposing.has(input)||performance.now()-(chatCompositionEnded.get(input)??-Infinity)<60)return;
 e.preventDefault();
 if(e.repeat||!input.value.trim()||input.closest('[inert]'))return;
 input.form?.requestSubmit();
});

// 【新手开场 2026-10-07】首次进入 Agent 页自动发出介绍气泡（写死文案，不调模型），同一浏览器只发一次。
const beforeGreetGo=go;
go=function(r){
 beforeGreetGo(r);
 if(r==='agent'&&!state.agentGreeted){
  state.agentGreeted=true;
  ['嗨，我是 Myself 的 Agent，你的成长搭子～',
   '我能做两件事：陪你随便聊聊——开心的烦的都可以说；也能帮你把想做的事排成能落地的小计划。你随口说的喜好我会悄悄记住，越聊越懂你。',
   '那……最近有什么想做的事，或者想聊的？随便开头就行。'
  ].forEach(t=>state.messages.push({role:'assistant',text:t}));
  save();track('agent_greeting_shown');
  if(route==='agent'&&typeof refreshChat==='function')refreshChat(true);else render();
 }
};
