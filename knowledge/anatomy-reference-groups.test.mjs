import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReferenceGroups,resolveReferenceGroup,referenceGroupId} from './anatomy-reference-groups.mjs';
import {ingestIntoStore} from './source-ingestion.mjs';
import {searchEvidence} from './evidence-engine.mjs';
import {assessWithEvidence,DECISION_STATUS} from './clinical-evidence.mjs';
import {REFERENCE_DOMAIN} from './medical-reference-library.mjs';
const atlas=[{id:'heart',name:'Kalp',meshId:'mesh-heart'},{id:'left-ventricle',name:'Sol ventrikül',parentStructureId:'heart',meshId:'mesh-lv'},{id:'kidney',name:'Böbrek',meshId:'mesh-kidney'}];
const doc=(id,domain,text)=>({id,title:id,provider:'TEST',language:'tr',licenseStatus:'OPEN',documentType:'TEXTBOOK',domain,structureId:id,groupId:referenceGroupId(id),text});
function makeStore(){let s={};for(const d of [doc('heart',REFERENCE_DOMAIN.ANATOMY,'Kalp anatomisi.'),doc('heart',REFERENCE_DOMAIN.DIAGNOSIS,'Kalp hastalıkları tanı bulguları.'),doc('kidney',REFERENCE_DOMAIN.DIAGNOSIS,'Böbrek hastalıkları tanı bulguları.')])s=ingestIntoStore(d,s).store;return s;}
test('each atlas structure has an independent group',()=>{const g=buildReferenceGroups(atlas);assert.equal(g.size,3);assert.equal(g.get('atlas:heart').meshId,'mesh-heart');assert.equal(g.get('atlas:left-ventricle').parentGroupId,'atlas:heart');});
test('group resolution is exact',()=>{assert.equal(resolveReferenceGroup({structureId:'heart',catalog:atlas}).groupId,'atlas:heart');assert.equal(resolveReferenceGroup({structureId:'unknown',catalog:atlas}).status,'UNMAPPED');assert.equal(resolveReferenceGroup({structureId:'heart',groupId:'atlas:kidney',catalog:atlas}).status,'CONFLICT');});
test('heart search excludes kidney',()=>{const r=searchEvidence('hastalıkları tanı bulguları',makeStore(),{structureId:'heart',groupId:'atlas:heart',domain:REFERENCE_DOMAIN.DIAGNOSIS});assert.equal(r.status,'READY');assert.ok(r.results.every(x=>x.structureId==='heart'&&x.groupId==='atlas:heart'));});
test('diagnosis requires anatomical scope',()=>{const r=assessWithEvidence({query:'kalp hastalıkları',store:makeStore(),requireDiagnosticReference:true,structureId:'heart'});assert.equal(r.status,DECISION_STATUS.ANATOMICAL_REFERENCE_SCOPE_REQUIRED);});
test('heart diagnosis uses heart references only',()=>{const r=assessWithEvidence({query:'kalp hastalıkları tanı',store:makeStore(),requireDiagnosticReference:true,structureId:'heart',groupId:'atlas:heart'});assert.equal(r.status,DECISION_STATUS.EVIDENCE_AVAILABLE);assert.ok(r.diagnosticEvidence.length>0);assert.ok(r.diagnosticEvidence.every(x=>x.structureId==='heart'));});
test('kidney diagnosis cannot satisfy heart scope',()=>{let s={};s=ingestIntoStore(doc('kidney',REFERENCE_DOMAIN.DIAGNOSIS,'Kalp hastalıkları tanı bulguları.'),s).store;const r=assessWithEvidence({query:'kalp hastalıkları tanı',store:s,requireDiagnosticReference:true,structureId:'heart',groupId:'atlas:heart'});assert.equal(r.status,DECISION_STATUS.DIAGNOSTIC_REFERENCE_REQUIRED);});
