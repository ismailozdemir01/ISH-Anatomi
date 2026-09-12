import {assess as assessEngine} from './engine.cjs';
import {assessWithEvidence} from '../knowledge/clinical-evidence.mjs';
import {createKnowledgeStore} from '../knowledge/library.mjs';
import {validateClinicalOutput, auditEvent} from './safety.mjs';

export function createEmptyEvidenceStore() { return createKnowledgeStore(); }

export function assessClinicalCase(payload = {}, {store = createEmptyEvidenceStore(), modelValidated = false, ontologyCatalog = []} = {}) {
  const base = assessEngine(payload);
  const observations = payload.observations ?? payload.imaging?.observations ?? [];
  const measurements = payload.measurements ?? payload.imaging?.measurements ?? [];
  const imagingFindings = payload.imaging?.findings ?? payload.imagingFindings ?? [];
  const query = payload.query ?? payload.question ?? observations.join(' ');
  const diagnosisRequested = payload.diagnosis === true || payload.mode === 'DIAGNOSIS';
  const evidence = assessWithEvidence({query, candidates: payload.candidates ?? [], store, observations, measurements, imagingFindings, ontologyCatalog, requireDiagnosticReference: diagnosisRequested});
  const imaging = payload.imaging ?? {};
  const qualityAccepted = imaging.qualityAccepted != null
    ? Boolean(imaging.qualityAccepted)
    : (imaging.quality == null ? true : (imaging.quality.accepted ?? ['GOOD','FAIR'].includes(imaging.quality.status)));
  const calibrationValid = imaging.calibrationValid != null
    ? Boolean(imaging.calibrationValid)
    : (imaging.calibration == null ? true : Boolean(imaging.calibration.valid));
  const temporalStable = imaging.temporalStable != null
    ? Boolean(imaging.temporalStable)
    : (imaging.temporalTracking == null ? true : imaging.temporalTracking.status === 'STABLE');
  const registrationValid = imaging.registrationValid != null
    ? Boolean(imaging.registrationValid)
    : (imaging.anatomy == null ? true : (imaging.anatomy.status === 'READY' || Boolean(imaging.anatomy.structureId)));
  const safety = validateClinicalOutput({status: evidence.status === 'EVIDENCE_AVAILABLE' ? base.status : evidence.status,findings: base.findings ?? [],evidence: evidence.evidence ?? [],modelValidated,qualityAccepted,calibrationValid,temporalStable,registrationValid});
  return {...base,evidenceStatus:evidence.status,evidence:evidence.evidence,candidates:evidence.candidates,diagnosticEvidence:evidence.diagnosticEvidence ?? [],evidenceGraph:evidence.graph,ontology:evidence.ontology,safety,audit:auditEvent({event:safety.status === 'BLOCKED' ? 'CLINICAL_OUTPUT_BLOCKED' : 'CLINICAL_OUTPUT_REVIEW_REQUIRED'})};
}
