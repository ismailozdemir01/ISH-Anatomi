import test from 'node:test';
import assert from 'node:assert/strict';
import {chunkDocument,buildIndex,searchEvidence} from './evidence-engine.mjs';
import {assessWithEvidence} from './clinical-evidence.mjs';
import {SOURCE_TYPES,SOURCE_STATUS} from './source-registry.mjs';

const source={id:'book-1',title:'Open Clinical Reference',provider:'Test Publisher',type:SOURCE_TYPES.TEXTBOOK,status:SOURCE_STATUS.ACTIVE,contentAvailable:true};
const doc={id:'book-1',chapter:'Cardiology',section:'Ultrasound',text:'Echocardiography can demonstrate cardiac chamber size and ventricular function.\n\nAssessment should combine imaging findings with the clinical context.'};
const store=buildIndex(chunkDocument(doc),new Map([[source.id,source]]));

test('chunks and indexes imported source',()=>{assert.ok(store.chunks.size>0);assert.ok(store.index.has('echocardiography'));});
test('retrieves evidence with provenance',()=>{const r=searchEvidence('ventricular function',store);assert.equal(r.status,'READY');assert.equal(r.results[0].source.title,source.title);});
test('does not retrieve non-indexable source',()=>{const blocked={...source,id:'blocked',status:SOURCE_STATUS.LICENSE_REQUIRED};const s=buildIndex(chunkDocument({...doc,id:'blocked'}),new Map([[blocked.id,blocked]]));const r=searchEvidence('ventricular function',s);assert.equal(r.status,'NO_MATCH');});
test('clinical layer returns evidence rather than invented certainty',()=>{const r=assessWithEvidence({query:'ventricular function',candidates:[{name:'cardiac dysfunction'}],store});assert.equal(r.status,'EVIDENCE_AVAILABLE');assert.ok(r.evidence.length>0);});
