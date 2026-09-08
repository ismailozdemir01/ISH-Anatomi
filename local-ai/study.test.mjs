import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuiz, studyCard} from './study.mjs';

test('quiz is deterministic for a fixed seed',()=>{
  assert.deepEqual(createQuiz(3,42),createQuiz(3,42));
  assert.equal(createQuiz(3,42).questions.length,3);
});

test('study card exposes only known local structure',()=>{
  const card=studyCard('böbrek');
  assert.equal(card.status,'READY');
  assert.equal(card.structureId,'kidney');
  assert.equal(studyCard('bilinmeyen yapı').status,'UNKNOWN');
});
