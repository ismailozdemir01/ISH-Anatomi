import {createPoseFilter, filterPose} from './pose-filter.mjs';

const DEFAULTS = Object.freeze({
  sensitivityX: 0.018,
  sensitivityY: 0.014,
  deadZone: 0.35,
  maxStep: 18,
  poseSmoothing: 0.28,
  maxPoseDelta: 45
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function createVirtualCameraState(options = {}) {
  const merged = {...DEFAULTS, ...options};
  return {
    ...merged,
    lastAlpha: null,
    lastBeta: null,
    lastGamma: null,
    active: false,
    poseFilter: createPoseFilter({alpha: merged.poseSmoothing, maxDeltaPerSample: merged.maxPoseDelta})
  };
}

export function enableVirtualCamera(state, enabled = true) {
  return {
    ...state,
    active: Boolean(enabled),
    lastAlpha: null,
    lastBeta: null,
    lastGamma: null,
    poseFilter: createPoseFilter({alpha: state.poseSmoothing, maxDeltaPerSample: state.maxPoseDelta})
  };
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
  const filtered = filterPose(state.poseFilter ?? createPoseFilter(), pose);
  if (filtered.status !== 'READY') return {state: next, drag: null, status: filtered.status};
  const current = filtered.pose;
  const alpha = Number(current.alpha);
  const beta = Number(current.beta);
  const gamma = Number(current.gamma);
  if (![alpha, beta, gamma].every(Number.isFinite)) return {state: next, drag: null, status: 'INVALID_POSE'};
  if (!state.active) {
    next.lastAlpha = alpha;
    next.lastBeta = beta;
    next.lastGamma = gamma;
    return {state: next, drag: null, status: 'DISABLED'};
  }

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
