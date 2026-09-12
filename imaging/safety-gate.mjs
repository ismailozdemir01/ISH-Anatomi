import {QUALITY_STATUS} from './quality.mjs';
import {REGISTRATION_STATUS,isRegistrationStale} from './anatomy-registration.mjs';
import {calibrationStatus} from './calibration.mjs';

export const SAFETY_GATE_STATUS=Object.freeze({ALLOW:'ALLOW',BLOCK:'BLOCK'});
export function evaluateImagingSafety({quality=null,registration=null,calibration=null,temporal=null,now=Date.now(),minimumQuality=.55}={}){
  const reasons=[];
  if(!quality||quality.status===QUALITY_STATUS.INSUFFICIENT||Number(quality.score)<minimumQuality)reasons.push('QUALITY_INSUFFICIENT');
  if(!registration||registration.status!==REGISTRATION_STATUS.TRACKING)reasons.push('REGISTRATION_NOT_TRACKING');
  else if(isRegistrationStale(registration,now))reasons.push('REGISTRATION_STALE');
  if(!calibration||calibrationStatus(calibration,now).valid!==true)reasons.push('CALIBRATION_INVALID');
  if(temporal?.reacquisitionRequired)reasons.push('TEMPORAL_REACQUISITION_REQUIRED');
  return {status:reasons.length?SAFETY_GATE_STATUS.BLOCK:SAFETY_GATE_STATUS.ALLOW,overlayAllowed:reasons.length===0,reasons};
}
