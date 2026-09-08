const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, Number(v) || 0));

export const QUALITY_STATUS = Object.freeze({
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  POOR: 'POOR',
  INSUFFICIENT: 'INSUFFICIENT'
});

function samplePixels(frame, limit = 8192) {
  const pixels = frame?.data;
  if (!pixels || typeof pixels.length !== 'number') return [];
  const step = Math.max(1, Math.floor(pixels.length / limit));
  const out = [];
  for (let i = 0; i < pixels.length; i += step) {
    const v = Number(pixels[i]);
    if (Number.isFinite(v)) out.push(Math.max(0, Math.min(255, v)));
  }
  return out;
}

export function assessFrameQuality(frame) {
  if (!frame || !Number.isInteger(frame.width) || !Number.isInteger(frame.height)) return {status: QUALITY_STATUS.INSUFFICIENT, score: 0, reasons: ['INVALID_FRAME']};
  const pixels = frame.data;
  if (!pixels || typeof pixels.length !== 'number' || pixels.length < frame.width * frame.height) return {status: QUALITY_STATUS.INSUFFICIENT, score: 0, reasons: ['PIXEL_DATA_REQUIRED']};
  const values = samplePixels(frame);
  if (!values.length) return {status: QUALITY_STATUS.INSUFFICIENT, score: 0, reasons: ['NO_VALID_PIXELS']};

  let sum = 0, sumSq = 0, nonZero = 0, min = 255, max = 0;
  for (const v of values) {
    sum += v; sumSq += v * v;
    nonZero += v > 2 ? 1 : 0;
    min = Math.min(min, v); max = Math.max(max, v);
  }
  const mean = sum / values.length;
  const variance = Math.max(0, sumSq / values.length - mean * mean);
  const std = Math.sqrt(variance);
  const coverage = nonZero / values.length;
  const dynamicRange = (max - min) / 255;
  const contrast = Math.min(1, std / 64);
  const clipping = values.filter(v => v <= 3 || v >= 252).length / values.length;
  const artifactPenalty = Math.min(1, clipping * 1.8);
  const score = clamp(contrast * 0.35 + dynamicRange * 0.25 + coverage * 0.25 + (1 - artifactPenalty) * 0.15);
  const status = score >= 0.78 ? QUALITY_STATUS.GOOD : score >= 0.58 ? QUALITY_STATUS.FAIR : score >= 0.35 ? QUALITY_STATUS.POOR : QUALITY_STATUS.INSUFFICIENT;
  const reasons = [];
  if (dynamicRange < 0.20) reasons.push('LOW_DYNAMIC_RANGE');
  if (contrast < 0.25) reasons.push('LOW_CONTRAST');
  if (coverage < 0.30) reasons.push('LOW_SIGNAL_COVERAGE');
  if (artifactPenalty > 0.45) reasons.push('CLIPPING_OR_ARTIFACTS');
  return {status, score, mean, variance, std, coverage, dynamicRange, contrast, artifactPenalty, reasons};
}

export function buildEnhancementPlan(metrics = {}) {
  const quality = assessFrameQuality(metrics.frame ?? metrics);
  const plan = [];
  if ((metrics.speckle ?? 0) > 0.30) plan.push('speckle_reduction');
  if (quality.contrast < 0.55) plan.push('adaptive_contrast');
  if (quality.dynamicRange < 0.55) plan.push('dynamic_range_mapping');
  if (quality.artifactPenalty > 0.30) plan.push('artifact_suppression');
  if (!plan.length) plan.push('identity');
  return {quality, stages: plan, preserveAnatomicalDetail: true, diagnosticIntegrity: 'PRESERVE_SOURCE_INFORMATION'};
}

export function qualityGate(frame, threshold = 0.55) {
  const quality = assessFrameQuality(frame);
  return {...quality, accepted: quality.score >= threshold};
}
