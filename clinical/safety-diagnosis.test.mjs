import test from 'node:test';
import assert from 'node:assert/strict';
import {validateClinicalOutput} from './safety.mjs';

test('diagnosis output is blocked without diagnostic evidence', () => {
  const result=validateClinicalOutput({status:'EVIDENCE_AVAILABLE',evidence:[{source:'Anatomy'}],diagnosticEvidence:[],modelValidated:true,diagnosisRequested:true});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'DIAGNOSTIC_REFERENCE_REQUIRED');
});

test('diagnosis output remains review-only with diagnostic evidence', () => {
  const result=validateClinicalOutput({status:'EVIDENCE_AVAILABLE',evidence:[{source:'Diagnosis'}],diagnosticEvidence:[{source:'Diagnosis'}],modelValidated:true,diagnosisRequested:true});
  assert.equal(result.status,'REVIEW_REQUIRED');
});

test('non-diagnostic anatomy assessment keeps existing review behavior', () => {
  const result=validateClinicalOutput({status:'EVIDENCE_AVAILABLE',evidence:[{source:'Anatomy'}],modelValidated:true});
  assert.equal(result.status,'REVIEW_REQUIRED');
});
