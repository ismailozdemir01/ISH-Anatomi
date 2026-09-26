import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const main=await readFile(path.join(root,'desktop','main.cjs'),'utf8');

test('phone anatomy matching is local and never atlasHint-driven',()=>{
  assert.equal(main.includes('atlasHint'),false);
  assert.equal(main.includes('OPENAI_API_KEY'),false);
  assert.equal(main.includes('api.openai.com'),false);
  assert.equal(main.includes('vision-anatomy-localizer'),false);
  assert.match(main,/Xenova\/clip-vit-base-patch32/);
  assert.match(main,/visual:atlas-match/);
  assert.match(main,/localVisualAtlasMatch/);
  assert.match(main,/atlasConcepts = \$\{JSON\.stringify\(atlasConcepts\)\}/);
});

test('visual matcher rejects weak matches instead of fabricating Atlas selection',()=>{
  assert.match(main,/LOW_VISUAL_CONFIDENCE/);
  assert.match(main,/confidence<0\.28/);
});
