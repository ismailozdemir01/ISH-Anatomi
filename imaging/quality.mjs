export function assessFrameQuality(frame) {
  if (!frame || !Number.isInteger(frame.width) || !Number.isInteger(frame.height)) return {status:'INSUFFICIENT', score:0, reasons:['INVALID_FRAME']};
  const pixels = frame.data;
  if (!pixels || typeof pixels.length !== 'number' || pixels.length < frame.width * frame.height) return {status:'INSUFFICIENT', score:0, reasons:['PIXEL_DATA_REQUIRED']};
  let sum = 0, sumSq = 0, nonZero = 0;
  const step = Math.max(1, Math.floor(pixels.length / 4096));
  let n = 0;
  for (let i = 0; i < pixels.length; i += step) {
    const v = Number(pixels[i]);
    if (!Number.isFinite(v)) continue;
    const x = Math.max(0, Math.min(255, v));
    sum += x; sumSq += x*x; nonZero += x > 2 ? 1 : 0; n++;
  }
  if (!n) return {status:'INSUFFICIENT', score:0, reasons:['NO_VALID_PIXELS']};
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean*mean);
  const coverage = nonZero / n;
  const dynamic = Math.min(1, Math.sqrt(variance) / 64);
  const score = Math.max(0, Math.min(1, dynamic * 0.7 + Math.min(1, coverage * 1.4) * 0.3));
  return {status: score >= 0.2 ? 'SUFFICIENT' : 'INSUFFICIENT', score, mean, variance, coverage, reasons: score >= 0.2 ? [] : ['LOW_SIGNAL_OR_CONTRAST']};
}
