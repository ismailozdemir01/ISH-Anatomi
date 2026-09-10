import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoseFilter, filterPose} from './pose-filter.mjs';

test('smooths orientation without breaking circular angles', () => {
  const filter = createPoseFilter({alpha:0.5});
  assert.equal(filterPose(filter,{alpha:179,beta:0,gamma:0}).pose.alpha,179);
  const result = filterPose(filter,{alpha:-179,beta:0,gamma:0});
  assert.ok(result.pose.alpha > 179 || result.pose.alpha < -179);
});

test('limits an abrupt sensor jump per sample', () => {
  const filter = createPoseFilter({alpha:0.5,maxDeltaPerSample:10});
  filterPose(filter,{alpha:0,beta:0,gamma:0});
  const result = filterPose(filter,{alpha:100,beta:0,gamma:0});
  assert.equal(result.pose.alpha,5);
});

test('rejects invalid orientation data', () => {
  const filter = createPoseFilter();
  assert.equal(filterPose(filter,{alpha:'x',beta:0,gamma:0}).status,'INVALID_POSE');
});
