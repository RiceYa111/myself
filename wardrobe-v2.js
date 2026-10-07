/* 2026-10-06: supplied standing assets; homepage keeps its original seated character. */
wearCategory='top';wearSelected=null;wearDraft=null;
const wearCategories=[['top','上装'],['bottom','下装'],['head','装饰'],['tools','道具']];
function v2Image(file,x=0,y=0,w=1664,h=2496){return `<image href="assets/wardrobe/v2/${file}.png" x="${x}" y="${y}" width="${w}" height="${h}"/>`}
function v2Layer(item){if(!item)return '';const a=item.anchor;return `<svg x="${a[0]}" y="${a[1]}" width="${a[2]}" height="${a[3]}" viewBox="${item.bbox.join(' ')}" preserveAspectRatio="none">${v2Image(item.file.split('/').pop().replace('.png',''))}</svg>`}
let wearClipSerial=0;
wearCharacter=function(outfit=savedWear()){
 const top=wearItem(outfit.top)||wearItem('base-top'),bottom=wearItem(outfit.bottom)||wearItem('base-bottom'),head=wearItem(outfit.head);
 const src=n=>n?'set-'+n:'home';
 const image=n=>`<image href="assets/wardrobe/v2/${src(n)}.png" width="1280" height="1920"/>`;
 const clip=(n,points,dy=0)=>{const id='wear-part-'+(++wearClipSerial);return `<defs><clipPath id="${id}"><polygon points="${points}"/></clipPath></defs><g transform="translate(0 ${dy})"><g clip-path="url(#${id})">${image(n)}</g></g>`};
 // Each upper layer includes its own original sleeves and hands. No transplanted hands.
 const upper={
 0:'0,690 440,690 520,655 600,690 675,735 730,685 810,690 1280,690 1280,1330 845,1330 845,1235 790,1240 730,1230 635,1245 560,1235 480,1250 480,1330 0,1330',
 1:'0,725 430,725 500,675 585,710 680,785 735,725 820,725 1280,725 1280,1390 865,1390 865,1290 820,1295 795,1190 720,1210 660,1260 640,1345 470,1345 455,1290 455,1390 0,1390',
 2:'0,735 445,735 475,675 555,690 620,725 690,735 735,705 810,735 1280,735 1280,1370 850,1370 850,1295 810,1310 785,1190 700,1200 640,1360 575,1355 510,1540 465,1530 500,1350 445,1320 445,1370 0,1370',
 3:'0,735 445,735 475,675 555,690 620,725 690,735 735,705 810,735 1280,735 1280,1370 850,1370 850,1300 810,1310 785,1190 700,1200 635,1360 580,1350 510,1540 465,1530 500,1350 445,1320 445,1370 0,1370',
 4:'0,625 400,625 485,580 550,610 650,645 735,595 815,625 1280,625 1280,1350 890,1350 890,1220 850,1180 800,1190 750,1090 685,1100 670,1200 540,1195 515,1310 450,1325 0,1350',
 5:'0,765 420,765 490,695 590,725 675,780 735,720 815,765 1280,765 1280,1380 875,1380 875,1245 825,1235 810,1175 730,1185 680,1235 575,1250 550,1465 505,1485 420,1450 445,1360 0,1380'
 };
 const lower={0:'465,1200 855,1200 855,1370 1000,1600 1100,1920 300,1920 350,1600 465,1370',1:'440,1180 875,1180 875,1380 1040,1920 290,1920 380,1380',2:'440,1180 875,1180 875,1400 1040,1920 290,1920 380,1400',3:'440,1180 875,1180 875,1400 1040,1920 290,1920 380,1400',4:'470,1090 880,1090 880,1370 1050,1920 280,1920 380,1400',5:'430,1170 880,1170 880,1400 1040,1920 290,1920 365,1500'};
 const headShape={0:'0,0 1280,0 1280,650 840,650 800,660 745,670 675,670 620,680 570,660 520,660 505,695 450,680 440,645 0,645',1:'0,0 1280,0 1280,680 835,680 780,705 700,715 620,700 560,675 520,690 470,695 445,670 0,670',2:'0,0 1280,0 1280,650 850,650 790,675 690,690 610,665 565,655 535,695 495,705 465,680 430,655 0,655',3:'0,0 1280,0 1280,650 850,650 790,675 690,690 610,665 565,655 535,695 495,705 465,680 430,655 0,655',4:'0,0 1280,0 1280,550 850,550 790,595 680,610 595,590 550,575 515,610 465,595 435,555 0,555',5:'0,0 1280,0 1280,675 850,675 785,710 685,725 590,700 555,685 525,720 480,710 435,680 0,680'};
 const pants=item=>{const n=item.set||0;const boxes=[[380,1200,580,690],[355,1180,655,710],[345,1180,655,710],[345,1180,655,710],[355,1090,660,800],[355,1175,630,715]];const a=[...boxes[n]];if(top.set===4){a[3]+=a[1]-1090;a[1]=1090}return `<svg x="${a[0]}" y="${a[1]}" width="${a[2]}" height="${a[3]}" viewBox="${item.bbox.join(' ')}" preserveAspectRatio="none"><image href="${item.file}" width="1664" height="2496"/></svg>`};
 let body;
 if(top.id==='base-top'&&bottom.id==='base-bottom'&&!head)body=image(0);
 else if(top.set&&top.set===bottom.set&&head?.set===top.set&&head.set<4)body=image(top.set);
 else {const tn=top.set||0,bn=bottom.set||0,hn=head?.set||0;body=pants(bottom)+clip(tn,upper[tn])+(hn>=4?clip(0,headShape[0])+clip(hn,hn===4?'275,390 295,240 350,170 520,65 625,45 710,85 765,130 735,200 605,235 530,305 500,345 435,395 370,420 300,405':'220,435 225,355 275,285 340,230 420,180 560,120 660,105 715,145 800,150 825,200 715,245 630,280 560,335 535,385 550,440 520,470 430,445 405,465 385,535 335,525 325,450 280,455'):clip(hn,headShape[hn]))}
 return `<svg class="wear-character" viewBox="190 0 900 1900" role="img" aria-label="角色试穿预览" data-outfit="${esc(JSON.stringify(outfit))}">${body}</svg>`;
};

