/* 埋点回传 2026-10-07：本地 localStorage 记录保持不变，另按会话批量上报到 Worker。
   只上报事件计数，不含聊天内容等任何隐私文本。本地开发（无 MYSELF_API_BASE）时自动关闭。 */
(function(){
'use strict';
const BASE=(['127.0.0.1','localhost'].includes(location.hostname))?'':(window.MYSELF_API_BASE||'');
const counts={};let chatTurns=0,pending=0;
window.reportEvent=function(name){counts[name]=(counts[name]||0)+1;if(name==='ai_response'){if(!chatTurns)counts['chat_session']=1;chatTurns++};if(++pending>=15){pending=0;flush(false)}};
function flush(end){
 if(!BASE)return;
 if(!Object.keys(counts).length&&!end)return;
 const payload={counts:Object.assign({},counts),chatTurns,sessionEnd:!!end,uid:(typeof state!=='undefined'&&state.userId)||''};
 for(const k of Object.keys(counts))delete counts[k];chatTurns=0;pending=0;
 try{navigator.sendBeacon(BASE+'/api/track',new Blob([JSON.stringify(payload)],{type:'text/plain'}))}catch(e){}
}
addEventListener('pagehide',()=>flush(true));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush(false)});
})();
