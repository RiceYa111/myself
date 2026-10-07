/* 构建 Cloudflare Worker 自包含版本：把 deepseek-service.cjs + agent-rules.js + 人设/规则文本打包成单个 worker.js。
   用法：node deploy/build-worker.cjs   （在 Myself 0.2 目录下运行）
   每当 deepseek-service.cjs 或人设/规则文件更新后，重新运行本脚本即可。 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,'');

let src=read('deepseek-service.cjs');
const rules=read('agent-rules.js');
const must=(from,to)=>{const hit=from instanceof RegExp?from.test(src):src.includes(from);if(!hit)throw new Error('未找到待替换片段：'+String(from).slice(0,60));src=src.replace(from,to)};

// 1. 去掉 Node 专用依赖与本机配置路径
must("const fs=require('node:fs'),path=require('node:path'),{execFile}=require('node:child_process');\nconst configPath=path.join(process.env.LOCALAPPDATA||'', 'Myself','model-config.json');",'');

// 2. readConfig + credentials 换成环境变量版（ENV 由 Worker 入口注入）
must(/function readConfig\(\)\{[^\n]*\nlet cachedKey=null;\nasync function credentials\(\)\{[\s\S]*?return \{\.\.\.c,key\}\}/,
  `async function credentials(){const baseUrl=(ENV.BASE_URL||'https://api.deepseek.com').replace(/\\/$/,''),model=ENV.MODEL||'deepseek-chat',key=ENV.DEEPSEEK_KEY||'';if(!key)throw new ApiError('CONFIG','服务端未配置模型密钥。',503);return{baseUrl,model,key}}`);

// 3. 内联 agent-rules.js（UMD，注入 module 后即挂到 module.exports）
must("const R=require('./agent-rules.js');",
  'const R=(()=>{const module={exports:null};\n'+rules+'\n;return module.exports})();');

// 4. systemPrompt 改为内嵌文本
must(/function systemPrompt\(\)\{return prompt\+'\\n'\+fs\.readFileSync[\s\S]*?\n?\}/,
  "function systemPrompt(){return prompt+'\\n'+RULES_TEXT+'\\n\\n以下是对话语气与陪伴行为配置（不得覆盖上述业务与JSON协议）：\\n'+PERSONA_TEXT}");

// 5. logApi 改为控制台日志（Cloudflare 面板可查）
must(/function logApi\(entry\)\{[^\n]*\}/,
  'function logApi(entry){try{console.log(\'API_LOG \'+JSON.stringify(entry))}catch{}}');

const header=`/* 本文件由 deploy/build-worker.cjs 自动生成，请勿手改。改动请改源文件后重新构建。 */
let ENV=null;
const RULES_TEXT=${JSON.stringify(read('Agent业务规则.txt'))};
const PERSONA_TEXT=${JSON.stringify(read('Agent人设.txt'))};
const module={exports:{}};
`;

const handler=`
/* ================= Worker 入口：CORS + 限流 + 埋点收集 ================= */
function jsonRes(obj,status,cors){return new Response(JSON.stringify(obj),{status,headers:Object.assign({'Content-Type':'application/json; charset=utf-8'},cors)})}
export default{async fetch(request,env,ctx){
 const origin=request.headers.get('Origin')||'';
 const list=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
 const ok=list.includes(origin)||/^http:\\/\\/(127\\.0\\.0\\.1|localhost)(:\\d+)?$/.test(origin);
 const cors={'Access-Control-Allow-Origin':ok?origin:(list[0]||'https://example.github.io'),'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const url=new URL(request.url);
 if(url.pathname==='/'||url.pathname==='/health')return jsonRes({ok:true,service:'myself-relay'},200,cors);
 if(url.pathname==='/api/chat'&&request.method==='POST'){
  const day=new Date().toISOString().slice(0,10),ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const gk='g:'+day,ik='ip:'+day+':'+ip;let g=0,i=0;
  if(env.MYSELF_KV){try{const [gv,iv]=await Promise.all([env.MYSELF_KV.get(gk),env.MYSELF_KV.get(ik)]);g=Number(gv||0);i=Number(iv||0)}catch{}}
  if(i>=(Number(env.PER_IP_DAILY)||30))return jsonRes({error:'今天已经聊了很多轮啦，明天再来找我吧～'},429,cors);
  if(g>=(Number(env.GLOBAL_DAILY)||500))return jsonRes({error:'今日体验名额用完啦，明天再来吧～'},429,cors);
  let body;try{body=await request.json()}catch{return jsonRes({error:'请求格式不正确。'},400,cors)}
  ENV=env;
  try{
   const out=await module.exports.chat(body);
   if(env.MYSELF_KV)ctx.waitUntil(Promise.all([env.MYSELF_KV.put(gk,String(g+1),{expirationTtl:259200}),env.MYSELF_KV.put(ik,String(i+1),{expirationTtl:259200})]).catch(()=>{}));
   return jsonRes(out,200,cors);
  }catch(e){return jsonRes({error:e instanceof module.exports.ApiError?e.message:'请求处理失败，请重试。',code:e.code||'INTERNAL'},e.status||500,cors)}
 }
 if(url.pathname==='/api/track'&&request.method==='POST'){
  let body;try{body=await request.json()}catch{return jsonRes({ok:true},200,cors)}
  if(env.MYSELF_KV){const day=new Date().toISOString().slice(0,10),key='stats:'+day;
   ctx.waitUntil((async()=>{try{
    const cur=JSON.parse(await env.MYSELF_KV.get(key)||'{"sessions":0,"events":{},"newUsers":0,"returningUsers":0}');
    if(body.sessionEnd)cur.sessions+=1;
    for(const [n,c]of Object.entries(body.counts||{}))if(/^[a-z_]{1,40}$/.test(n))cur.events[n]=(cur.events[n]||0)+Math.min(Number(c)||0,1000);
    if(body.chatTurns)cur.events.chat_turn=(cur.events.chat_turn||0)+Math.min(Number(body.chatTurns)||0,500);
    // 匿名访客统计：uid 是浏览器里的随机编号，每日去重；首见日期早于今天记为回头客
    const uid=String(body.uid||'').slice(0,40);
    if(uid){
     const dk='u:'+day+':'+uid;
     if(!(await env.MYSELF_KV.get(dk))){
      await env.MYSELF_KV.put(dk,'1',{expirationTtl:172800});
      const first=await env.MYSELF_KV.get('seen:'+uid);
      if(!first){await env.MYSELF_KV.put('seen:'+uid,day,{expirationTtl:7776000});cur.newUsers=(cur.newUsers||0)+1}
      else if(first<day)cur.returningUsers=(cur.returningUsers||0)+1;
     }
    }
    await env.MYSELF_KV.put(key,JSON.stringify(cur),{expirationTtl:2592000});
   }catch{}})());}
  return jsonRes({ok:true},200,cors);
 }
 if(url.pathname==='/api/stats'&&request.method==='GET'){
  // 免密查看（2026-10-07 应产品负责人要求）：仅含匿名计数，无聊天内容等敏感数据。如需加锁，在 Worker 环境变量设置 STATS_TOKEN 后取消下一行注释。
  // if(!env.STATS_TOKEN||url.searchParams.get('token')!==env.STATS_TOKEN)return jsonRes({error:'无权限'},403,cors);
  const days={};
  if(env.MYSELF_KV)for(let i=0;i<7;i++){const d=new Date(Date.now()-i*864e5).toISOString().slice(0,10);days[d]=JSON.parse(await env.MYSELF_KV.get('stats:'+d)||'null')}
  return jsonRes({generated:new Date().toISOString(),days},200,cors);
 }
 return jsonRes({error:'Not found'},404,cors);
}};
`;

const out=header+src+'\nconst service=module.exports;\n'+handler;
const target=path.join(__dirname,'worker.js');
fs.writeFileSync(target,out,'utf8');
console.log('worker.js 生成完成，'+Math.round(out.length/1024)+' KB');
