import test from 'node:test';
import assert from 'node:assert/strict';
import {mapUltrasoundFinding,atlasOverlayGate} from './atlas-mapping.mjs';
const IDENTITY=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];

test('known structure maps to Human Atlas mesh',()=>{const r=mapUltrasoundFinding({structureId:'heart',confidence:.92,transform:IDENTITY},[{structureId:'heart',system:'cardiovascular',terminology:'Heart',meshId:'atlas-heart'}]);assert.equal(r.status,'MAPPED');assert.equal(r.meshId,'atlas-heart');});
test('unknown structure never becomes a mapped atlas overlay',()=>{const r=mapUltrasoundFinding({structureId:'unknown'});assert.equal(r.status,'UNMAPPED');assert.equal(atlasOverlayGate(r,{registrationStatus:'TRACKING',calibrated:true,qualityStatus:'GOOD'}).visible,false);});
test('overlay requires tracking calibration and adequate quality',()=>{const r=mapUltrasoundFinding({structureId:'heart',transform:IDENTITY},[{structureId:'heart',meshId:'atlas-heart'}]);assert.equal(atlasOverlayGate(r,{registrationStatus:'LOCKED',calibrated:true,qualityStatus:'GOOD'}).visible,false);assert.equal(atlasOverlayGate(r,{registrationStatus:'TRACKING',calibrated:false,qualityStatus:'GOOD'}).visible,false);assert.equal(atlasOverlayGate(r,{registrationStatus:'TRACKING',calibrated:true,qualityStatus:'INSUFFICIENT'}).visible,false);assert.equal(atlasOverlayGate(r,{registrationStatus:'TRACKING',calibrated:true,qualityStatus:'GOOD'}).visible,true);});
test('invalid mapping input is rejected',()=>assert.equal(mapUltrasoundFinding({structureId:'heart',confidence:2}).status,'INVALID'));
