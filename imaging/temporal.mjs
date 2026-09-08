export class TemporalFrameTracker {
  constructor({windowSize = 30} = {}) {
    if (!Number.isInteger(windowSize) || windowSize < 2) throw new Error('INVALID_WINDOW_SIZE');
    this.windowSize = windowSize;
    this.frames = [];
  }

  push({timestamp, anatomy = null, quality = null} = {}) {
    const sample = {timestamp:Number(timestamp), structureId:anatomy?.structureId ?? null, confidence:anatomy?.confidence ?? null, quality:quality?.status ?? null, measurements:anatomy?.measurements ?? null};
    if (!Number.isFinite(sample.timestamp)) throw new Error('INVALID_TIMESTAMP');
    this.frames.push(sample);
    if (this.frames.length > this.windowSize) this.frames.shift();
    return this.snapshot();
  }

  snapshot() {
    const last = this.frames.at(-1) ?? null;
    const previous = this.frames.length > 1 ? this.frames.at(-2) : null;
    const dt = last && previous ? Math.max(0, last.timestamp - previous.timestamp) : 0;
    return {
      count:this.frames.length,
      current:last,
      previous,
      deltaMs:dt,
      structureStable:Boolean(last?.structureId && previous?.structureId && last.structureId === previous.structureId),
      confidenceDelta: last?.confidence != null && previous?.confidence != null ? last.confidence - previous.confidence : null
    };
  }

  reset() { this.frames.length = 0; return this.snapshot(); }
}