wearThumb=function(item,slot=wearCategory){if(!item)return '<span class="wear-no-decoration">◇</span>';return `<svg viewBox="0 0 100 100" aria-hidden="true">${wearCrop(item.file,item.bbox,item.size)}</svg>`};
wearPage=function(isShop){
 wearDraft=wearDraft||savedWear();if(wearTool)wearCategory='tools';const slot=wearCategory==='tools'?'top':wearCategory,selected=wearItem(wearSelected)||wearItem(wearDraft[slot]),pending=WC.slots.some(s=>!wearOwned(wearDraft[s]));
 const items=WC.items.filter(i=>i.slot===wearCategory&&(isShop||wearOwned(i.id)));
 const ownedCount=WC.items.filter(i=>wearOwned(i.id)).length;
 const tools=wearCategory==='tools';
 const current=WC.slots.map(s=>wearItem(wearDraft[s]));
 const card=(i)=>{const worn=savedWear()[i.slot]===i.id,trying=wearDraft[i.slot]===i.id,owned=wearOwned(i.id);return `<button class="wear-product ${trying?'chosen':''}" data-action="wearTry" data-id="${i.id}" data-slot="${i.slot}">${wearThumb(i)}<span class="wear-product-copy"><strong>${esc(i.name)}</strong><small>${isShop?(owned?'已拥有':pixelArt('coin')+' '+i.price):worn?'✓ 已穿戴':trying?'试穿中':'已拥有'}</small>${isShop?`<span class="wear-product-cta">${owned?'试穿':'试穿 · 兑换'}</span>`:''}</span></button>`};
 return `<div class="wear-stage ${isShop?'is-shop':'is-bag'}"><div class="wear-platform"></div><div class="wear-avatar">${wearCharacter(wearDraft)}</div><section class="wear-preview"><h2>${isShop?'试穿预览':'当前装扮'}</h2>${isShop?`<div class="wear-selected-item">${wearThumb(selected)}<div><b>${selected?esc(selected.name):'默认居家装扮'}</b><small>${selected?esc(selected.series):''}</small><p>${selected&&!wearOwned(selected.id)?pixelArt('coin')+' '+selected.price:'已拥有'}</p></div></div>`:`<div class="wear-slots">${['top','bottom','head'].map(s=>btn(wearThumb(wearItem(wearDraft[s]),s)+`<small>${({top:'上装',bottom:'下装',head:'装饰'})[s]}</small>`,'wearSlot',wearCategory===s?'chosen':'',`data-slot="${s}"`)).join('')}</div>`}<p class="wear-preview-caption">${pending?'当前含未拥有装扮': '选择物品，搭配今天的自己'}</p><div class="wear-preview-actions">${btn('恢复原装','wearReset','wear-reset')}${btn(pending?'购买并保存':'保存穿搭','wearSave','primary')}</div></section></div>
 <section class="wear-inventory ${isShop?'shop-inventory':'bag-inventory'}"><div class="wear-categories">${wearCategories.map(([s,label])=>btn(label,'wearSlot',wearCategory===s?'active':'',`data-slot="${s}"`)).join('')}</div><div class="wear-list-heading"><span>${tools?'目标开启道具':isShop?'基础装扮 · 随心搭配':'我的物品 · 仅显示已拥有'}</span>${btn(isShop?'查看背包 ›':'前往商城 ›','wearSwitch','')}</div>
 ${tools?`<div class="wear-tools-list">${state.cards||isShop?`<div class="wear-tool-tile">${pixelArt('ticket')}<div><h3>任务卡 ${isShop?'':'× '+state.cards}</h3><p>创建一个新目标时消耗1张</p><small>${isShop?'500 金币 / 张':'当前名额 '+M.slots(state)+' / 5'}</small>${btn(isShop?'兑换':'去创建目标',isShop?'exchange':'agent','primary')}</div></div>`:'<div class="wear-empty"><h3>暂时没有道具</h3><p>兑换的任务卡会收纳在这里。</p>'+btn('去商城兑换','wearSwitch','primary')+'</div>'}</div>`:
 `<div class="wear-grid ${isShop?'shop-grid':'bag-grid'}">${items.map(card).join('')}${!items.length?'<div class="wear-empty"><span>◇</span><h3>还没有装饰</h3><p>去商城选一件喜欢的装饰吧。</p>'+btn('逛逛商城','wearSwitch','primary')+'</div>':''}</div>${wearCategory==='head'&&wearDraft.head!=='base-head'?btn('取下装饰','wearRemove','wear-remove'):''}`}
 <p class="wear-count">${isShop?'物品兑换后自动加入背包':'已拥有 '+ownedCount+' 件服饰'} · ${state.cards} 张任务卡</p></section>`;
};
// The first wardrobe handler runs on document capture. Install this bridge on window capture.
window.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;const d=el.dataset;if(!['wearSlot','wearTry','wearRemove'].includes(d.action))return;e.preventDefault();e.stopImmediatePropagation();wearDraft=wearDraft||savedWear();if(d.action==='wearSlot'){wearCategory=d.slot;wearTool=d.slot==='tools';wearSelected=wearDraft[d.slot]||null}else if(d.action==='wearRemove'){wearDraft.head='base-head';wearSelected=null}else{const item=wearItem(d.id);if(!item)return;const removing=wearDraft[item.slot]===item.id;wearDraft[item.slot]=removing?({head:'base-head',top:'base-top',bottom:'base-bottom'})[item.slot]:item.id;wearSelected=wearDraft[item.slot];track('outfit_preview',{itemId:wearDraft[item.slot],removed:removing})}render()},true);
wearSave=function(){const pending=WC.slots.map(s=>wearItem(wearDraft[s])).filter(i=>i&&!wearOwned(i.id));if(pending.length){wearPurchase={items:pending,selected:new Set(pending.map(i=>i.id)),preview:{...wearDraft},rid:M.id()};wearPurchaseModal();return}if(transact('saveOutfit',{outfit:wearDraft})){wearDraft=savedWear();render();toast('穿搭已保存。主页保留默认居家装扮。')}};
const v2Render=render;render=function(){document.querySelector('#phone').classList.toggle('wardrobe-shop',route==='shop');v2Render()};
// Preload source layers so switching garments does not briefly leave a floating head.
for(const file of ['home','standing',...Array.from({length:5},(_,i)=>'set-'+(i+1))]){const i=new Image();i.src='assets/wardrobe/v2/'+file+'.png'}
render();

