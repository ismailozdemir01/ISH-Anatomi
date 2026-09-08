import test from 'node:test';
import assert from 'node:assert/strict';
import {validateClinicalOutput,auditEvent} from './safety.mjs';
test('blocks unvalidated or provenance-free clinical output',()=>{assert.equal(validateClinicalOutput({status:'READY',modelValidated:false,evidence:[]}).status,'BLOCKED');assert.equal(validateClinicalOutput({status:'NO_EVIDENCE'}).reason,'NO_EVIDENCE');});
test('audit event has immutable-time provenance fields',()=>{const r=auditEvent({event:'FRAME_ANALYZED',source:'probe-1',model:'m1'});assert.ok(r.timestamp);assert.equal(r.source,'probe-1');assert.equal(r.model,'m1');});
