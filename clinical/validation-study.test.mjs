import test from 'node:test';
import assert from 'node:assert/strict';
import {ValidationStudy} from './validation-study.mjs';

test('validation study computes diagnostic performance without inventing cases',()=>{
  const study=new ValidationStudy({targetCases:4});
  study.addCase({caseId:'c1',reference:'POSITIVE',prediction:'POSITIVE',timestamp:1});
  study.addCase({caseId:'c2',reference:'NEGATIVE',prediction:'NEGATIVE',timestamp:2});
  study.addCase({caseId:'c3',reference:'NEGATIVE',prediction:'POSITIVE',timestamp:3});
  study.addCase({caseId:'c4',reference:'POSITIVE',prediction:'NEGATIVE',timestamp:4});
  const m=study.metrics();
  assert.equal(m.cases,4); assert.equal(m.complete,true); assert.equal(m.sensitivity,0.5); assert.equal(m.specificity,0.5); assert.equal(m.accuracy,0.5);
});

test('duplicate case IDs are rejected',()=>{
  const study=new ValidationStudy();
  study.addCase({caseId:'c1',reference:'POSITIVE',prediction:'POSITIVE'});
  assert.throws(()=>study.addCase({caseId:'c1',reference:'NEGATIVE',prediction:'NEGATIVE'}),/CASE_ALREADY_EXISTS/);
});
