import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFrame, createSession, calculateFrameRate} from './core.mjs';
import {assessFrameQuality} from './quality.mjs';
import {createRegistrationState, updateRegistration, registrationOverlay, validateTransform, isRegistrationStale} from './anatomy-registration.mjs';
import {LiveUltrasoundPipeline} from './pipeline.mjs';

const IDENTITY = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

test('rejects frames without real pixel data', () => {
  assert.equal(validateFrame({width:128,height:128,timestamp:1}).status, 'INVALID_FRAME');
});

test('quality gate analyzes supplied pixels without inventing data', () => {
  const data = new Uint8Array(128*128); data.fill(120);
  const q = assessFrameQuality({width:128,height:128,timestamp:1,data});
  assert.equal(q.status, 'INSUFFICIENT');
  assert.ok(q.reasons.includes('LOW_CONTRAST'));
});

test('registration remains hidden until anatomical localization exists', () => {
  const state = createRegistrationState();
  assert.equal(registrationOverlay(state).visible, false);
  const next = updateRegistration(state,{structureId:'heart',confidence:0.93,plane:{orientation:'sagittal'},transform:IDENTITY,timestamp:1000},1000);
  assert.equal(next.status,'TRACKING');
  assert.equal(registrationOverlay(next,1000).visible,true);
});

test('registration rejects malformed transforms instead of exposing an unsafe overlay', () => {
  assert.equal(validateTransform([1,2,3]).valid, false);
  const state = createRegistrationState();
  const next = updateRegistration(state,{structureId:'heart',confidence:0.95,transform:[...IDENTITY.slice(0,15),2],timestamp:1000},1000);
  assert.equal(next.status,'LOST');
  assert.equal(registrationOverlay(next,1000).visible,false);
});

test('registration transitions low confidence to LOST', () => {
  const state = createRegistrationState();
  const next = updateRegistration(state,{structureId:'heart',confidence:0.4,transform:IDENTITY,timestamp:1000},1000);
  assert.equal(next.status,'LOST');
  assert.equal(registrationOverlay(next,1000).visible,false);
});

test('registration overlay becomes hidden when tracking is stale', () => {
  const state = updateRegistration(createRegistrationState({staleAfterMs:500}),{structureId:'heart',confidence:0.9,transform:IDENTITY,timestamp:1000},1000);
  assert.equal(isRegistrationStale(state,1499),false);
  assert.equal(isRegistrationStale(state,1501),true);
  assert.equal(registrationOverlay(state,1501).visible,false);
});

test('pipeline processes continuous valid frames', async () => {
  const session = createSession({transport:'usb',probeId:'probe-1'});
  const pipeline = new LiveUltrasoundPipeline({
    quality: async () => ({status:'SUFFICIENT',score:0.9}),
    anatomy: async () => ({status:'TRACKING',structureId:'heart',confidence:0.9}),
    clinical: async () => ({status:'INSUFFICIENT_EVIDENCE',findings:[],diagnosticCandidates:[]})
  });
  pipeline.start(session);
  const data = new Uint8Array(64*64); data.fill(1); data[10]=255;
  const result = await pipeline.push({width:64,height:64,timestamp:1000,data});
  assert.equal(result.status,'ANALYZED');
  assert.equal(result.session.frames,1);
  assert.equal(result.anatomy.structureId,'heart');
});

test('frame rate is computed from timestamps', () => {
  assert.equal(calculateFrameRate([0,100,200,300]),10);
});
