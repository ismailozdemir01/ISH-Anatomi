const VALID_TRANSPORTS = new Set(['usb','wifi','bluetooth-le']);

export const FRAME_STATUS = Object.freeze({
  READY: 'READY',
  NO_SIGNAL: 'NO_SIGNAL',
  INVALID_FRAME: 'INVALID_FRAME',
  INSUFFICIENT_QUALITY: 'INSUFFICIENT_QUALITY'
});

export function validateFrame(frame) {
  if (!frame || typeof frame !== 'object') return {status: FRAME_STATUS.INVALID_FRAME, reason: 'FRAME_REQUIRED'};
  const width = Number(frame.width);
  const height = Number(frame.height);
  const timestamp = Number(frame.timestamp);
  if (!Number.isInteger(width) || width < 64 || !Number.isInteger(height) || height < 64) {
    return {status: FRAME_STATUS.INVALID_FRAME, reason: 'INVALID_DIMENSIONS'};
  }
  if (!Number.isFinite(timestamp) || timestamp <= 0) return {status: FRAME_STATUS.INVALID_FRAME, reason: 'INVALID_TIMESTAMP'};
  if (!frame.data) return {status: FRAME_STATUS.INVALID_FRAME, reason: 'PIXEL_DATA_REQUIRED'};
  return {status: FRAME_STATUS.READY, width, height, timestamp};
}

export function createSession({transport, probeId, modality = 'US', mode = 'B-MODE'} = {}) {
  if (!VALID_TRANSPORTS.has(transport)) throw new Error('UNSUPPORTED_TRANSPORT');
  if (!probeId) throw new Error('PROBE_ID_REQUIRED');
  return {
    id: crypto.randomUUID(), probeId, transport, modality, mode,
    startedAt: Date.now(), frames: 0, lastFrameAt: null,
    status: 'CONNECTED'
  };
}

export function updateSession(session, frameResult) {
  if (!session) throw new Error('SESSION_REQUIRED');
  if (!frameResult || frameResult.status !== FRAME_STATUS.READY) return session;
  return {...session, frames: session.frames + 1, lastFrameAt: frameResult.timestamp};
}

export function calculateFrameRate(timestamps) {
  if (!Array.isArray(timestamps) || timestamps.length < 2) return 0;
  const first = Number(timestamps[0]);
  const last = Number(timestamps[timestamps.length - 1]);
  const seconds = (last - first) / 1000;
  return seconds > 0 ? (timestamps.length - 1) / seconds : 0;
}
