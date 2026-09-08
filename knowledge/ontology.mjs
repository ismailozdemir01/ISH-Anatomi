export const CONCEPT_TYPES=Object.freeze({OBSERVATION:'OBSERVATION',MEASUREMENT:'MEASUREMENT',IMAGING_FINDING:'IMAGING_FINDING',DIAGNOSIS:'DIAGNOSIS',ANATOMY:'ANATOMY'});
export const ONTOLOGY_STATUS=Object.freeze({MAPPED:'MAPPED',UNMAPPED:'UNMAPPED',UNKNOWN:'UNKNOWN'});
const norm=s=>String(s??'').toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();
export function createConcept({id,term,type,ontology=null,code=null,synonyms=[]}={}){if(!id||!term||!Object.values(CONCEPT_TYPES).includes(type))throw new Error('INVALID_CONCEPT');return {id,term,type,ontology,code,synonyms:[...new Set(synonyms.map(norm).filter(Boolean))]};}
export function mapConcept(term,catalog=[]){const n=norm(term);const hit=catalog.find(c=>norm(c.term)===n||c.synonyms?.some(s=>norm(s)===n));return hit?{status:ONTOLOGY_STATUS.MAPPED,concept:hit}:{status:ONTOLOGY_STATUS.UNMAPPED,term};}
export function mapCase({observations=[],measurements=[],imagingFindings=[]}={},catalog=[]){return {observations:observations.map(x=>mapConcept(x,catalog)),measurements:measurements.map(x=>mapConcept(x,catalog)),imagingFindings:imagingFindings.map(x=>mapConcept(x,catalog))};}
