import test from 'node:test';
import assert from 'node:assert/strict';
import {assessClinicalCase, createEmptyEvidenceStore} from './assessment.mjs';

test('clinical assessment remains blocked without evidence and validated model', () => {
  const result = assessClinicalCase({symptoms:['pain']}, {store:createEmptyEvidenceStore(), modelValidated:false});
  assert.equal(result.safety.status, 'BLOCKED');
  assert.equal(result.evidenceStatus, 'NOT_CONFIGURED');
});

test('evidence-backed case exposes provenance and remains review-gated', () => {
  const store = {
    chunks: new Map([['d1:0', {id:'d1:0', sourceId:'d1', text:'pain may occur in anatomy', chapter:'C', section:'S'}]]),
    sourceMap: new Map([['d1', {id:'d1', title:'Open guideline', provider:'Test', licenseStatus:'OPEN'}]]),
    index: new Map([['pain', new Set(['d1:0'])]])
  };
  const result = assessClinicalCase({query:'pain', observations:['pain']}, {store, modelValidated:true});
  assert.equal(result.evidenceStatus, 'EVIDENCE_AVAILABLE');
  assert.equal(result.safety.status, 'REVIEW_REQUIRED');
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].source, 'Open guideline');
});

test('imaging safety gates cannot be bypassed by valid evidence alone', () => {
  const store = {
    chunks: new Map([['d1:0', {id:'d1:0', sourceId:'d1', text:'pain may occur in anatomy', chapter:'C', section:'S'}]]),
    sourceMap: new Map([['d1', {id:'d1', title:'Open guideline', provider:'Test', licenseStatus:'OPEN'}]]),
    index: new Map([['pain', new Set(['d1:0'])]])
  };
  const imaging = {
    quality:{status:'GOOD'},
    calibration:{valid:false},
    temporalTracking:{status:'STABLE'},
    anatomy:{status:'READY',structureId:'heart'},
    registrationValid:true
  };
  const result = assessClinicalCase({query:'pain', observations:['pain'], imaging}, {store, modelValidated:true});
  assert.equal(result.evidenceStatus, 'EVIDENCE_AVAILABLE');
  assert.equal(result.safety.status, 'BLOCKED');
  assert.equal(result.safety.reason, 'CALIBRATION_REQUIRED');
});

test('explicit registration gate blocks otherwise valid imaging case', () => {
  const store = {
    chunks: new Map([['d1:0', {id:'d1:0', sourceId:'d1', text:'pain may occur in anatomy', chapter:'C', section:'S'}]]),
    sourceMap: new Map([['d1', {id:'d1', title:'Open guideline', provider:'Test', licenseStatus:'OPEN'}]]),
    index: new Map([['pain', new Set(['d1:0'])]])
  };
  const imaging = {
    quality:{status:'GOOD'},
    calibration:{valid:true},
    temporalTracking:{status:'STABLE'},
    anatomy:{status:'READY',structureId:'heart'},
    registrationValid:false
  };
  const result = assessClinicalCase({query:'pain', observations:['pain'], imaging}, {store, modelValidated:true});
  assert.equal(result.safety.status, 'BLOCKED');
  assert.equal(result.safety.reason, 'ANATOMICAL_REGISTRATION_REQUIRED');
});
