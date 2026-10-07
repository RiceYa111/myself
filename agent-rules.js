(function(root){
'use strict';
const fail=m=>{throw new Error(m)};
const tiers={gap:['familiar','learning','prerequisite'],complexity:['single','linked','open'],check:['checklist','revision','feedback']};
function score(task){const values=['gap','complexity','check'].map(k=>{const v=task.criteria?task.criteria[k]:task.scores?.[k];if(Number.isInteger(v))return v;const i=tiers[k].indexOf(typeof v==='string'?v.trim().toLowerCase():v);return i});if(values.some(v=>!Number.isInteger(v)||v<0||v>2))fail('难度依据不完整');const total=values.reduce((a,b)=>a+b,0),level=total<=1?0:total<=3?1:2;return {scores:Object.fromEntries(['gap','complexity','check'].map((k,i)=>[k,values[i]])),difficulty:['低','中','高'][level],reward:[100,150,200][level]};}
const norm=s=>String(s||'').normalize('NFKC').replace(/[\s，。、“”"'：:；;！？!?—–-]/g,'').replace(/^完成/,'').replace(/(的)?阅读$/,'').replace(/^读第/,'阅读第');
function dateOK(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s}
function checkTasks(tasks,{strict=false,today=''}={}){if(!Array.isArray(tasks)||!tasks.length||tasks.length>60)fail('任务数量须为1—60项');const seen=new Set();for(const t of tasks){if(!t.title?.trim()||!dateOK(t.date)||(today&&t.date<today))fail('任务日期或内容不合规');if(/^(打开|合上|关闭)(书|书本|网页|文档)[。！!]*$|^(缓冲日|休息日|等待反馈)$/.test(t.title.trim())||/^留.{0,6}缓冲/.test(t.title))fail('准备步骤或缓冲时间不能单独计奖');const cooking=tasks.some(x=>/(做|烹饪|烹制|制作).{0,12}(炒蛋|炒.{0,5}菜|时蔬|汤|菜肴)/.test(x.title));if(cooking&&/^(按菜单|对照菜单|清点|预处理|洗切|洗净|切好|打好|备菜|淘米|启动电饭煲|摆盘|上桌|收拾厨房)/.test(t.title.trim())&&!/(做成|完成制作|烹饪|烹制)/.test(t.title))fail('做饭计划中的洗切备菜、启动煮饭和摆盘是过程步骤，请并入对应菜品的完成说明，不单独计奖');const key=t.date+'|'+norm(t.outcomeKey||t.title);if(seen.has(key))fail('同日重复成果不能重复计奖');seen.add(key);const pages=t.title.match(/第?\s*(\d+)\s*[—–\-到至～~]\s*(\d+)\s*页/);if(pages){const k=t.date+'|pages:'+pages[1]+'-'+pages[2];if(seen.has(k))fail('同一阅读范围不能重复计奖');seen.add(k)}if(strict){if(!t.acceptance?.trim()||!t.outcomeKey?.trim())fail('每项任务必须有独立成果和完成标准');if(!t.evidence||['gap','complexity','check'].some(k=>!t.evidence[k]?.trim()))fail('缺少逐项评分依据');score(t)}}return true;}
function replacements(goal,proposal,today){
 if(!goal||!['active','paused'].includes(goal.status)||proposal.version!==goal.version)fail('计划版本或状态已变化，请重新生成');
 const ids=proposal.taskIds;if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)fail('请选择明确且不重复的调整范围');
 const old=ids.map(id=>goal.tasks.find(t=>t.id===id));if(old.some(t=>!t||t.state==='done'||t.state==='running'))fail('只能调整已暂停或尚未开始的任务');
 checkTasks(proposal.tasks,{today});const stages=[...new Set(old.map(t=>t.stage))],budget=old.reduce((n,t)=>n+t.reward,0);
 const tasks=proposal.tasks.map(t=>({...t,stage:t.stage??(stages.length===1?stages[0]:undefined)}));
 if(tasks.some(t=>!stages.includes(t.stage))||stages.some(st=>!tasks.some(t=>t.stage===st)))fail('跨阶段调整须为每项新任务标明原所属阶段，不删除整个阶段');
 for(const stage of stages){const source=old.filter(t=>t.stage===stage),group=tasks.filter(t=>t.stage===stage),sum=source.reduce((n,t)=>n+t.reward,0);group.forEach((t,i)=>{t.reward=Math.floor(sum/group.length)+(i<sum%group.length?1:0);t.stageName=source[0].stageName;t.difficulty='调整分配'})}
 checkTasks([...goal.tasks.filter(t=>!ids.includes(t.id)&&t.state!=='done'),...tasks]);return {tasks,budget,old};
}

const api={score,checkTasks,replacements,dateOK};if(typeof module!=='undefined')module.exports=api;else root.AgentRules=api;
})(typeof window==='undefined'?globalThis:window);
