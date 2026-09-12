import {canIndex} from './source-registry.mjs';

const STOP = new Set(['ve','ile','için','bir','bu','şu','the','and','for','with','of','a']);
const norm = s => String(s??'').toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^\p{L}\p{N}\s]/gu,' ');
const terms = s => norm(s).split(/\s+/).filter(x=>x.length>1&&!STOP.has(x));

export function chunkDocument(document,{maxChars=1800}={}) {
  if (!document?.id || !document?.text) return [];
  const paragraphs=String(document.text).split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  const out=[]; let buf=''; let n=0;
  for (const p of paragraphs) {
    if (buf && buf.length+p.length+2>maxChars) { out.push({id:`${document.id}:${n++}`,sourceId:document.id,text:buf,chapter:document.chapter??null,section:document.section??null,page:document.page??null}); buf=''; }
    buf=buf?`${buf}\n\n${p}`:p;
  }
  if (buf) out.push({id:`${document.id}:${n}`,sourceId:document.id,text:buf,chapter:document.chapter??null,section:document.section??null,page:document.page??null});
  return out;
}

export function buildIndex(chunks=[],sourceMap=new Map()) {
  const index=new Map();
  for (const chunk of chunks) for (const t of terms(chunk.text)) { if(!index.has(t)) index.set(t,new Set()); index.get(t).add(chunk.id); }
  return {chunks:new Map(chunks.map(c=>[c.id,c])),index,sourceMap};
}

export function searchEvidence(query, store,{limit=8}={}) {
  if (!store?.chunks || !store?.index) return {status:'NOT_CONFIGURED',results:[]};
  const q=terms(query); if(!q.length) return {status:'INSUFFICIENT_DATA',results:[]};
  const scores=new Map();
  for (const t of q) for (const id of (store.index.get(t)??[])) scores.set(id,(scores.get(id)??0)+1);
  const results=[...scores.entries()].map(([id,score])=>{const c=store.chunks.get(id); const source=store.sourceMap.get(c.sourceId); return {chunkId:id,score:score/q.length,text:c.text,chapter:c.chapter,section:c.section,page:c.page??null,contentHash:c.contentHash??null,source:source??null};})
    .filter(r=>!r.source || canIndex(r.source)).sort((a,b)=>b.score-a.score).slice(0,limit);
  return {status:results.length?'READY':'NO_MATCH',results};
}

export function rankDiagnosticCandidates(candidates=[],evidence=[]) {
  return candidates.map(c=>{
    const name=norm(c.name); const hits=evidence.filter(e=>terms(e.text).some(t=>name.includes(t)||t.includes(name))).length;
    return {...c,evidenceHits:hits,evidenceSupport:evidence.length?hits/evidence.length:0};
  }).sort((a,b)=>b.evidenceSupport-a.evidenceSupport);
}
