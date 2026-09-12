import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnatomyMapper,mapObservation} from './semantic-mapping.mjs';

test('known anatomy term maps to structure',()=>{const mapper=createAnatomyMapper([{id:'heart',name:'Kalp',aliases:['yürek']}]);const r=mapper.resolve('Kalp');assert.equal(r.status,'MAPPED');assert.equal(r.structureId,'heart');});
test('unknown term never fabricates a structure',()=>{const mapper=createAnatomyMapper([]);assert.equal(mapper.resolve('bilinmeyen').status,'UNMAPPED');assert.equal(mapObservation({term:'bilinmeyen',mapper}).structureId,null);});
test('mapping reports whether observation has source evidence',()=>{const mapper=createAnatomyMapper([{id:'heart',name:'Kalp'}]);assert.equal(mapObservation({term:'kalp',mapper,sourceFrameId:'f1',timestamp:123}).evidenceBound,true);});
