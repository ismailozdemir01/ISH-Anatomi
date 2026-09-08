export const GRAPH_RELATIONS=Object.freeze({SUPPORTS:'SUPPORTS',CONTRADICTS:'CONTRADICTS',REQUIRES:'REQUIRES',LOCATES:'LOCATES'});
export const GRAPH_STATUS=Object.freeze({READY:'READY',INSUFFICIENT_DATA:'INSUFFICIENT_DATA',NO_EVIDENCE:'NO_EVIDENCE'});

const clean = value => String(value ?? '').trim();

export function buildEvidenceGraph({observations=[],measurements=[],imagingFindings=[],evidence=[]}={}) {
  const nodes=[]; const edges=[];
  const add=(type,value,meta={})=>{const id=`${type}:${nodes.length}`;nodes.push({id,type,value,meta});return id;};
  for(const x of observations.filter(Boolean)) add('OBSERVATION',x);
  for(const x of measurements.filter(Boolean)) add('MEASUREMENT',x);
  for(const x of imagingFindings.filter(Boolean)) add('IMAGING_FINDING',x);
  for(const e of evidence.filter(Boolean)) {
    const id=add('EVIDENCE',e.text,{chunkId:e.chunkId,source:e.source,provider:e.provider,chapter:e.chapter,section:e.section,score:e.score});
    const sourceNodes=nodes.filter(n=>['OBSERVATION','MEASUREMENT','IMAGING_FINDING'].includes(n.type));
    for(const n of sourceNodes) edges.push({from:n.id,to:id,relation:GRAPH_RELATIONS.SUPPORTS,weight:Number(e.score)||0});
  }
  return {nodes,edges};
}

export function evaluateCandidates(candidates=[],graph={}) {
  const evidence=graph.nodes?.filter(n=>n.type==='EVIDENCE') ?? [];
  if(!evidence.length) return {status:GRAPH_STATUS.NO_EVIDENCE,candidates:[]};
  const out=candidates.map(candidate=>{
    const name=clean(candidate.name).toLocaleLowerCase('tr-TR');
    const matched=evidence.filter(e=>clean(e.value).toLocaleLowerCase('tr-TR').includes(name));
    const support=matched.length/evidence.length;
    return {...candidate,evidenceHits:matched.length,evidenceSupport:Number(support.toFixed(4)),evidence:matched.map(e=>({nodeId:e.id,...e.meta}))};
  }).sort((a,b)=>b.evidenceSupport-a.evidenceSupport);
  return {status:GRAPH_STATUS.READY,candidates:out};
}

export function graphForClinicalCase(input={}) {
  const graph=buildEvidenceGraph(input);
  const status=graph.nodes.some(n=>n.type==='EVIDENCE')?GRAPH_STATUS.READY:GRAPH_STATUS.NO_EVIDENCE;
  return {status,graph};
}
