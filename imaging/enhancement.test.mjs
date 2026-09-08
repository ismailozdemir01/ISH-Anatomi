import test from 'node:test';
import assert from 'node:assert/strict';
import {enhanceGrayscaleFrame} from './enhancement.mjs';

test('enhancement preserves frame dimensions and returns quality metrics', () => {
  const data = new Uint8Array(128 * 128);
  for (let i = 0; i < data.length; i++) data[i] = 80 + (i % 80);
  const result = enhanceGrayscaleFrame({width:128,height:128,timestamp:1,data});
  assert.equal(result.frame.width, 128);
  assert.equal(result.frame.height, 128);
  assert.equal(result.frame.data.length, data.length);
  assert.ok(result.qualityBefore);
  assert.ok(result.qualityAfter);
  assert.equal(result.frame.enhancement.sourcePreserved, true);
});

test('enhancement rejects missing pixel data', () => {
  assert.throws(() => enhanceGrayscaleFrame({width:64,height:64,timestamp:1}), /PIXEL_DATA_REQUIRED/);
});
