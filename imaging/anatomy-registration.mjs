export const REGISTRATION_STATUS = Object.freeze({
  LOCKED: 'LOCKED',
  TRACKING: 'TRACKING',
  LOST: 'LOST',
  UNKNOWN: 'UNKNOWN'
});

export const REGISTRATION_REASON = Object.freeze({
  NO_LOCALIZATION: 'ANATOMICAL_LOCALIZATION_UNAVAILABLE',
  INVALID_OBSERVATION: 'INVALID_REGISTRATION_OBSERVATION',
  INVALID_TRANSFORM: 'INVALID_TRANSFORM',
  INVALID_PLANE: 'INVALID_PLANE',
  STALE: 'REGISTRATION_STALE'
});

const TRACKING_THRESHOLD = 0.85;
const LOCK_THRESHOLD = 0.60;
const DEFAULT_STALE_AFTER_MS = 750;
const MATRIX_EPSILON = 1e-3;

function finite(value) {
  return Number.isFinite(Number(value));
}

function normalizeTimestamp(value, fallback = Date.now()) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function validateTransform(transform) {
  if (!Array.isArray(transform) || transform.length !== 16) return {valid: false, reason: REGISTRATION_REASON.INVALID_TRANSFORM};
  if (!transform.every(finite)) return {valid: false, reason: REGISTRATION_REASON.INVALID_TRANSFORM};

  // Column-major 4x4 homogeneous transform: last row must be [0,0,0,1].
  if (Math.abs(Number(transform[3])) > MATRIX_EPSILON ||
      Math.abs(Number(transform[7])) > MATRIX_EPSILON ||
      Math.abs(Number(transform[11])) > MATRIX_EPSILON ||
      Math.abs(Number(transform[15]) - 1) > MATRIX_EPSILON) {
    return {valid: false, reason: REGISTRATION_REASON.INVALID_TRANSFORM};
  }

  const x = [Number(transform[0]), Number(transform[1]), Number(transform[2])];
  const y = [Number(transform[4]), Number(transform[5]), Number(transform[6])];
  const z = [Number(transform[8]), Number(transform[9]), Number(transform[10])];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => Math.sqrt(dot(a, a));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const det = dot(x, cross(y, z));
  if (![x, y, z].every(v => Math.abs(norm(v) - 1) <= 0.03) ||
      Math.abs(dot(x, y)) > 0.03 || Math.abs(dot(x, z)) > 0.03 || Math.abs(dot(y, z)) > 0.03 ||
      Math.abs(det - 1) > 0.05) {
    return {valid: false, reason: REGISTRATION_REASON.INVALID_TRANSFORM};
  }
  return {valid: true};
}

export function validatePlane(plane) {
  if (plane == null) return {valid: true, value: null};
  if (typeof plane !== 'object') return {valid: false, reason: REGISTRATION_REASON.INVALID_PLANE};
  const orientation = plane.orientation ?? plane.name ?? null;
  if (orientation != null && typeof orientation !== 'string') return {valid: false, reason: REGISTRATION_REASON.INVALID_PLANE};
  for (const key of ['origin', 'normal']) {
    if (plane[key] != null && (!Array.isArray(plane[key]) || plane[key].length !== 3 || !plane[key].every(finite))) {
      return {valid: false, reason: REGISTRATION_REASON.INVALID_PLANE};
    }
  }
  return {valid: true, value: structuredClone(plane)};
}

export function createRegistrationState({staleAfterMs = DEFAULT_STALE_AFTER_MS} = {}) {
  if (!Number.isFinite(staleAfterMs) || staleAfterMs < 1) throw new Error('INVALID_STALE_TIMEOUT');
  return {
    status: REGISTRATION_STATUS.UNKNOWN,
    structureId: null,
    confidence: null,
    plane: null,
    transform: null,
    updatedAt: null,
    staleAfterMs
  };
}

export function updateRegistration(state, observation = {}, now = Date.now()) {
  if (!state || typeof state !== 'object') throw new Error('REGISTRATION_STATE_REQUIRED');
  const timestamp = normalizeTimestamp(observation.timestamp, now);
  const structureId = typeof observation.structureId === 'string' ? observation.structureId.trim() : '';
  const confidence = Number(observation.confidence);
  const transformCheck = validateTransform(observation.transform);
  const planeCheck = validatePlane(observation.plane);

  if (!structureId || !Number.isFinite(confidence)) {
    return {...state, status: REGISTRATION_STATUS.LOST, updatedAt: timestamp};
  }
  if (!transformCheck.valid || !planeCheck.valid) {
    return {...state, status: REGISTRATION_STATUS.LOST, updatedAt: timestamp, reason: transformCheck.reason ?? planeCheck.reason};
  }

  const bounded = Math.max(0, Math.min(1, confidence));
  const status = bounded >= TRACKING_THRESHOLD
    ? REGISTRATION_STATUS.TRACKING
    : bounded >= LOCK_THRESHOLD
      ? REGISTRATION_STATUS.LOCKED
      : REGISTRATION_STATUS.LOST;

  return {
    ...state,
    status,
    structureId,
    confidence: bounded,
    plane: planeCheck.value,
    transform: observation.transform ? [...observation.transform].map(Number) : null,
    updatedAt: timestamp,
    reason: null
  };
}

export function isRegistrationStale(state, now = Date.now()) {
  if (!state?.updatedAt) return true;
  return Number(now) - Number(state.updatedAt) > (state.staleAfterMs ?? DEFAULT_STALE_AFTER_MS);
}

export function registrationOverlay(state, now = Date.now()) {
  if (!state || state.status === REGISTRATION_STATUS.UNKNOWN || state.status === REGISTRATION_STATUS.LOST) {
    return {visible: false, reason: state?.reason ?? REGISTRATION_REASON.NO_LOCALIZATION};
  }
  if (isRegistrationStale(state, now)) {
    return {visible: false, reason: REGISTRATION_REASON.STALE};
  }
  return {
    visible: true,
    status: state.status,
    structureId: state.structureId,
    confidence: state.confidence,
    plane: state.plane,
    transform: state.transform
  };
}
