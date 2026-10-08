/* Real model adapter. Never silently falls back to canned replies. */
/* 线上部署 2026-10-08：Render 中转为主（国内可直连），Cloudflare Worker 兜底；本地开发仍用本机服务。 */
const API_BASES=(['127.0.0.1','localhost'].includes(location.hostname))?['']:[window.MYSELF_API_BASE,window.MYSELF_API_FALLBACK].filter(Boolean);
let aiBusy=false,aiRetry=null,aiStatus=null,aiError='',aiRetryContext=null;
function aiFailure(code,message,retryable=true){return Object.assign(new Error(message),{code,retryable})}
async function aiFetch(path,options={},timeout=10000){
 let lastErr=null;
 for(const base of API_BASES){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const response=await fetch(base+path,{...options,signal:controller.signal,cache:'no-store'});
   clearTimeout(timer);
   let result;try{result=await response.json()}catch{throw aiFailure('BAD_RESPONSE','对话服务暂时返回异常，请稍后再试。')}
   if(!response.ok)throw aiFailure(result.code||('HTTP_'+response.status),result.error||'对话服务暂时不可用。',![400,401,402,403,404,429].includes(response.status)&&!['CONFIG','UPSTREAM_400','UPSTREAM_401','UPSTREAM_402','UPSTREAM_404'].includes(result.code));
   return result;
  }catch(e){
   clearTimeout(timer);
   const err=(e.name==='AbortError'||e.name==='TimeoutError'||controller.signal.aborted)?aiFailure('TIMEOUT','等待回复超时，你的消息已保留。'):(e.code?e:aiFailure('NETWORK','暂时连不上对话服务，你的消息已保留。请检查网络后再试。'));
   // 只有网络/超时类故障才切换兜底节点；限流、配置错误等业务错误直接抛出
   if(!['TIMEOUT','NETWORK'].includes(err.code))throw err;
   lastErr=err;
  }
 }
 throw lastErr||aiFailure('NETWORK','暂时连不上对话服务，你的消息已保留。请检查网络后再试。');
}
const beforeAiAgent=agent;
agent=function(){let html=beforeAiAgent().replace('本地对话演示 · 尚未接入大模型 API',esc(aiStatus?.message||'正在检查对话服务…'));if(aiBusy)html=html.replace('<div class="agent-tools">','<div class="ai-wait" role="status">'+(flow().mode==='generating'?'正在帮你整理「'+esc(flow().data?.title||'这次目标')+'」的安排，马上好…':'Agent 正在听你说，也在认真整理…')+'</div><div class="agent-tools">');if(aiError)html=html.replace('<div class="agent-tools">','<div class="ai-wait" role="alert">'+esc(aiError)+'</div><div class="agent-tools">');if(aiRetry)html=html.replace('<div class="agent-tools">',btn('重试上一条消息','aiRetry','ai-retry')+'<div class="agent-tools">');return html};
const localStages=planStages;planStages=function(d){return Array.isArray(d.stages)?d.stages:localStages(d)};
newDraft=function(){aiRetry=null;aiRetryContext=null;aiError='';state.agentFlow={mode:'chat',data:{}};chatContext=null;state.aiTopicStart=state.messages.length;say('好呀，这次有什么想做的事？先说说你的想法就行。');go('agent');refreshChat(true)};
async function requestAi(mode,retryContext){const contextStart=state.aiContextStart||0;const current=flow();const context=retryContext||{mode,today:M.day(),messages:state.messages.slice(Math.max(state.aiContextStart||0,state.aiTopicStart||0)).filter(m=>!m.uiOnly&&!/^当前好像出了点小状况/.test(m.text||'')).slice(-24),memories:state.memories,summary:{slots:M.slots(state),cards:state.cards,cancelRemaining:qleft('cancel'),undoRemaining:qleft('undo')},goals:[...state.goals.filter(g=>['active','paused'].includes(g.status)),...state.goals.filter(g=>!['active','paused'].includes(g.status)).slice(-10)],draft:{mode:current.mode,data:current.data,goalId:chatContext}};aiRetryContext=JSON.parse(JSON.stringify(context));if(!['127.0.0.1','localhost'].includes(location.hostname)&&!API_BASES.length)throw aiFailure('CONFIG','对话服务尚未配置完成，请联系产品维护者。',false);const result=await aiFetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(context)},mode==='generate'?125000:80000);if((state.aiContextStart||0)!==contextStart)throw aiFailure('CONTEXT_CHANGED','记忆上下文已更新，请重新发送。',false);aiStatus={ready:true,message:'确认后才会更新计划'};track('ai_response',{model:result.meta?.model,durationMs:result.meta?.durationMs,tokens:result.meta?.tokens,kind:result.action});return result}
async function realTurn(mode='chat',retry=false){if(aiBusy)return;const retryContext=retry?aiRetryContext:null;aiBusy=true;aiRetry=null;aiError='';refreshChat();const turnEpoch=state.aiContextStart||0;let before=JSON.parse(JSON.stringify(flow()));try{let r=await requestAi(mode,retryContext);if(r.memoryOps?.length){const latest=state.messages.filter(m=>m.role==='user').at(-1)?.text||'';if(!transact('memorySync',{ops:r.memoryOps,userText:latest}))throw new Error('记忆保存失败，请重试。');}Object.assign(flow().data,r.facts||{});if(r.action==='ready'){flow().mode='generating';say('好，这就帮你整理「'+esc(flow().data?.title||'这次目标')+'」的安排…');refreshChat();state.messages.at(-1).uiOnly=true;before=JSON.parse(JSON.stringify(flow()));mode='generate';r=await requestAi('generate')}
if(mode==='generate'&&r.action!=='plan'&&r.action!=='chat')throw new Error('计划尚未生成成功，请重试。');
if(r.action==='plan'){state.agentFlow={mode:'review',data:r.plan,draftId:M.id()};say('我已经整理好啦，你觉得这样如何？有要修改的地方可以和我说哦。')}
else if(r.action==='memory'){state.agentFlow={mode:'chat',data:{}};say('已处理这次记忆删除；旧聊天不会再用于后续回复，正式计划与完成记录不受影响。')}
else if(r.action==='discard'){state.agentFlow={mode:'chat',data:{}};say(r.reply)}
else if(r.action==='adjust'){state.agentFlow={mode:'chat',data:{}};say('本版本暂未开放正式计划调整。你可以和我说说遇到的变化，我们先一起讨论，现有任务不会被修改。')}
else{if(flow().mode==='generating')flow().mode='chat';say(r.reply)}save()}
catch(e){state.agentFlow=(state.aiContextStart||0)===turnEpoch?before:{mode:'chat',data:{}};aiRetry=e.retryable===false?null:mode;aiError=e.message||'这次没有收到回复，你的消息已保留。';if(!aiRetry)aiError+=' 请稍后再试或联系产品维护者。';track('ai_error',{reason:e.code||'request_failed'});save()}
finally{aiBusy=false;if(route==='agent')refreshChat()}}
chatSend=async function(text){if(aiBusy)return toast('请等 Agent 回复后再发送。');text=text.trim();if(!text)return;if(offline||!navigator.onLine)return toast('当前离线，消息未发送。');if(/^记住[:：]/.test(text)){legacyChatSend(text);return}const input=document.querySelector('#chat-input');if(input)input.value='';state.messages.push({role:'user',text:text.slice(0,1500)});save();await realTurn()};
// Editing a draft stays a conversation, with the previous complete draft available as context.
document.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a==='aiRetry'&&aiRetry)realTurn(aiRetry,true);if(a==='editPlanReview'||a==='agentEdit'){flow().mode='chat';flow().pending=null;save()}},false);
const priorAdjustCard=conversationCard;conversationCard=function(){let html=priorAdjustCard();const f=flow();if(f.mode==='adjust'&&f.proposedDate)html=html.replace(/name="date" type="date" value="[^"]*"/,'name="date" type="date" value="'+esc(f.proposedDate)+'"');return html};
// Prevent goal switching/new requests while an answer is in flight.
document.addEventListener('click',e=>{if(!aiBusy){const a=e.target.closest('[data-action]')?.dataset.action;if(['agentCasual','agentDiscard','setContext','agentEdit','editPlanReview'].includes(a)){aiRetry=null;aiRetryContext=null;aiError='';}return;}const a=e.target.closest('[data-action]')?.dataset.action;if(['newGoal','agentCasual','agentDiscard','context','setContext','editPlanReview','agentEdit'].includes(a)){e.preventDefault();e.stopImmediatePropagation();toast('请等当前回复完成。')}},true);
async function checkAiStatus(){try{const s=await aiFetch('/api/status');aiStatus={ready:!!s.ready,message:s.ready?'确认后才会更新计划':'对话服务暂不可用，请稍后再试。'}}catch{aiStatus={ready:false,message:'暂时无法确认连接状态，发送消息时会重新连接。'}}if(route==='agent'&&!aiBusy)refreshChat(false)}
checkAiStatus();
render();

