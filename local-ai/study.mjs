import {getKnowledgeCatalog} from './knowledge.mjs';

export function createQuiz(count=5, seed=0){
  const entries=getKnowledgeCatalog();
  if(!entries.length) return {status:'UNKNOWN',questions:[]};
  const n=Math.max(1,Math.min(Number(count)||5,entries.length));
  let state=(Number(seed)||0)>>>0;
  const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
  const pool=[...entries].sort(()=>random()-0.5).slice(0,n);
  const questions=pool.map((entry,i)=>({id:`q-${i+1}`,prompt:`${entry.title} yapısının Latince adı nedir?`,answer:entry.latin,structureId:entry.id,system:entry.system}));
  return {status:'READY',questions};
}

export function studyCard(query){
  const q=String(query??'').toLocaleLowerCase('tr-TR');
  const entry=getKnowledgeCatalog().find(e=>e.names.some(n=>q.includes(n.toLocaleLowerCase('tr-TR'))));
  if(!entry) return {status:'UNKNOWN'};
  return {status:'READY',structureId:entry.id,title:entry.title,latin:entry.latin,system:entry.system,description:entry.description,relations:entry.relations};
}
