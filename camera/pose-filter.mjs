const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function createPoseFilter({alpha = 0.28, maxDeltaPerSample = 45} = {}) {
  return {
    alpha: clamp(alpha, 0.05, 1),
    maxDeltaPerSample: clamp(maxDeltaPerSample, 1, 180),
    last: null
  };
}

function shortestAngleDelta(next, previous) {
  let delta = Number(next) - Number(previous);
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function smoothAngle(previous, next, alpha, maxDelta) {
  if (previous == null) return Number(next);
  const delta = clamp(shortestAngleDelta(next, previous), -maxDelta, maxDelta);
  let result = Number(previous) + delta * alpha;
  while (result > 180) result -= 360;
  while (result < -180) result += 360;
  return result;
}

export function filterPose(filter, pose = {}) {
  const alpha = Number(pose.alpha);
  const beta = Number(pose.beta);
  const gamma = Number(pose.gamma);
  if (![alpha, beta, gamma].every(Number.isFinite)) return {status: 'INVALID_POSE', pose: null};

  const previous = filter.last;
  const next = {
    alpha: smoothAngle(previous?.alpha, alpha, filter.alpha, filter.maxDeltaPerSample),
    beta: smoothAngle(previous?.beta, beta, filter.alpha, filter.maxDeltaPerSample),
    gamma: smoothAngle(previous?.gamma, gamma, filter.alpha, filter.maxDeltaPerSample),
    timestamp: Number.isFinite(Number(pose.timestamp)) ? Number(pose.timestamp) : Date.now()
  };
  filter.last = next;
  return {status: 'READY', pose: next};
}
