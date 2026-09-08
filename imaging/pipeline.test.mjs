import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveUltrasoundPipeline} from './pipeline.mjs';
import {createSession, FRAME_STATUS} from './core.mjs';

const frame = (timestamp, value = 10) => ({width: 64, height: 64, timestamp, data: new Uint8Array(64 * 64).fill(value)});

test('pipeline preserves source frame and exposes temporal quality', async () => {
  const seen = [];
  const pipeline = new LiveUltrasoundPipeline({
    quality: async () => ({status: 'GOOD', metrics: {contrast: 0.8, noise: 0.2, edgePreservation: 0.9}}),
    anatomy: async () => ({status: 'UNKNOWN', reason: 'MODEL_NOT_CONFIGURED'}),
    clinical: async () => ({status: 'NOT_CONFIGURED'})
  });
  pipeline.start(createSession({transport: 'usb', probeId: 'test-probe'}));
  const first = await pipeline.push(frame(1000, 10));
  const second = await pipeline.push(frame(1033, 11));
  seen.push(first, second);
  assert.equal(first.status, 'ANALYZED');
  assert.equal(first.temporal.status, 'NO_PREVIOUS_FRAME');
  assert.equal(second.temporal.status, 'READY');
  assert.ok(second.temporal.meanAbsoluteDifference > 0);
  assert.equal(second.enhancement.sourcePreserved, true);
  assert.equal(second.frame.status, FRAME_STATUS.READY);
  assert.equal(seen.length, 2);
});

test('insufficient quality stops downstream inference for that frame', async () => {
  let anatomyCalled = false;
  const pipeline = new LiveUltrasoundPipeline({
    quality: async () => ({status: 'INSUFFICIENT', reason: 'LOW_SIGNAL'}),
    anatomy: async () => { anatomyCalled = true; return {status: 'READY'}; }
  });
  pipeline.start(createSession({transport: 'wifi', probeId: 'quality-probe'}));
  const result = await pipeline.push(frame(2000));
  assert.equal(result.status, FRAME_STATUS.INSUFFICIENT_QUALITY);
  assert.equal(anatomyCalled, false);
});
