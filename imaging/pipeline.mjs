import {FRAME_STATUS, validateFrame, updateSession} from './core.mjs';

export class LiveUltrasoundPipeline {
  constructor({quality, anatomy, clinical} = {}) {
    this.quality = quality ?? (async () => ({status: 'UNKNOWN', reason: 'QUALITY_ENGINE_NOT_CONFIGURED'}));
    this.anatomy = anatomy ?? (async () => ({status: 'UNKNOWN', reason: 'ANATOMY_ENGINE_NOT_CONFIGURED'}));
    this.clinical = clinical ?? (async () => ({status: 'UNKNOWN', reason: 'CLINICAL_ENGINE_NOT_CONFIGURED'}));
    this.session = null;
    this.listeners = new Set();
    this.processing = false;
  }

  start(session) { this.session = session; this.processing = true; return session; }
  stop() { this.processing = false; this.session = this.session ? {...this.session, status: 'STOPPED'} : null; return this.session; }
  onResult(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  async push(frame) {
    if (!this.processing) return {status: 'NOT_RUNNING'};
    const validation = validateFrame(frame);
    if (validation.status !== FRAME_STATUS.READY) return this.#emit({status: validation.status, reason: validation.reason});
    const quality = await this.quality(frame);
    if (quality?.status === 'INSUFFICIENT') return this.#emit({status: FRAME_STATUS.INSUFFICIENT_QUALITY, quality});
    const anatomy = await this.anatomy(frame, quality);
    const clinical = await this.clinical({frame, quality, anatomy});
    this.session = updateSession(this.session, validation);
    return this.#emit({status: 'ANALYZED', frame: validation, quality, anatomy, clinical, session: this.session});
  }

  #emit(result) { for (const listener of this.listeners) listener(result); return result; }
}
