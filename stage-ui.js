/* Shared stage grouping and current-release adjustment availability. */
function normalizeStages(tasks){
 const list=tasks.map(t=>({...t})),keys=[...new Set(list.map(t=>String(t.stage??0)))];
 const regroup=(list.length>=10&&keys.length===1)||keys.length>3;
 const count=regroup?(list.length>=18?3:2):keys.length;
 list.forEach((t,i)=>{t.stage=regroup?Math.min(count-1,Math.floor(i*count/list.length)):keys.indexOf(String(t.stage??0));if(regroup)t.stageName=['准备与启动','推进与完成','检查与收尾'][count===2?t.stage*2:t.stage];else t.stageName=t.stageName||'第 '+(t.stage+1)+' 阶段'});
 return list;
}
function currentStageInfo(g,t){const task=t||g.tasks.find(x=>x.state!=='done')||g.tasks.at(-1),stage=task?.stage??0,items=g.tasks.filter(x=>x.stage===stage);return {stage,name:task?.stageName||'第 '+(stage+1)+' 阶段',completed:items.filter(x=>x.state==='done').length,total:items.length}}
function stageLabel(g,t){const p=currentStageInfo(g,t);return '第 '+(p.stage+1)+' 阶段 · '+p.name.replace(/^第\s*\d+\s*阶段$/,'').trim()}
const priorPlanStages=planStages;planStages=function(d){const list=normalizeStages(priorPlanStages(d).flatMap(s=>s.tasks));return [...new Set(list.map(t=>t.stage))].map(stage=>({name:list.find(t=>t.stage===stage).stageName,tasks:list.filter(t=>t.stage===stage)}))};
// Save a recoverable snapshot before migrating only grouping metadata.
let stageChanged=false;for(const g of state.goals){if(!['active','paused'].includes(g.status))continue;const tasks=normalizeStages(g.tasks);if(JSON.stringify(tasks)!==JSON.stringify(g.tasks)){if(!stageChanged)localStorage.setItem('myself-stage-migration-backup-v1',JSON.stringify(state));g.tasks=tasks;stageChanged=true}}if(stageChanged)save();
const stageApply=M.apply;M.apply=function(s,action,p,...rest){if(['adjust','adjustPlan'].includes(action))throw new Error('本版本暂未开放正式计划调整。');if(action==='create')p={...p,tasks:normalizeStages(p.tasks||[])};return stageApply(s,action,p,...rest)};
const priorTaskPage=taskPage;taskPage=function(){const g=goal(taskRef?.g),t=g?.tasks.find(x=>x.id===taskRef.t);return priorTaskPage().replace('第一阶段',g&&t?esc(stageLabel(g,t)):'')};
const priorPlanCard=planWindowCard;planWindowCard=function(g){const html=priorPlanCard(g),template=document.createElement('template');template.innerHTML=html;const body=template.content.querySelector('.goal-body');if(body){const rows=[...body.querySelectorAll('.taskline')];let prev=null;g.tasks.forEach((t,i)=>{if(prev!==t.stage&&rows[i]){const h=document.createElement('h4');h.className='plan-stage-divider';h.textContent=stageLabel(g,t);rows[i].before(h);prev=t.stage}})}return template.innerHTML};
const disabledAdjustmentActions=new Set(['adjustGoal','adjustTask','agentAdjust','confirmAdjust','confirmBatchAdjust','applyBatchAdjust','saveAdjust']);
window.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(disabledAdjustmentActions.has(a)){e.preventDefault();e.stopImmediatePropagation();toast('本版本暂未开放计划调整。')}},true);
const priorStageRender=render;render=function(){if(route==='adjust')route='plans';if(['adjust','adjustBatch'].includes(state.agentFlow?.mode))state.agentFlow={mode:'chat',data:{}};priorStageRender();document.querySelectorAll('[data-action]').forEach(el=>{if(disabledAdjustmentActions.has(el.dataset.action))el.remove()})};
render();

document.addEventListener('click',e=>{if(e.target.closest('[data-action]')?.dataset.action!=='goalCountDetails')return;e.preventDefault();e.stopImmediatePropagation();const gs=state.goals.filter(g=>g.status!=='cancelled');openModal('大目标统计明细',`<p>已完成 ${gs.filter(g=>g.status==='completed').length} / 共制定 ${gs.length} 个大目标。以下是当前存档实际计入的记录，不是任务或阶段。</p>${gs.map((g,i)=>`<div class="note-box spaced"><b>${i+1}. ${esc(g.title)}</b><p>${({completed:'已完成',active:'进行中',paused:'已暂停'})[g.status]||esc(g.status)} · ${g.tasks.filter(t=>t.state==='done').length}/${g.tasks.length} 项任务</p></div>`).join('')}<p class="caption">本页仅核对，不修改或删除记录。</p>`,()=>closeModal(),'关闭')},true);
