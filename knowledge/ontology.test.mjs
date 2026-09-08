import test from 'node:test';
import assert from 'node:assert/strict';
import {createConcept,mapConcept,mapCase} from './ontology.mjs';
test('maps exact term and synonym',()=>{const c=createConcept({id:'fma:1',term:'Kalp',type:'ANATOMY',synonyms:['heart']});assert.equal(mapConcept('heart',[c]).status,'MAPPED');assert.equal(mapConcept('heart',[c]).concept.id,'fma:1');});
test('unmapped terms stay explicit',()=>{assert.equal(mapConcept('bilinmeyen',[]).status,'UNMAPPED');});
test('maps case dimensions independently',()=>{const c=createConcept({id:'x',term:'heart',type:'ANATOMY'});const r=mapCase({observations:['heart'],measurements:['unknown'],imagingFindings:[]},[c]);assert.equal(r.observations[0].status,'MAPPED');assert.equal(r.measurements[0].status,'UNMAPPED');});
