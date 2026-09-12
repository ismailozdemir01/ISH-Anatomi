const VALID_TRANSPORTS = new Set(['usb','wifi','bluetooth-le']);
const VALID_MODALITIES = new Set(['US']);
const VALID_MODES = new Set(['B-MODE','M-MODE','DOPPLER','COLOR-DOPPLER']);

export const FRAME_STATUS = Object.freeze({ READY:'READY', NO_SIGNAL:'NO_SIGNAL', INVALID_FRAME:'INVALID_FRAME', INSUFFICIENT_QUALITY:'INSUFFICIENT_QUALITY' });

function pixelLength(data) { return data && typeof data.length === 'number' && Number.isSafeInteger(data.length) ? data.length : 0; }

export function validateFrame(frame, previousTimestamp = null) {
  if (!frame || typeof frame !== 'object') return {status:FRAME_STATUS.INVALID_FRAME, reason:'FRAME_REQUIRED'};
  const width=Number(frame.width), height=Number(frame.height), timestamp=Number(frame.timestamp);
  if (!Number.isInteger(width)||width<64||width>16384||!Number.isInteger(height)||height<64||height>16384) return {status:FRAME_STATUS.INVALID_FRAME, reason:'INVALID_DIMENSIONS'};
  if (!Number.isFinite(timestamp)||timestamp<=0) return {status:FRAME_STATUS.INVALID_FRAME, reason:'INVALID_TIMESTAMP'};
  if (previousTimestamp!=null && timestamp<=Number(previousTimestamp)) return {status:FRAME_STATUS.INVALID_FRAME, reason:'NON_MONOTONIC_TIMESTAMP'};
  if (!frame.data) return {status:FRAME_STATUS.INVALID_FRAME, reason:'PIXEL_DATA_REQUIRED'};
  const length=pixelLength(frame.data);
  if (length<width*height) return {status:FRAME_STATUS.INVALID_FRAME, reason:'PIXEL_DATA_LENGTH_MISMATCH'};
  return {status:FRAME_STATUS.READY,width,height,timestamp,pixelCount:width*height};
}

export function createSession({transport, probeId, modality='US', mode='B-MODE'}={}) {
  if (!VALID_TRANSPORTS.has(transport)) throw new Error('UNSUPPORTED_TRANSPORT');
  if (!probeId) throw new Error('PROBE_ID_REQUIRED');
  if (!VALID_MODALITIES.has(modality)) throw new Error('UNSUPPORTED_MODALITY');
  if (!VALID_MODES.has(mode)) throw new Error('UNSUPPORTED_MODE');
  return {id:crypto.randomUUID(),probeId,transport,modality,mode,startedAt:Date.now(),frames:0,lastFrameAt:null,status:'CONNECTED'};
}

export function updateSession(session, frameResult) {
  if (!session) throw new Error('SESSION_REQUIRED');
  if (!frameResult||frameResult.status!==FRAME_STATUS.READY) return session;
  if (session.lastFrameAt!=null && frameResult.timestamp<=session.lastFrameAt) return {...session,status:'INVALID_FRAME_ORDER'};
  return {...session,frames:session.frames+1,lastFrameAt:frameResult.timestamp};
}

export function calculateFrameRate(timestamps) {
  if (!Array.isArray(timestamps)||timestamps.length<2) return 0;
  const first=Number(timestamps[0]), last=Number(timestamps[timestamps.length-1]);
  const seconds=(last-first)/1000;
  return seconds>0?(timestamps.length-1)/seconds:0;
}
