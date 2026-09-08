import test from 'node:test';
import assert from 'node:assert/strict';
import {compileIntent, normalizeQuery} from './intent.mjs';

test('normalizes Turkish input',()=>assert.equal(normalizeQuery('  BÖBREK  '),'bobrek'));
test('compiles anatomy search',()=>{
  const r=compileIntent('kalbi göster');
  assert.equal(r.type,'anatomy_query');
  assert.ok(r.actions.some(a=>a.type==='search'&&a.query==='kalp'));
});
test('compiles viewer controls',()=>{
  const r=compileIntent('iskelet sistemini arkadan patlat ve döndür');
  assert.ok(r.actions.some(a=>a.type==='system'&&a.id==='skeleton'));
  assert.ok(r.actions.some(a=>a.type==='view'&&a.view==='back'));
  assert.ok(r.actions.some(a=>a.type==='explode'&&a.value===1));
  assert.ok(r.actions.some(a=>a.type==='rotate'&&a.value===true));
});
test('empty input is deterministic',()=>assert.equal(compileIntent('').type,'empty'));
