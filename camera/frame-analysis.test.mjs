import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePhoneFrame, comparePhoneFrames, CAMERA_FRAME_STATUS} from './frame-analysis.mjs';

function frame(value = 128, width = 64, height = 64) {
  return {width, height, gray: new Uint8Array(width * height).fill(value)};
}

test('rejects invalid phone camera dimensions and missing pixels', () => {
  assert.equal(analyzePhoneFrame({width: 10, height: 64, gray: new Uint8Array(640)}).status, CAMERA_FRAME_STATUS.INVALID);
  assert.equal(analyzePhoneFrame({width: 64, height: 64}).status, CAMERA_FRAME_STATUS.INSUFFICIENT);
});

test('analyzes a valid local grayscale camera frame', () => {
  const pixels = new Uint8Array(64 * 64);
  for (let i = 0; i < pixels.length; i += 1) pixels[i] = i % 256;
  const result = analyzePhoneFrame({width: 64, height: 64, gray: pixels});
  assert.equal(result.status, CAMERA_FRAME_STATUS.READY);
  assert.ok(result.score > 0);
  assert.ok(result.dynamicRange > 0);
  assert.ok(result.edgeDensity > 0);
  assert.ok(Array.isArray(result.reasons));
});

test('detects no change and local frame change without external services', () => {
  const a = frame(100);
  const same = frame(100);
  const changed = frame(200);
  assert.equal(comparePhoneFrames(a, same).meanAbsoluteDifference, 0);
  assert.ok(comparePhoneFrames(a, changed).meanAbsoluteDifference > 0);
  assert.equal(comparePhoneFrames(a, {width: 128, height: 64, gray: new Uint8Array(128 * 64)}).status, 'DIMENSION_MISMATCH');
});
