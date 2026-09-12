import test from 'node:test';
import assert from 'node:assert/strict';
import {REFERENCE_DOMAIN, referenceCoverage, validateReference} from './medical-reference-library.mjs';
import {ingestIntoStore} from './source-ingestion.mjs';
import {assessWithEvidence} from './clinical-evidence.mjs';

test('medical reference coverage requires anatomy and diagnosis sources', () => {
  assert.equal(referenceCoverage([]).ready, false);
  const sources=[
    {id:'a',domain:REFERENCE_DOMAIN.ANATOMY,contentAvailable:true,licenseStatus:'OPEN'},
    {id:'d',domain:REFERENCE_DOMAIN.DIAGNOSIS,contentAvailable:true,licenseStatus:'LICENSED'}
  ];
  assert.deepEqual(referenceCoverage(sources),{anatomy:1,diagnosis:1,ready:true});
});

test('unclear medical book rights are rejected', () => {
  assert.equal(validateReference({id:'d',domain:REFERENCE_DOMAIN.DIAGNOSIS,contentAvailable:true,licenseStatus:'UNKNOWN'}).valid,false);
});

test('diagnosis path refuses to diagnose without diagnostic-reference evidence', () => {
  const imported=ingestIntoStore({id:'anat',title:'Anatomy reference',provider:'Local',language:'tr',licenseStatus:'OPEN',documentType:'TEXTBOOK',domain:REFERENCE_DOMAIN.ANATOMY,text:'Kalp anatomisi ve normal yapısı.'});
  const result=assessWithEvidence({query:'kalp',store:imported.store,candidates:[{name:'örnek durum'}],requireDiagnosticReference:true});
  assert.equal(result.status,'DIAGNOSTIC_REFERENCE_REQUIRED');
  assert.equal(result.candidates.length,0);
});
