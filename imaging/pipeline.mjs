import {FRAME_STATUS, validateFrame, updateSession} from './core.mjs';
import {enhanceGrayscaleFrame} from './enhancement.mjs';
import {TemporalFrameTracker} from './temporal.mjs';
import {calibrationGate} from './calibration.mjs';
import {transformPoint, validateRigidTransform} from './coordinate-space.mjs';
import {EvidenceSession} from './evidence-session.mjs';

function clamp(v, min = 0, max = 1) { return Math.max(min, Math.min(max, Number(v) || 0)); }
function meanAbsDifference(a, b) { if (!a || !b || typeof a.length !== 'number' || a.length !== b.length || !a.length) return null; let sum = 0; for (let i = 0; i < a.length; i += 1) sum += Math.abs((Number(a[i]) || 0) - (Number(b[i]) || 0)); return sum / a.length; }
function temporalQuality(previous, current) { if (!previous) return {status: 'NO_PREVIOUS_FRAME', stability: null}; const mad = meanAbsDifference(previous.data, current.data); if (mad === null) return {status: 'UNKNOWN', stability: null, reason: 'PIXEL_BUFFER_UNAVAILABLE'}; const normalized = mad > 1 ? mad / 255 : mad; return {status: 'READY', meanAbsoluteDifference: mad, stability: clamp(1 - normalized)}; }
function buildEnhancement(frame, quality) { const metrics = quality?.metrics ?? quality ?? {}; if (frame?.data && typeof frame.data.length === 'number' && frame.data.length >= frame.width * frame.height) { try { const enhanced = enhanceGrayscaleFrame(frame, {quality: metrics}); return {status: 'READY', sourcePreserved: true, method: enhanced.method ?? 'GRAYSCALE_CONSERVATIVE_ENHANCEMENT', frame: enhanced.frame}; } catch (error) { return {status: 'FAILED', sourcePreserved: true, reason: error.message}; } } const contrast = clamp(metrics.contrast ?? 0.5); const noise = clamp(metrics.noise ?? metrics.speckle ?? 0.5); const edge = clamp(metrics.edgePreservation ?? metrics.edge ?? 0.5); return {status: 'PLANNED', sourcePreserved: true, gain: Number((1 + (0.12 * contrast) - (0.08 * noise)).toFixed(4)), sharpening: Number(clamp(0.08 + 0.10 * edge, 0, 0.2).toFixed(4)), method: 'CONSERVATIVE_EDGE_PRESERVING', note: 'Clinical inference must retain access to the unmodified source frame.'}; }

export class LiveUltrasoundPipeline {
  constructor({quality, anatomy, clinical, inference, calibration = null, temporalTracker = null, coordinateTransform = null, evidenceSession = null} = {}) {
    this.quality = quality ?? (async () => ({status: 'UNKNOWN', reason: 'QUALITY_ENGINE_NOT_CONFIGURED'}));
    this.anatomy = anatomy ?? (async () => ({status: 'UNKNOWN', reason: 'ANATOMY_ENGINE_NOT_CONFIGURED'}));
    this.clinical = clinical ?? (async () => ({status: 'UNKNOWN', reason: 'CLINICAL_ENGINE_NOT_CONFIGURED'}));
    this.inference = inference ?? null;
    this.calibration = calibration;
    this.coordinateTransform = coordinateTransform;
    this.temporalTracker = temporalTracker ?? new TemporalFrameTracker();
    this.evidenceSession = evidenceSession ?? null;
    this.session = null; this.previous = null; this.listeners = new Set(); this.processing = false;
  }
  start(session) { this.session = session; this.previous = null; this.temporalTracker.reset(); this.processing = true; return session; }
  stop() { this.processing = false; this.previous = null; this.temporalTracker.reset(); if (this.evidenceSession && !this.evidenceSession.closedAt) this.evidenceSession.close(); this.session = this.session ? {...this.session, status: 'STOPPED'} : null; return this.session; }
  onResult(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  async push(frame) {
    if (!this.processing) return {status: 'NOT_RUNNING'};
    const validation = validateFrame(frame, this.previous?.timestamp ?? null);
    if (validation.status !== FRAME_STATUS.READY) return this.#emit({status: validation.status, reason: validation.reason});
    const quality = await this.quality(frame);
    if (quality?.status === 'INSUFFICIENT') return this.#emit({status: FRAME_STATUS.INSUFFICIENT_QUALITY, quality, overlayAllowed: false});
    const temporal = temporalQuality(this.previous, frame);
    const enhancement = buildEnhancement(frame, quality);
    const processedFrame = enhancement.status === 'READY' ? enhancement.frame : frame;
    const anatomy = await this.anatomy(processedFrame, {...quality, temporal, enhancement, sourceFrame: frame});
    const temporalTracking = this.temporalTracker.push({timestamp: validation.timestamp, anatomy, quality});
    const calibration = this.calibration ? calibrationGate(this.calibration, validation.timestamp) : {valid: false, status: 'NOT_CONFIGURED', reason: 'CALIBRATION_REQUIRED', overlayAllowed: false};
    let atlasPoint = null;
    if (this.coordinateTransform && validateRigidTransform(this.coordinateTransform).valid && Array.isArray(anatomy?.point) && anatomy.point.length === 3) atlasPoint = transformPoint(this.coordinateTransform, anatomy.point);
    const inference = this.inference ? await this.inference({frame: processedFrame, sourceFrame: frame, quality, temporal, temporalTracking, calibration, anatomy, atlasPoint}) : {status: 'NOT_CONFIGURED', reason: 'VALIDATED_MODEL_REQUIRED'};
    const clinical = await this.clinical({frame: processedFrame, sourceFrame: frame, quality, temporal, temporalTracking, calibration, enhancement, anatomy, atlasPoint, inference});
    this.session = updateSession(this.session, validation); this.previous = frame;
    const result = {status: 'ANALYZED', frame: validation, sourceFrame: frame, processedFrame, quality, temporal, temporalTracking, calibration, atlasPoint, overlayAllowed: Boolean(calibration.overlayAllowed && temporalTracking.status === 'STABLE'), enhancement, anatomy, inference, clinical, session: this.session};
    if (this.evidenceSession) this.evidenceSession.append({type:'FRAME_ANALYZED',timestamp:validation.timestamp,frameId:frame.id??null,structureId:anatomy?.structureId??null,confidence:anatomy?.confidence??null,quality,registration:anatomy?.registration??null,source:frame.source??'ultrasound'});
    return this.#emit(result);
  }
  #emit(result) { for (const listener of this.listeners) listener(result); return result; }
}

export {EvidenceSession};
