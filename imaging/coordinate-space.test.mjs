import test from 'node:test';
import assert from 'node:assert/strict';
import {identityTransform,validateRigidTransform,transformPoint,composeCoordinateChain} from './coordinate-space.mjs';

test('identity is a valid rigid transform',()=>assert.equal(validateRigidTransform(identityTransform()).valid,true));
test('translation is applied in column-major space',()=>{const m=identityTransform();m[12]=10;m[13]=-2;m[14]=3;assert.deepEqual(transformPoint(m,[1,2,3]),[11,0,6]);});
test('non-rigid scale is rejected',()=>{const m=identityTransform();m[0]=2;assert.equal(validateRigidTransform(m).valid,false);});
test('coordinate chain is composed',()=>{const a=identityTransform(),b=identityTransform(),c=identityTransform();a[12]=1;b[13]=2;c[14]=3;const r=composeCoordinateChain({probeToImage:a,imageToWorld:b,worldToAtlas:c});assert.deepEqual(transformPoint(r.probeToAtlas,[0,0,0]),[1,2,3]);});
