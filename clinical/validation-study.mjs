const OUTCOMES = new Set(['POSITIVE','NEGATIVE','INDETERMINATE']);

function finite(v){return Number.isFinite(Number(v));}
function outcome(v){return typeof v === 'string' && OUTCOMES.has(v) ? v : null;}

export class ValidationStudy {
  constructor({studyId='ISH-ANATOMI-VALIDATION',targetCases=1000}={}) {
    if (!Number.isInteger(targetCases) || targetCases < 1) throw new Error('INVALID_TARGET_CASES');
    this.studyId=studyId; this.targetCases=targetCases; this.cases=new Map();
  }
  addCase({caseId,reference,prediction,readerAgreement=null,timestamp=Date.now()}={}) {
    if (!caseId || typeof caseId !== 'string') throw new Error('CASE_ID_REQUIRED');
    const ref=outcome(reference), pred=outcome(prediction);
    if (!ref || !pred) throw new Error('VALID_OUTCOME_REQUIRED');
    if (!finite(timestamp)) throw new Error('INVALID_TIMESTAMP');
    if (this.cases.has(caseId)) throw new Error('CASE_ALREADY_EXISTS');
    const record=Object.freeze({caseId,reference:ref,prediction:pred,readerAgreement:readerAgreement==null?null:outcome(readerAgreement),timestamp:Number(timestamp)});
    this.cases.set(caseId,record); return record;
  }
  metrics() {
    let tp=0,tn=0,fp=0,fn=0,indeterminate=0;
    for(const c of this.cases.values()) {
      if(c.reference==='INDETERMINATE'||c.prediction==='INDETERMINATE'){indeterminate++;continue;}
      if(c.reference==='POSITIVE'&&c.prediction==='POSITIVE')tp++;
      else if(c.reference==='NEGATIVE'&&c.prediction==='NEGATIVE')tn++;
      else if(c.reference==='NEGATIVE'&&c.prediction==='POSITIVE')fp++;
      else if(c.reference==='POSITIVE'&&c.prediction==='NEGATIVE')fn++;
    }
    const classified=tp+tn+fp+fn;
    const sensitivity=tp+fn?tp/(tp+fn):null;
    const specificity=tn+fp?tn/(tn+fp):null;
    const accuracy=classified?(tp+tn)/classified:null;
    return {cases:this.cases.size,targetCases:this.targetCases,complete:this.cases.size>=this.targetCases,classified,indeterminate,tp,tn,fp,fn,sensitivity,specificity,accuracy};
  }
  export(){return Object.freeze({schema:'ish-anatomi.validation.v1',studyId:this.studyId,metrics:this.metrics(),cases:[...this.cases.values()].map(c=>({...c}))});}
}

export function validateStudyCase(record={}) { return Boolean(record.caseId && outcome(record.reference) && outcome(record.prediction) && finite(record.timestamp)); }
