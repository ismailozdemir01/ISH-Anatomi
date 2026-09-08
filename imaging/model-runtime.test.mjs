import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelSpec,validateModel,createInferenceAdapter} from './model-runtime.mjs';
test('unvalidated model cannot infer',async()=>{const model=createModelSpec({id:'m',name:'US model',version:'1'});assert.equal(validateModel(model).status,'NOT_CONFIGURED');const a=createInferenceAdapter({model,infer:async()=>({status:'READY'})});assert.equal((await a.infer({})).status,'NOT_CONFIGURED');});
test('validated adapter calls real inference function',async()=>{const model=createModelSpec({id:'m',name:'US model',version:'1',validated:true});const a=createInferenceAdapter({model,infer:async()=>({status:'READY',findings:[]})});assert.equal((await a.infer({})).status,'READY');});
