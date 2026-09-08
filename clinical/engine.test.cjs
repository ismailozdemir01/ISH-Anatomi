const test = require('node:test');
const assert = require('node:assert/strict');
const {STATUS, assess} = require('./engine.cjs');

test('clinical engine refuses empty input',()=>{
  const result = assess({});
  assert.equal(result.status, STATUS.INSUFFICIENT_DATA);
  assert.deepEqual(result.differential, []);
});

test('clinical engine never invents a diagnosis without a validated model',()=>{
  const result = assess({symptoms:['baş dönmesi'], observations:['denge kaybı']});
  assert.equal(result.status, STATUS.NOT_CONFIGURED);
  assert.deepEqual(result.differential, []);
  assert.match(result.explanation, /tanı uydurmaz/i);
});
