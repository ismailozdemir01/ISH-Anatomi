import {FRAME_STATUS, validateFrame, updateSession} from './core.mjs';

function clamp(v, min = 0, max = 1) { return Math.max(min, Math.min(max, Number(v) || 0)); }

function meanAbsDifference(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return null;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += Math.abs((Number(a[i]) || 0) - (Number(b[i]) || 0));
  return sum / a.length;
}

function temporalQuality(previous, current) {
  if (!previous) return {status: 'NO_PREVIOUS_FRAME', stability: null};
  const prev = previous.frame?.pixels;
  const next = current.frame?.pixels;
  const mad = meanAbsDifference(prev, next);
  if (mad === null) return {status: 'UNKNOWN', stability: null, reason: 'PIXEL_BUFFER_UNAVAILABLE'};
  return {status: 'READY', meanAbsoluteDifference: mad, stability: clamp(1 - mad)};
}

function conservativeEnhancement(frame, quality) {
  const metrics = quality?.metrics ?? quality ?? {};
  const contrast = clamp(metrics.contrast ?? 0.5);
  const noise = clamp(metrics.noise ?? metrics.speckle ?? 0.5);
  const edge = clamp(metrics.edgePreservation ?? metrics.edge ?? 0.5);
  const gain = 1 + (0.12 * contrast) - (0.08 * noise);
  const sharpening = clamp(0.08 + 0.10 * edge, 0, 0.2);
  return {
    status: 'PLANNED',
    sourcePreserved: true,
    gain: Number(gain.toFixed(4)),
    sharpening: Number(sharpening.toFixed(4)),
    method: 'CONSERVATIVE_EDGE_PRESERVING',
    note: 'Clinical inference must retain access to the unmodified source frame.'
  };
}

export class LiveUltrasoundPipeline {
  constructor({quality, anatomy, clinical} = {}) {
    this.quality = quality ?? (async () => ({status: 'UNKNOWN', reason: 'QUALITY_ENGINE_NOT_CONFIGURED'}));
    this.anatomy = anatomy ?? (async () => ({status: 'UNKNOWN', reason: 'ANATOMY_ENGINE_NOT_CONFIGURED'}));
    this.clinical = clinical ?? (async () => ({status: 'UNKNOWN', reason: 'CLINICAL_ENGINE_NOT_CONFIGURED'}));
    this.session = null;
    this.previous = null;
    this.listeners = new Set();
    this.processing = false;
  }

  start(session) {
    this.session = session;
    this.previous = null;
    this.processing = true;
    return session;
  }

  stop() {
    this.processing = false;
    this.previous = null;
    this.session = this.session ? {...this.session, status: 'STOPPED'} : null;
    return this.session;
  }

  onResult(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  async push(frame) {
    if (!this.processing) return {status: 'NOT_RUNNING'};
    const validation = validateFrame(frame);
    if (validation.status !== FRAME_STATUS.READY) return this.#emit({status: validation.status, reason: validation.reason});

    const quality = await this.quality(frame);
    if (quality?.status === 'INSUFFICIENT') {
      return this.#emit({status: FRAME_STATUS.INSUFFICIENT_QUALITY, quality});
    }

    const temporal = temporalQuality(this.previous, {frame});
    const enhancement = conservativeEnhancement(frame, quality);
    const anatomy = await this.anatomy(frame, {...quality, temporal, enhancement});
    const clinical = await this.clinical({frame, quality, temporal, enhancement, anatomy});
    this.session = updateSession(this.session, validation);
    this.previous = {frame, validation};

    return this.#emit({
      status: 'ANALYZED',
      frame: validation,
      quality,
      temporal,
      enhancement,
      anatomy,
      clinical,
      session: this.session
    });
  }

  #emit(result) { for (const listener of this.listeners) listener(result); return result; }
}
