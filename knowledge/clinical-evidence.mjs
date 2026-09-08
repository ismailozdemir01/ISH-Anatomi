import {searchEvidence,rankDiagnosticCandidates} from './evidence-engine.mjs';
import {buildEvidenceGraph,evaluateCandidates} from './evidence-graph.mjs';

export const DECISION_STATUS=Object.freeze({INSUFFICIENT_DATA:'INSUFFICIENT_DATA',NO_EVIDENCE:'NO_EVIDENCE',EVIDENCE_AVAILABLE:'EVIDENCE_AVAILABLE'});

export function assessWithEvidence({query='',candidates=[],store,observations=[],measurements=[],imagingFindings=[]}={}) {
  const evidence=searchEvidence(query,store);
  if (evidence.status==='INSUFFICIENT_DATA') return {status:DECISION_STATUS.INSUFFICIENT_DATA,candidates:[],evidence:[],graph:null};
  if (!evidence.results.length) return {status:DECISION_STATUS.NO_EVIDENCE,candidates:[],evidence:[],graph:buildEvidenceGraph({observations,measurements,imagingFindings,evidence:[]})};
  const graph=buildEvidenceGraph({observations,measurements,imagingFindings,evidence:evidence.results});
  const ranked=evaluateCandidates(candidates,graph).candidates;
  return {
    status:DECISION_STATUS.EVIDENCE_AVAILABLE,
    candidates:ranked.length?ranked:rankDiagnosticCandidates(candidates,evidence.results),
    evidence:evidence.results.map(e=>({chunkId:e.chunkId,source:e.source?.title??null,provider:e.source?.provider??null,chapter:e.chapter,section:e.section,score:e.score,text:e.text})),
    graph
  };
}
