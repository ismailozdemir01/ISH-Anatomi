import test from 'node:test';
import assert from 'node:assert/strict';
import {createCalibrationProfile,validateCalibration,calibrationStatus,calibrationGate} from './calibration.mjs';

test('calibration profile requires positive pixel spacing',()=>assert.throws(()=>createCalibrationProfile({probeId:'p1',pixelSpacing:[0.1,0.1,0]}),/INVALID_PIXEL_SPACING/));
test('valid calibration permits overlay',()=>{const p=createCalibrationProfile({probeId:'p1',pixelSpacing:[0.2,0.2,1]});assert.equal(validateCalibration(p).valid,true);assert.equal(calibrationGate(p).overlayAllowed,true);});
test('expired calibration blocks overlay',()=>{const p=createCalibrationProfile({probeId:'p1',pixelSpacing:[0.2,0.2,1],validUntil:100});assert.equal(calibrationStatus(p,101).status,'EXPIRED');assert.equal(calibrationGate(p,101).overlayAllowed,false);});
