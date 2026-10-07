(()=>{
const panel=document.getElementById('launch'),bar=panel.querySelector('[role=progressbar]'),fill=panel.querySelector('.launch-fill'),value=panel.querySelector('output'),status=panel.querySelector('.launch-status'),retry=panel.querySelector('button');
const manifest=window.MYSELF_STARTUP_ASSETS;
const info=document.createElement('p');info.className='launch-transfer';status.after(info);
let running=false,ready=false,entering=false,received=new Map(),done=new Set(),runBytes=0,lastBytes=0,lastTime=0,speed=0,autoAttempts=0,autoTimer,launchBlob;
const total=()=>manifest.reduce((n,a)=>n+a.bytes,0),mb=n=>(n/1048576).toFixed(2)+' MB';
function progress(n){bar.setAttribute('aria-valuenow',n);fill.style.width=n+'%';value.textContent=n+'%'}
function update(){const bytes=manifest.reduce((n,a)=>n+Math.min(received.get(a.src)||0,a.bytes),0);if(!ready)progress(Math.min(95,Math.floor(bytes/total()*95)));info.textContent=mb(bytes)+' / '+mb(total())+' · '+(running?(speed/1024).toFixed(0)+' KB/s':'已暂停')+'（资源读取）'}
const assetName=a=>({'launch-reference':'启动画面',room:'房间背景','home-reference':'房间界面','empty-reference':'空任务界面'}[a.src.split('/').pop().split('.')[0]]||'导航与头像');
const active=new Map();
async function load(a){
 const controller=new AbortController();let idle,deadline,expired=false,reader,url,keep=false;
 let stop;const timeout=new Promise((_,reject)=>{stop=reason=>{expired=true;controller.abort();if(reader)reader.cancel().catch(()=>{});reject(Error(reason))}});
 const arm=()=>{clearTimeout(idle);idle=setTimeout(()=>stop('下载停滞（20秒无数据）'),20000)};
 deadline=setTimeout(()=>stop('下载超时（60秒）'),60000);arm();
 received.set(a.src,0);active.set(a.src,assetName(a));
 const work=async()=>{
  const r=await fetch(a.src,{signal:controller.signal,cache:autoAttempts?'reload':'force-cache'});
  if(expired)return;if(!r.ok)throw Error('HTTP '+r.status);
  const chunks=[];let bytes=0;
  const append=data=>{if(expired)return;chunks.push(data);bytes+=data.byteLength;runBytes+=data.byteLength;received.set(a.src,bytes);arm();update()};
  if(r.body?.getReader){reader=r.body.getReader();while(!expired){const v=await reader.read();if(v.done)break;append(v.value)}}else append(await r.arrayBuffer());
  if(expired)return;if(!bytes)throw Error('图片内容为空');clearTimeout(idle);
  active.set(a.src,assetName(a)+'（解码中）');url=URL.createObjectURL(new Blob(chunks,{type:r.headers.get('content-type')||'image/webp'}));
  await new Promise((resolve,reject)=>{const im=new Image();const t=setTimeout(()=>reject(Error('图片解码超时')),10000);im.onload=()=>{clearTimeout(t);resolve()};im.onerror=()=>{clearTimeout(t);reject(Error('图片格式解码失败'))};im.src=url});
  if(expired)return;
  if(a.src.includes('launch-reference')){if(launchBlob)URL.revokeObjectURL(launchBlob);launchBlob=url;keep=true;panel.querySelector('img').src=url}
  received.set(a.src,a.bytes);done.add(a.src);update();
 };
 try{await Promise.race([work(),timeout])}finally{expired=true;clearTimeout(idle);clearTimeout(deadline);controller.abort();active.delete(a.src);if(url&&!keep)URL.revokeObjectURL(url)}
}
async function run(){if(running||ready)return;clearTimeout(autoTimer);running=true;retry.hidden=true;status.textContent='正在加载房间与角色…';lastTime=performance.now();lastBytes=runBytes;const ticker=setInterval(()=>{const now=performance.now();speed=(runBytes-lastBytes)/((now-lastTime)/1000);lastBytes=runBytes;lastTime=now;update();if(active.size)status.textContent='正在读取：'+[...active.values()].join('、')},500);try{if(!navigator.onLine){const e=Error('当前离线，联网后将自动继续');e.offline=true;throw e;}const queue=manifest.filter(a=>!done.has(a.src)),failures=[];await Promise.all([0,1].map(async()=>{while(queue.length){const a=queue.shift();try{await load(a)}catch(e){failures.push({asset:a,error:e});received.set(a.src,0)}}}));if(failures.length){const e=Error(failures.some(f=>f.error.message==='HTTP 404')?'配套图片尚未发布完整':assetName(failures[0].asset)+'：'+failures[0].error.message);e.retryable=true;throw e;}status.textContent='正在恢复游戏进度…';if(document.fonts?.ready)await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,3000))]);if(typeof state==='undefined'||!state.userId)throw Error('初始化未完成，请刷新重试');if(!save())throw Error('无法保存进度，请检查浏览器存储空间');route='room';render();ready=true;progress(100);status.textContent='点击屏幕进入游戏';info.textContent=mb(total())+' / '+mb(total())+' · 已就绪';panel.tabIndex=0;panel.focus()}catch(e){status.textContent=e.message;if(e.retryable&&autoAttempts<2){const delay=[2000,5000][autoAttempts++];status.textContent+='，'+delay/1000+'秒后自动重试';autoTimer=setTimeout(run,delay)}else if(!e.offline){retry.hidden=false;retry.textContent='重新检查';if(e.retryable)status.textContent+='。请检查图片上传或网络连接。'}}finally{running=false;clearInterval(ticker);if(!ready)update()}}
async function enter(){if(!ready||entering)return;entering=true;panel.classList.add('leaving');await new Promise(r=>setTimeout(r,450));panel.hidden=true;document.getElementById('phone').classList.remove('launch-active');document.dispatchEvent(new Event('myself-entered'))}
panel.addEventListener('click',e=>{if(e.target!==retry)enter()});panel.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enter()}});retry.addEventListener('click',()=>{autoAttempts=0;run()});window.addEventListener('online',()=>{autoAttempts=0;run()});document.getElementById('phone').classList.add('launch-active');run();
})();

