export const SAFETY_STATUS=Object.freeze({PASS:'PASS',BLOCKED:'BLOCKED',REVIEW_REQUIRED:'REVIEW_REQUIRED'});

export function validateClinicalOutput({status,findings=[],evidence=[],diagnosticEvidence=[],modelValidated=false,calibrationValid=true,temporalStable=true,registrationValid=true,qualityAccepted=true,diagnosisRequested=false}={}){
  if(status==='NOT_CONFIGURED'||status==='INSUFFICIENT_DATA'||status==='NO_EVIDENCE'||status==='DIAGNOSTIC_REFERENCE_REQUIRED')return {status:SAFETY_STATUS.BLOCKED,reason:status};
  if(!qualityAccepted)return {status:SAFETY_STATUS.BLOCKED,reason:'IMAGE_QUALITY_GATE_FAILED'};
  if(!calibrationValid)return {status:SAFETY_STATUS.BLOCKED,reason:'CALIBRATION_REQUIRED'};
  if(!temporalStable)return {status:SAFETY_STATUS.BLOCKED,reason:'TEMPORAL_STABILITY_REQUIRED'};
  if(!registrationValid)return {status:SAFETY_STATUS.BLOCKED,reason:'ANATOMICAL_REGISTRATION_REQUIRED'};
  if(!modelValidated)return {status:SAFETY_STATUS.BLOCKED,reason:'VALIDATED_MODEL_REQUIRED'};
  if(!Array.isArray(evidence)||!evidence.length)return {status:SAFETY_STATUS.BLOCKED,reason:'PROVENANCE_REQUIRED'};
  if(diagnosisRequested && (!Array.isArray(diagnosticEvidence)||!diagnosticEvidence.length))return {status:SAFETY_STATUS.BLOCKED,reason:'DIAGNOSTIC_REFERENCE_REQUIRED'};
  return {status:SAFETY_STATUS.REVIEW_REQUIRED,findings,evidence,diagnosticEvidence:diagnosticEvidence??[]};
}

export function auditEvent({event,type='CLINICAL',source=null,model=null}={}){return {timestamp:new Date().toISOString(),event,type,source,model};}
