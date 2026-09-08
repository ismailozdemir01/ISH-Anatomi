import test from 'node:test';
import assert from 'node:assert/strict';
import {answerAnatomyQuestion, findKnowledge} from './knowledge.mjs';

test('Turkish structure resolves to verified local record', () => {
  const result = answerAnatomyQuestion('Kalp nedir?');
  assert.equal(result.status, 'KNOWN');
  assert.equal(result.structureId, 'heart');
  assert.match(result.answer, /Kalp/);
});

test('Latin/English aliases resolve locally', () => {
  assert.equal(findKnowledge('cor')?.id, 'heart');
  assert.equal(findKnowledge('kidney')?.id, 'kidney');
});

test('unknown anatomy is explicit and never fabricated', () => {
  const result = answerAnatomyQuestion('xyzabc anatomik yapı');
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.structureId, undefined);
});
