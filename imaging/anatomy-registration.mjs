export const REGISTRATION_STATUS = Object.freeze({
  LOCKED: 'LOCKED',
  TRACKING: 'TRACKING',
  LOST: 'LOST',
  UNKNOWN: 'UNKNOWN'
});

export function createRegistrationState() {
  return {status: REGISTRATION_STATUS.UNKNOWN, structureId: null, confidence: null, plane: null, transform: null, updatedAt: null};
}

export function updateRegistration(state, observation = {}) {
  if (!observation.structureId || !Number.isFinite(observation.confidence)) {
    return {...state, status: REGISTRATION_STATUS.LOST, updatedAt: Date.now()};
  }
  const confidence = Math.max(0, Math.min(1, observation.confidence));
  return {
    ...state,
    status: confidence >= 0.85 ? REGISTRATION_STATUS.TRACKING : REGISTRATION_STATUS.LOCKED,
    structureId: observation.structureId,
    confidence,
    plane: observation.plane ?? null,
    transform: observation.transform ?? null,
    updatedAt: Date.now()
  };
}

export function registrationOverlay(state) {
  if (!state || state.status === REGISTRATION_STATUS.UNKNOWN || state.status === REGISTRATION_STATUS.LOST) {
    return {visible: false, reason: 'ANATOMICAL_LOCALIZATION_UNAVAILABLE'};
  }
  return {visible: true, structureId: state.structureId, confidence: state.confidence, plane: state.plane, transform: state.transform};
}
