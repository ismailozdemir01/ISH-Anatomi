const DEFAULTS = Object.freeze({
  sensitivityX: 0.018,
  sensitivityY: 0.014,
  deadZone: 0.35,
  maxStep: 18
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function createVirtualCameraState(options = {}) {
  return {
    ...DEFAULTS,
    ...options,
    lastAlpha: null,
    lastBeta: null,
    lastGamma: null,
    active: false
  };
}

export function enableVirtualCamera(state, enabled = true) {
  return {...state, active: Boolean(enabled), lastAlpha: null, lastBeta: null, lastGamma: null};
}

function angleDelta(next, previous) {
  if (previous == null) return 0;
  let delta = Number(next) - Number(previous);
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function axisStep(delta, sensitivity, deadZone, maxStep) {
  const magnitude = Math.abs(delta);
  if (magnitude <= deadZone) return 0;
  return clamp(delta * sensitivity, -maxStep, maxStep);
}

export function mapPoseToCameraDrag(state, pose = {}) {
  const next = {...state};
  const alpha = Number(pose.alpha);
  const beta = Number(pose.beta);
  const gamma = Number(pose.gamma);
  if (![alpha, beta, gamma].every(Number.isFinite)) return {state: next, drag: null, status: 'INVALID_POSE'};
  if (!state.active) return {state: {...next, lastAlpha: alpha, lastBeta: beta, lastGamma: gamma}, drag: null, status: 'DISABLED'};

  const da = angleDelta(alpha, state.lastAlpha);
  const db = angleDelta(beta, state.lastBeta);
  const dg = angleDelta(gamma, state.lastGamma);
  next.lastAlpha = alpha;
  next.lastBeta = beta;
  next.lastGamma = gamma;

  const drag = {
    dx: axisStep(da + dg * 0.35, state.sensitivityX, state.deadZone, state.maxStep),
    dy: axisStep(db, state.sensitivityY, state.deadZone, state.maxStep)
  };
  return {state: next, drag, status: 'READY'};
}
