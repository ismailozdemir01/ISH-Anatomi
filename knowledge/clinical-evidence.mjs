import {searchEvidence,rankDiagnosticCandidates} from './evidence-engine.mjs';
import {buildEvidenceGraph,evaluateCandidates} from './evidence-graph.mjs';
import {mapCase} from './ontology.mjs';
import {REFERENCE_DOMAIN} from './medical-reference-library.mjs';

export const DECISION_STATUS=Object.freeze({
  INSUFFICIENT_DATA:'INSUFFICIENT_DATA',
  NO_EVIDENCE:'NO_EVIDENCE',
  EVIDENCE_AVAILABLE:'EVIDENCE_AVAILABLE',
  DIAGNOSTIC_REFERENCE_REQUIRED:'DIAGNOSTIC_REFERENCE_REQUIRED',
  ANATOMICAL_REFERENCE_SCOPE_REQUIRED:'ANATOMICAL_REFERENCE_SCOPE_REQUIRED'
});

const withDomain=e=>({...e,domain:e.source?.domain??null});

const evidenceRecord=e=>({
  chunkId:e.chunkId,
  source:e.source?.title??null,
  provider:e.source?.provider??null,
  domain:e.domain,
  chapter:e.chapter,
  section:e.section,
  page:e.page??null,
  score:e.score,
  text:e.text,
  structureId:e.structureId??null,
  groupId:e.groupId??null,
  meshId:e.meshId??null,
  sourceContentHash:e.source?.contentHash??null,
  chunkContentHash:e.contentHash??null,
  sourceUri:e.source?.uri??null
});

export function assessWithEvidence({
  query='',
  candidates=[],
  store,
  observations=[],
  measurements=[],
  imagingFindings=[],
  ontologyCatalog=[],
  requireDiagnosticReference=false,
  structureId=null,
  groupId=null
}={}) {
  const ontology=mapCase(
    {observations,measurements,imagingFindings},
    ontologyCatalog
  );

  const hasScope=Boolean(structureId||groupId);

  if(requireDiagnosticReference&&hasScope&&(!structureId||!groupId)) {
    return {
      status:DECISION_STATUS.ANATOMICAL_REFERENCE_SCOPE_REQUIRED,
      candidates:[],
      evidence:[],
      diagnosticEvidence:[],
      graph:buildEvidenceGraph({
        observations,
        measurements,
        imagingFindings,
        evidence:[]
      }),
      ontology,
      referenceScope:{
        structureId:structureId??null,
        groupId:groupId??null
      }
    };
  }

  const evidence=searchEvidence(
    query,
    store,
    {
      domain:requireDiagnosticReference
        ? REFERENCE_DOMAIN.DIAGNOSIS
        : null,
      ...(requireDiagnosticReference&&hasScope
        ? {structureId,groupId}
        : {})
    }
  );

  if(evidence.status==='INSUFFICIENT_DATA') {
    return {
      status:DECISION_STATUS.INSUFFICIENT_DATA,
      candidates:[],
      evidence:[],
      diagnosticEvidence:[],
      graph:null,
      ontology,
      referenceScope:evidence.scope
    };
  }

  if(!evidence.results.length) {
    return {
      status:requireDiagnosticReference
        ? DECISION_STATUS.DIAGNOSTIC_REFERENCE_REQUIRED
        : DECISION_STATUS.NO_EVIDENCE,
      candidates:[],
      evidence:[],
      diagnosticEvidence:[],
      graph:buildEvidenceGraph({
        observations,
        measurements,
        imagingFindings,
        evidence:[]
      }),
      ontology,
      referenceScope:{
        structureId:structureId??null,
        groupId:groupId??null
      }
    };
  }

  const results=evidence.results.map(withDomain);

  const diagnosticResults=results.filter(
    e=>e.domain===REFERENCE_DOMAIN.DIAGNOSIS
  );

  const graph=buildEvidenceGraph({
    observations,
    measurements,
    imagingFindings,
    evidence:results
  });

  if(requireDiagnosticReference&&!diagnosticResults.length) {
    return {
      status:DECISION_STATUS.DIAGNOSTIC_REFERENCE_REQUIRED,
      candidates:[],
      evidence:results.map(evidenceRecord),
      diagnosticEvidence:[],
      graph,
      ontology,
      referenceScope:{
        structureId:structureId??null,
        groupId:groupId??null
      }
    };
  }

  const ranked=evaluateCandidates(candidates,graph).candidates;

  return {
    status:DECISION_STATUS.EVIDENCE_AVAILABLE,
    candidates:ranked.length
      ? ranked
      : rankDiagnosticCandidates(
          candidates,
          diagnosticResults.length
            ? diagnosticResults
            : results
        ),
    evidence:results.map(evidenceRecord),
    diagnosticEvidence:diagnosticResults.map(evidenceRecord),
    graph,
    ontology,
    referenceScope:evidence.scope
  };
}
