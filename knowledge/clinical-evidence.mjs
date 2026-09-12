import {searchEvidence,rankDiagnosticCandidates} from './evidence-engine.mjs';
import {buildEvidenceGraph,evaluateCandidates} from './evidence-graph.mjs';
import {mapCase} from './ontology.mjs';
import {REFERENCE_DOMAIN} from './medical-reference-library.mjs';

export const DECISION_STATUS=Object.freeze({INSUFFICIENT_DATA:'INSUFFICIENT_DATA',NO_EVIDENCE:'NO_EVIDENCE',EVIDENCE_AVAILABLE:'EVIDENCE_AVAILABLE',DIAGNOSTIC_REFERENCE_REQUIRED:'DIAGNOSTIC_REFERENCE_REQUIRED'});

const withDomain=e=>({...e,domain:e.source?.domain??null});
const evidenceRecord=e=>({chunkId:e.chunkId,source:e.source?.title??null,provider:e.source?.provider??null,domain:e.domain,chapter:e.chapter,section:e.section,page:e.page??null,score:e.score,text:e.text,sourceContentHash:e.source?.contentHash??null,chunkContentHash:e.contentHash??null,sourceUri:e.source?.uri??null});

export function assessWithEvidence({query='',candidates=[],store,observations=[],measurements=[],imagingFindings=[],ontologyCatalog=[],requireDiagnosticReference=false}={}) {
  const ontology=mapCase({observations,measurements,imagingFindings},ontologyCatalog);
  const evidence=searchEvidence(query,store);
  if (evidence.status==='INSUFFICIENT_DATA') return {status:DECISION_STATUS.INSUFFICIENT_DATA,candidates:[],evidence:[],graph:null,ontology};
  if (!evidence.results.length) return {status:DECISION_STATUS.NO_EVIDENCE,candidates:[],evidence:[],graph:buildEvidenceGraph({observations,measurements,imagingFindings,evidence:[]}),ontology};
  const results=evidence.results.map(withDomain);
  const diagnosticResults=results.filter(e=>e.domain===REFERENCE_DOMAIN.DIAGNOSIS);
  if(requireDiagnosticReference && !diagnosticResults.length) {
    return {status:DECISION_STATUS.DIAGNOSTIC_REFERENCE_REQUIRED,candidates:[],evidence:results.map(evidenceRecord),diagnosticEvidence:[],graph:buildEvidenceGraph({observations,measurements,imagingFindings,evidence:results}),ontology};
  }
  const graph=buildEvidenceGraph({observations,measurements,imagingFindings,evidence:results});
  const ranked=evaluateCandidates(candidates,graph).candidates;
  return {
    status:DECISION_STATUS.EVIDENCE_AVAILABLE,
    candidates:ranked.length?ranked:rankDiagnosticCandidates(candidates,diagnosticResults.length?diagnosticResults:results),
    evidence:results.map(evidenceRecord),
    diagnosticEvidence:diagnosticResults.map(evidenceRecord),
    graph,
    ontology
  };
}
