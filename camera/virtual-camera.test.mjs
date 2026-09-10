import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualCameraState,enableVirtualCamera,mapPoseToCameraDrag} from './virtual-camera.mjs';

test('virtual camera ignores pose while disabled',()=>{
  const state=createVirtualCameraState();
  const result=mapPoseToCameraDrag(state,{alpha:10,beta:20,gamma:30});
  assert.equal(result.status,'DISABLED');
  assert.equal(result.drag,null);
});

test('virtual camera maps orientation deltas to bounded drag',()=>{
  let state=enableVirtualCamera(createVirtualCameraState({sensitivityX:1,sensitivityY:1,maxStep:10,poseSmoothing:1}),true);
  ({state}=mapPoseToCameraDrag(state,{alpha:0,beta:0,gamma:0}));
  const result=mapPoseToCameraDrag(state,{alpha:20,beta:8,gamma:0});
  assert.equal(result.status,'READY');
  assert.equal(result.drag.dx,10);
  assert.equal(result.drag.dy,8);
});

test('dead-zone suppresses micro movements',()=>{
  let state=enableVirtualCamera(createVirtualCameraState({sensitivityX:1,sensitivityY:1,deadZone:1,poseSmoothing:1}),true);
  ({state}=mapPoseToCameraDrag(state,{alpha:10,beta:20,gamma:30}));
  const result=mapPoseToCameraDrag(state,{alpha:10.5,beta:20.9,gamma:30});
  assert.equal(result.status,'READY');
  assert.equal(result.drag.dx,0);
  assert.equal(result.drag.dy,0);
});

test('alpha wraparound uses shortest angular path',()=>{
  let state=enableVirtualCamera(createVirtualCameraState({sensitivityX:1,maxStep:100,poseSmoothing:1}),true);
  ({state}=mapPoseToCameraDrag(state,{alpha:359,beta:0,gamma:0}));
  const result=mapPoseToCameraDrag(state,{alpha:1,beta:0,gamma:0});
  assert.equal(result.drag.dx,2);
});

test('maxStep bounds large orientation changes',()=>{
  let state=enableVirtualCamera(createVirtualCameraState({sensitivityX:1,sensitivityY:1,maxStep:7,poseSmoothing:1}),true);
  ({state}=mapPoseToCameraDrag(state,{alpha:0,beta:0,gamma:0}));
  const result=mapPoseToCameraDrag(state,{alpha:90,beta:-90,gamma:0});
  assert.equal(result.drag.dx,7);
  assert.equal(result.drag.dy,-7);
});

test('invalid pose never produces camera movement',()=>{
  const state=enableVirtualCamera(createVirtualCameraState(),true);
  const result=mapPoseToCameraDrag(state,{alpha:'x',beta:1,gamma:2});
  assert.equal(result.status,'INVALID_POSE');
  assert.equal(result.drag,null);
});
