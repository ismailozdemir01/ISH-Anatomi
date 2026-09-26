import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const main=await readFile(path.join(root,'desktop','main.cjs'),'utf8');

test('phone camera never fabricates anatomical identity',()=>{
  assert.equal(main.includes('atlasHint'),false);
  assert.equal(main.includes('OPENAI_API_KEY'),false);
  assert.equal(main.includes('api.openai.com'),false);
  assert.equal(main.includes('vision-anatomy-localizer'),false);
  assert.match(main,/status:'NOT_CONFIGURED'/);
  assert.match(main,/LOCAL_ANATOMY_MODEL_REQUIRED/);
  assert.match(main,/REAL_ANATOMICAL_LOCALIZER_REQUIRED/);
});

test('phone camera frames enter the real local imaging pipeline',()=>{
  assert.match(main,/source:'PHONE_CAMERA'/);
  assert.match(main,/liveController\\.start\\(\\{transport:'wifi',source:'PHONE_CAMERA'/);
  assert.match(main,/liveController\\.push\\(pipelineFrame\\)/);
});
