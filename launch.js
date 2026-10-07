(()=>{
const panel=document.getElementById('launch'),bar=panel.querySelector('[role=progressbar]'),fill=panel.querySelector('.launch-fill'),value=panel.querySelector('output'),status=panel.querySelector('.launch-status'),retry=panel.querySelector('button');
// 进房间必需的 10 项（共约 1.1MB，字节数为构建时实测）；启动大图由 HTML <img> 直接加载不重复下载
const manifest=[
{src:'assets/nav-plans.webp',bytes:17924},
{src:'assets/nav-bag.webp',bytes:21066},
{src:'assets/nav-agent.webp',bytes:22150},
{src:'assets/nav-room.webp',bytes:26068},
{src:'assets/wardrobe/avatar-original.png',bytes:28775},
{src:'assets/blink-half.webp',bytes:173388},
{src:'assets/blink-closed.webp',bytes:174334},
{src:'assets/blink-open.webp',bytes:180350},
{src:'assets/home-reference.webp',bytes:213852},
{src:'assets/room.webp',bytes:256596}];
const deferred=['assets/empty-reference.webp','assets/plans-reference.webp','assets/growth-reference.webp','assets/recap-reference.webp'];
const totalBytes=manifest.reduce((n,a)=>n+a.bytes,0);
let running=false,ready=false,entering=false,loadedBytes=0,startedAt=0,ticker=null;
const detail=document.createElement('p');detail.className='launch-detail';status.insertAdjacentElement('afterend',detail);
function progress(n){bar.setAttribute('aria-valuenow',n);fill.style.width=n+'%';value.textContent=n+'%'}
function fmtBytes(n){return n>=1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB'}
function fmtSpeed(bps){return bps>=1048576?(bps/1048576).toFixed(1)+' MB/s':Math.max(1,Math.round(bps/1024))+' KB/s'}
function tick(){const elapsed=(Date.now()-startedAt)/1000;let t=fmtBytes(loadedBytes)+' / '+fmtBytes(totalBytes);if(elapsed>0.5&&loadedBytes>0){const speed=loadedBytes/elapsed;t+=' · '+fmtSpeed(speed);const left=(totalBytes-loadedBytes)/speed;if(left>1)t+=' · 预计还需 '+(left>60?Math.ceil(left/60)+' 分钟':Math.ceil(left)+' 秒')}detail.textContent=t}
function startTicker(){stopTicker();ticker=setInterval(tick,500)}
function stopTicker(){if(ticker){clearInterval(ticker);ticker=null}}
function load(src,onBytes){return new Promise(async(resolve,reject)=>{
const ctrl=new AbortController();const timeout=setTimeout(()=>{ctrl.abort();reject(new Error('加载超时'))},20000);
try{
 const res=await fetch(src,{signal:ctrl.signal});
 if(!res.ok)throw new Error('资源加载失败');
 let blob;
 if(res.body&&res.body.getReader){
  const reader=res.body.getReader(),chunks=[];
  for(;;){const{done,value}=await reader.read();if(done)break;chunks.push(value);if(onBytes)onBytes(value.byteLength)}
  blob=new Blob(chunks);
 }else{
  blob=await res.blob();if(onBytes)onBytes(blob.size);
 }
 clearTimeout(timeout);
 const url=URL.createObjectURL(blob);
 const im=new Image();
 im.onload=()=>{URL.revokeObjectURL(url);(im.decode?im.decode():Promise.resolve()).then(resolve,reject)};
 im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('图片解码失败'))};
 im.src=url;
}catch(e){clearTimeout(timeout);reject(e.name==='AbortError'?new Error('加载超时'):e)}})}
async function loadWithRetry(src,onBytes){let lastErr;for(let i=0;i<3;i++){let got=0;try{await load(src,n=>{got+=n;if(onBytes)onBytes(n)});return}catch(e){if(onBytes&&got)onBytes(-got);lastErr=e;await new Promise(r=>setTimeout(r,600*(i+1)))}}throw lastErr}
function prefetchLater(){const go=()=>deferred.forEach(src=>{const im=new Image();im.src=src});if('requestIdleCallback'in window)requestIdleCallback(go,{timeout:5000});else setTimeout(go,1500)}
async function run(){if(running)return;running=true;ready=false;retry.hidden=true;progress(0);loadedBytes=0;startedAt=Date.now();detail.textContent='0 KB / '+fmtBytes(totalBytes);status.textContent='正在加载房间与角色…';startTicker();try{if(!navigator.onLine)throw new Error('请连接网络后重试');let idx=0;const bump=()=>progress(Math.min(99,Math.floor(loadedBytes/totalBytes*100)));const worker=async()=>{while(idx<manifest.length){const a=manifest[idx++];await loadWithRetry(a.src,n=>{loadedBytes+=n;bump()});bump();tick()}};await Promise.all([worker(),worker(),worker(),worker()]);stopTicker();await document.fonts.ready;if(typeof state==='undefined'||!state.userId)throw new Error('初始化未完成，请刷新重试');if(!save())throw new Error('无法保存进度，请检查浏览器存储空间');route='room';render();progress(100);detail.textContent=fmtBytes(totalBytes)+' / '+fmtBytes(totalBytes);status.textContent='点击屏幕进入游戏';ready=true;panel.tabIndex=0;panel.focus();}catch(e){stopTicker();status.textContent=e.message+'，点击重试';retry.hidden=false}finally{running=false}}
async function enter(){if(!ready||entering)return;entering=true;prefetchLater();panel.classList.add('leaving');await new Promise(r=>setTimeout(r,450));panel.hidden=true;document.getElementById('phone').classList.remove('launch-active');document.dispatchEvent(new Event('myself-entered'));}
panel.addEventListener('click',e=>{if(e.target===retry)return;enter()});panel.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enter()}});retry.addEventListener('click',run);document.getElementById('phone').classList.add('launch-active');run();
})();
