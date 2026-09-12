export const CALIBRATION_STATUS = Object.freeze({ VALID:'VALID', INVALID:'INVALID', EXPIRED:'EXPIRED', NOT_CONFIGURED:'NOT_CONFIGURED' });

function finite(n){return Number.isFinite(Number(n));}
function vector3(v){return Array.isArray(v)&&v.length===3&&v.every(finite);}

export function validateCalibration(calibration={}) {
  if(!calibration || typeof calibration!=='object') return {valid:false,status:CALIBRATION_STATUS.INVALID,reason:'CALIBRATION_REQUIRED'};
  const pixelSpacing=calibration.pixelSpacing;
  const origin=calibration.origin;
  if(!vector3(pixelSpacing)||pixelSpacing.some(v=>Number(v)<=0)) return {valid:false,status:CALIBRATION_STATUS.INVALID,reason:'INVALID_PIXEL_SPACING'};
  if(origin!=null&&!vector3(origin)) return {valid:false,status:CALIBRATION_STATUS.INVALID,reason:'INVALID_ORIGIN'};
  if(calibration.transform!=null && (!Array.isArray(calibration.transform)||calibration.transform.length!==16||!calibration.transform.every(finite))) return {valid:false,status:CALIBRATION_STATUS.INVALID,reason:'INVALID_TRANSFORM'};
  if(calibration.validUntil!=null && (!finite(calibration.validUntil)||Number(calibration.validUntil)<=0)) return {valid:false,status:CALIBRATION_STATUS.INVALID,reason:'INVALID_EXPIRY'};
  return {valid:true,status:CALIBRATION_STATUS.VALID};
}

export function createCalibrationProfile({probeId,modality='US',pixelSpacing,origin=[0,0,0],transform=null,createdAt=Date.now(),validUntil=null}={}) {
  if(!probeId) throw new Error('PROBE_ID_REQUIRED');
  const profile={id:crypto.randomUUID(),probeId,modality,pixelSpacing:[...(pixelSpacing??[])],origin:[...origin],transform:transform?[...transform]:null,createdAt,validUntil};
  const result=validateCalibration(profile); if(!result.valid) throw new Error(result.reason); return profile;
}

export function calibrationStatus(profile,now=Date.now()) {
  const check=validateCalibration(profile); if(!check.valid)return check;
  if(profile.validUntil!=null&&Number(now)>Number(profile.validUntil)) return {valid:false,status:CALIBRATION_STATUS.EXPIRED,reason:'CALIBRATION_EXPIRED'};
  return {valid:true,status:CALIBRATION_STATUS.VALID};
}

export function calibrationGate(profile,now=Date.now()) {
  const result=calibrationStatus(profile,now);
  return {...result,overlayAllowed:result.valid};
}
