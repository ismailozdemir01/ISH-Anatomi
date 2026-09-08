import test from 'node:test';
import assert from 'node:assert/strict';
import {TemporalFrameTracker} from './temporal.mjs';

test('temporal tracker keeps consecutive anatomy state', () => {
  const tracker=new TemporalFrameTracker({windowSize:3});
  tracker.push({timestamp:1000,anatomy:{structureId:'heart',confidence:.8},quality:{status:'GOOD'}});
  const s=tracker.push({timestamp:1033,anatomy:{structureId:'heart',confidence:.9},quality:{status:'GOOD'}});
  assert.equal(s.structureStable,true);
  assert.equal(s.deltaMs,33);
  assert.equal(Number(s.confidenceDelta.toFixed(2)),.1);
});

test('temporal tracker does not invent state', () => {
  const tracker=new TemporalFrameTracker();
  const s=tracker.push({timestamp:1000});
  assert.equal(s.current.structureId,null);
  assert.equal(s.current.measurements,null);
  assert.equal(s.structureStable,false);
});
