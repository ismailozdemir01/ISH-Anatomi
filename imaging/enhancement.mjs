import { assessFrameQuality } from './quality.mjs';

const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));

export function enhanceGrayscaleFrame(frame, options = {}) {
  if (!frame || !Number.isInteger(frame.width) || !Number.isInteger(frame.height)) throw new Error('INVALID_FRAME');
  const src = frame.data;
  if (!src || src.length < frame.width * frame.height) throw new Error('PIXEL_DATA_REQUIRED');
  const minPercentile = Number.isFinite(options.minPercentile) ? options.minPercentile : 0.02;
  const maxPercentile = Number.isFinite(options.maxPercentile) ? options.maxPercentile : 0.98;
  const gain = Number.isFinite(options.gain) ? options.gain : 1.08;
  const samples = [];
  const step = Math.max(1, Math.floor(src.length / 16384));
  for (let i = 0; i < src.length; i += step) {
    const v = Number(src[i]);
    if (Number.isFinite(v)) samples.push(Math.max(0, Math.min(255, v)));
  }
  if (!samples.length) throw new Error('NO_VALID_PIXELS');
  samples.sort((a,b) => a-b);
  const lo = samples[Math.floor((samples.length - 1) * Math.max(0, Math.min(1, minPercentile)))];
  const hi = samples[Math.floor((samples.length - 1) * Math.max(0, Math.min(1, maxPercentile)))];
  const span = Math.max(1, hi - lo);
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const v = Number(src[i]);
    const normalized = (v - lo) / span;
    out[i] = clamp8(128 + (normalized - 0.5) * 255 * gain);
  }
  const qualityBefore = assessFrameQuality(frame);
  const enhanced = {...frame, data: out, enhancement: {method: 'conservative-percentile-contrast', sourcePreserved: true}};
  const qualityAfter = assessFrameQuality(enhanced);
  return {frame: enhanced, qualityBefore, qualityAfter};
}
