import test from 'node:test';
import assert from 'node:assert/strict';
import {ingestDocument,validateDocument} from './source-ingestion.mjs';
import {REFERENCE_DOMAIN} from './medical-reference-library.mjs';

test('ingestion preserves atlas scope on source and chunks',()=>{const r=ingestDocument({id:'heart-book',title:'Heart Reference',provider:'Test',language:'tr',licenseStatus:'OPEN',documentType:'TEXTBOOK',domain:REFERENCE_DOMAIN.DIAGNOSIS,structureId:'heart',groupId:'atlas:heart',meshId:'mesh-heart',text:'Kalp tanı referansı.'});assert.equal(r.status,'INGESTED');assert.equal(r.source.structureId,'heart');assert.equal(r.source.groupId,'atlas:heart');assert.equal(r.chunks[0].structureId,'heart');assert.equal(r.chunks[0].groupId,'atlas:heart');});
test('a group cannot exist without its structure',()=>assert.equal(validateDocument({id:'x',title:'x',provider:'x',language:'tr',licenseStatus:'OPEN',documentType:'TEXTBOOK',groupId:'atlas:heart',text:'x'}).reason,'STRUCTURE_ID_REQUIRED_FOR_GROUP'));
test('strict reference ingestion requires both structure and group',()=>assert.equal(validateDocument({id:'x',title:'x',provider:'x',language:'tr',licenseStatus:'OPEN',documentType:'TEXTBOOK',referenceScopeRequired:true,structureId:'heart',text:'x'}).reason,'REFERENCE_SCOPE_REQUIRED'));
