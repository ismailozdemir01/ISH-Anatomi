export const MAPPING_STATUS = Object.freeze({ MAPPED:'MAPPED', UNMAPPED:'UNMAPPED', UNKNOWN:'UNKNOWN' });
export function createAnatomyMapper(catalog=[]){
  const index=new Map();
  for(const item of catalog){ if(!item||typeof item!=='object'||typeof item.id!=='string')continue; const terms=[item.id,item.name,...(Array.isArray(item.aliases)?item.aliases:[])].filter(Boolean).map(v=>String(v).trim().toLocaleLowerCase('tr-TR')); for(const term of terms)index.set(term,item); }
  return {resolve(term){const key=typeof term==='string'?term.trim().toLocaleLowerCase('tr-TR'):''; const item=index.get(key); return item?{status:MAPPING_STATUS.MAPPED,structureId:item.id,structure:item}:{status:key?MAPPING_STATUS.UNMAPPED:MAPPING_STATUS.UNKNOWN,structureId:null,structure:null};}};
}
export function mapObservation({structureId=null,term=null,confidence=null,sourceFrameId=null,timestamp=null,mapper}={}){
  const direct=typeof structureId==='string'&&structureId.trim()?{status:MAPPING_STATUS.MAPPED,structureId:structureId.trim()}:mapper?.resolve?.(term);
  const result=direct??{status:MAPPING_STATUS.UNKNOWN,structureId:null};
  return {...result,confidence:Number.isFinite(Number(confidence))?Math.max(0,Math.min(1,Number(confidence))):null,sourceFrameId,timestamp,evidenceBound:Boolean(sourceFrameId&&timestamp)};
}
