import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateImagingSafety} from './safety-gate.mjs';
import {createCalibrationProfile} from './calibration.mjs';

test('safety gate blocks incomplete imaging state',()=>{const r=evaluateImagingSafety({quality:{status:'GOOD',score:.9},registration:{status:'LOCKED'},calibration:createCalibrationProfile({probeId:'p',pixelSpacing:[.2,.2,1]})});assert.equal(r.overlayAllowed,false);assert.ok(r.reasons.includes('REGISTRATION_NOT_TRACKING'));});
test('safety gate allows only fully valid tracking state',()=>{const c=createCalibrationProfile({probeId:'p',pixelSpacing:[.2,.2,1]});const r=evaluateImagingSafety({quality:{status:'GOOD',score:.9},registration:{status:'TRACKING',updatedAt:Date.now(),staleAfterMs:1000},calibration:c,temporal:{reacquisitionRequired:false}});assert.equal(r.overlayAllowed,true);});
