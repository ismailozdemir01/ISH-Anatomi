import test from 'node:test';
import assert from 'node:assert/strict';
import {assessClinicalCase, createEmptyEvidenceStore} from './assessment.mjs';
import {ingestIntoStore} from '../knowledge/source-ingestion.mjs';
import {REFERENCE_DOMAIN} from '../knowledge/medical-reference-library.mjs';

test('diagnosis mode cannot produce a candidate from anatomy-only references', () => {
  const imported=ingestIntoStore({id:'anat',title:'Anatomy textbook',provider:'Local',language:'tr',licenseStatus:'OPEN',documentType:'TEXTBOOK',domain:REFERENCE_DOMAIN.ANATOMY,text:'Karaciğer normal anatomik yapısı.'});
  const result=assessClinicalCase({mode:'DIAGNOSIS',diagnosis:true,query:'karaciğer',candidates:[{name:'hepatik hastalık'}]},{store:imported.store,modelValidated:true});
  assert.equal(result.safety.status,'BLOCKED');
  assert.equal(result.evidenceStatus,'DIAGNOSTIC_REFERENCE_REQUIRED');
  assert.equal(result.candidates.length,0);
});

test('diagnosis mode can use only explicitly imported diagnostic reference content', () => {
  const anatomy=ingestIntoStore({id:'anat',title:'Anatomy textbook',provider:'Local',language:'tr',licenseStatus:'OPEN',documentType:'TEXTBOOK',domain:REFERENCE_DOMAIN.ANATOMY,text:'Kalp normal anatomisi.'});
  const diagnosis=ingestIntoStore({id:'diag',title:'Licensed diagnosis textbook',provider:'Local',language:'tr',licenseStatus:'LICENSED',documentType:'TEXTBOOK',domain:REFERENCE_DOMAIN.DIAGNOSIS,text:'Göğüs ağrısı değerlendirmesi ve ayırıcı tanı başlıkları.'},anatomy.store);
  const result=assessClinicalCase({mode:'DIAGNOSIS',diagnosis:true,query:'göğüs ağrısı',observations:['göğüs ağrısı'],candidates:[{name:'örnek durum'}]},{store:diagnosis.store,modelValidated:true});
  assert.equal(result.evidenceStatus,'EVIDENCE_AVAILABLE');
  assert.ok(result.diagnosticEvidence.length>0);
  assert.equal(result.safety.status,'REVIEW_REQUIRED');
});
