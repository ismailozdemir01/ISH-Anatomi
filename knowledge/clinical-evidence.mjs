import {searchEvidence,rankDiagnosticCandidates} from './evidence-engine.mjs';

export const DECISION_STATUS=Object.freeze({INSUFFICIENT_DATA:'INSUFFICIENT_DATA',NO_EVIDENCE:'NO_EVIDENCE',EVIDENCE_AVAILABLE:'EVIDENCE_AVAILABLE'});

export function assessWithEvidence({query='',candidates=[],store}={}) {
  const evidence=searchEvidence(query,store);
  if (evidence.status==='INSUFFICIENT_DATA') return {status:DECISION_STATUS.INSUFFICIENT_DATA,candidates:[],evidence:[]};
  if (!evidence.results.length) return {status:DECISION_STATUS.NO_EVIDENCE,candidates:[],evidence:[]};
  return {
    status:DECISION_STATUS.EVIDENCE_AVAILABLE,
    candidates:rankDiagnosticCandidates(candidates,evidence.results),
    evidence:evidence.results.map(e=>({chunkId:e.chunkId,source:e.source?.title??null,provider:e.source?.provider??null,chapter:e.chapter,section:e.section,score:e.score,text:e.text}))
  };
}
