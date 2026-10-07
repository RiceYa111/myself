import worker from './worker.js';
const mk=()=>{const m=new Map();return{get:async k=>m.has(k)?m.get(k):null,put:async(k,v)=>m.set(k,v)}};
const env={DEEPSEEK_KEY:'sk-x',MODEL:'deepseek-chat',ALLOWED_ORIGINS:'https://example.github.io',MYSELF_KV:mk()};
let p;const ctx={waitUntil:x=>p=x};
await worker.fetch(new Request('https://w.dev/api/track',{method:'POST',body:JSON.stringify({uid:'u1',sessionEnd:true,chatTurns:3})}),env,ctx);await p;
const s=await worker.fetch(new Request('https://w.dev/api/stats'),env,{waitUntil(){}});
const d=await s.json();
console.log('免密stats:',s.status,'(期望200)');
console.log('数据:',JSON.stringify(Object.values(d.days)[0]));
