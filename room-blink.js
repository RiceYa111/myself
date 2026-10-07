(()=>{
const phone=document.getElementById('phone'),ns='http://www.w3.org/2000/svg',layer=document.createElementNS(ns,'svg');layer.classList.add('room-eye-layer');layer.setAttribute('viewBox','0 0 941 1672');layer.setAttribute('aria-hidden','true');
// One uniformly scaled face region replaces both original eyes and their outlines.
// No ellipse masks or independent stretching of each eye.
layer.innerHTML='<defs><clipPath id="blink-face"><polygon points="650,810 1140,810 1160,1010 1110,1140 940,1180 750,1140 650,1050"/></clipPath></defs><g transform="translate(329 1008) scale(.17)"><image clip-path="url(#blink-face)" href="assets/blink-open.webp" width="1664" height="2496"/></g>';
phone.querySelector('.scene').after(layer);
function fit(){const s=Math.max(phone.clientWidth/941,phone.clientHeight/1672);Object.assign(layer.style,{width:941*s+'px',height:1672*s+'px',left:(phone.clientWidth-941*s)/2+'px',top:(phone.clientHeight-1672*s)/2+'px'})}new ResizeObserver(fit).observe(phone);fit();
let timer,entered=false;const frame=n=>{layer.dataset.frame=n;layer.querySelector('image').setAttribute('href','assets/blink-'+n+'.webp')};
function cycle(delay=5730){clearTimeout(timer);frame('open');timer=setTimeout(()=>{if(document.hidden||route!=='room'||!document.getElementById('launch').hidden){cycle();return}frame('half');timer=setTimeout(()=>{frame('closed');timer=setTimeout(()=>{frame('half');timer=setTimeout(()=>cycle(),70)},130)},70)},delay)}
frame('open');document.addEventListener('myself-entered',()=>{entered=true;cycle(2000)});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);frame('open')}else if(entered)cycle()});
})();
