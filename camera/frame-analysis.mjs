export const CAMERA_FRAME_STATUS = Object.freeze({
  READY: 'READY',
  INVALID: 'INVALID',
  INSUFFICIENT: 'INSUFFICIENT'
});

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));

function sampleGray(data, width, height, maxSamples = 16384) {
  const total = width * height;
  const step = Math.max(1, Math.ceil(total / maxSamples));
  const values = [];
  for (let i = 0; i < total && i < data.length; i += step) {
    const value = Number(data[i]);
    if (Number.isFinite(value)) values.push(clamp(value, 0, 255));
  }
  return values;
}

export function analyzePhoneFrame({width, height, gray} = {}) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isInteger(w) || w < 64 || !Number.isInteger(h) || h < 64) {
    return {status: CAMERA_FRAME_STATUS.INVALID, reason: 'INVALID_DIMENSIONS'};
  }
  if (!gray || typeof gray.length !== 'number' || gray.length < w * h) {
    return {status: CAMERA_FRAME_STATUS.INSUFFICIENT, reason: 'GRAYSCALE_DATA_REQUIRED'};
  }

  const values = sampleGray(gray, w, h);
  if (!values.length) return {status: CAMERA_FRAME_STATUS.INSUFFICIENT, reason: 'NO_VALID_PIXELS'};

  let sum = 0;
  let sumSq = 0;
  let edgeSamples = 0;
  let previous = values[0];
  let min = 255;
  let max = 0;
  for (const value of values) {
    sum += value;
    sumSq += value * value;
    min = Math.min(min, value);
    max = Math.max(max, value);
    if (Math.abs(value - previous) >= 24) edgeSamples += 1;
    previous = value;
  }

  const mean = sum / values.length;
  const variance = Math.max(0, sumSq / values.length - mean * mean);
  const std = Math.sqrt(variance);
  const dynamicRange = (max - min) / 255;
  const contrast = clamp(std / 64);
  const edgeDensity = clamp(edgeSamples / Math.max(1, values.length - 1) * 3);
  const exposure = 1 - Math.min(1, Math.abs(mean - 127.5) / 127.5);
  const score = clamp(contrast * 0.35 + dynamicRange * 0.25 + edgeDensity * 0.20 + exposure * 0.20);

  const status = score >= 0.72 ? 'GOOD' : score >= 0.48 ? 'FAIR' : 'POOR';
  const reasons = [];
  if (dynamicRange < 0.20) reasons.push('LOW_DYNAMIC_RANGE');
  if (contrast < 0.25) reasons.push('LOW_CONTRAST');
  if (exposure < 0.45) reasons.push('EXTREME_EXPOSURE');
  if (edgeDensity < 0.08) reasons.push('LOW_LOCAL_DETAIL');

  return {
    status: CAMERA_FRAME_STATUS.READY,
    quality: status,
    score: Number(score.toFixed(4)),
    mean: Number(mean.toFixed(3)),
    std: Number(std.toFixed(3)),
    dynamicRange: Number(dynamicRange.toFixed(4)),
    contrast: Number(contrast.toFixed(4)),
    edgeDensity: Number(edgeDensity.toFixed(4)),
    exposure: Number(exposure.toFixed(4)),
    reasons
  };
}

export function comparePhoneFrames(previous, current) {
  if (!previous || !current) return {status: 'NO_PREVIOUS_FRAME', change: null};
  if (previous.width !== current.width || previous.height !== current.height) {
    return {status: 'DIMENSION_MISMATCH', change: null};
  }
  const a = previous.gray;
  const b = current.gray;
  const total = current.width * current.height;
  if (!a || !b || a.length < total || b.length < total) {
    return {status: 'GRAYSCALE_DATA_REQUIRED', change: null};
  }
  let sum = 0;
  const step = Math.max(1, Math.ceil(total / 16384));
  let count = 0;
  for (let i = 0; i < total; i += step) {
    sum += Math.abs((Number(a[i]) || 0) - (Number(b[i]) || 0));
    count += 1;
  }
  const meanAbsoluteDifference = count ? sum / count : 0;
  return {
    status: 'READY',
    meanAbsoluteDifference: Number(meanAbsoluteDifference.toFixed(3)),
    normalizedChange: Number(clamp(meanAbsoluteDifference / 255).toFixed(4))
  };
}
