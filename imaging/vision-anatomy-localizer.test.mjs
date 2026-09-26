import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisionAnatomyLocalizer} from './vision-anatomy-localizer.mjs';

test('requires an API key', async () => {
  const localizer=createVisionAnatomyLocalizer({apiKey:null});
  const result=await localizer.locate({imageBase64:'abc'});
  assert.equal(result.status,'NOT_CONFIGURED');
});

test('maps vision result to an Atlas concept', async () => {
  let calls=0;
  const localizer=createVisionAnatomyLocalizer({
    apiKey:'test',
    intervalMs:0,
    resolveConcept:query=>query==='heart'?{id:'heart',groupId:'atlas:heart'}:null,
    fetchImpl:async()=>{calls++;return {
      ok:true,
      json:async()=>({output_text:'{"query":"heart","confidence":0.94,"region":"thorax"}'})
    };}
  });
  const result=await localizer.locate({imageBase64:'abc'});
  assert.equal(result.status,'READY');
  assert.equal(result.structureId,'heart');
  assert.equal(result.groupId,'atlas:heart');
  assert.equal(result.registration.status,'VISUAL_AI');
  assert.equal(calls,1);
});

test('rejects low-confidence identification', async () => {
  const localizer=createVisionAnatomyLocalizer({
    apiKey:'test',
    intervalMs:0,
    fetchImpl:async()=>({ok:true,json:async()=>({output_text:'{"query":"heart","confidence":0.2,"region":"thorax"}'})})
  });
  const result=await localizer.locate({imageBase64:'abc'});
  assert.equal(result.status,'UNKNOWN');
  assert.equal(result.reason,'ANATOMY_NOT_IDENTIFIED');
});
