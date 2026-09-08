import {LiveImagingController} from '../imaging/live-controller.mjs';

/**
 * Transport-neutral real-time probe bridge.
 *
 * A hardware adapter supplies an AsyncIterable of REAL ultrasound frames.
 * The bridge never synthesizes frames: without a source it stays IDLE.
 * USB/Wi-Fi/BLE control adapters can expose the same stream contract.
 */
export class ProbeStreamBridge {
  constructor({controller = new LiveImagingController(), frameSource = null, maxInFlight = 1} = {}) {
    if (!controller || typeof controller.push !== 'function') throw new Error('INVALID_IMAGING_CONTROLLER');
    if (!Number.isInteger(maxInFlight) || maxInFlight < 1) throw new Error('INVALID_MAX_IN_FLIGHT');
    this.controller = controller;
    this.frameSource = frameSource;
    this.maxInFlight = maxInFlight;
    this.running = false;
    this.framesSeen = 0;
    this.framesAnalyzed = 0;
    this.framesRejected = 0;
    this.dropped = 0;
  }

  attach(source) {
    if (!source || typeof source[Symbol.asyncIterator] !== 'function') throw new Error('INVALID_FRAME_SOURCE');
    this.frameSource = source;
  }

  status() {
    return {
      status: this.running ? 'STREAMING' : 'IDLE',
      framesSeen: this.framesSeen,
      framesAnalyzed: this.framesAnalyzed,
      framesRejected: this.framesRejected,
      dropped: this.dropped
    };
  }

  async start(session = {}) {
    if (!this.frameSource) return {status: 'NO_FRAME_SOURCE'};
    if (this.running) return this.status();
    this.running = true;
    this.controller.start(session);
    try {
      for await (const frame of this.frameSource) {
        if (!this.running) break;
        this.framesSeen += 1;
        const result = await this.controller.push(frame);
        if (result?.status === 'ANALYZED') this.framesAnalyzed += 1;
        else this.framesRejected += 1;
      }
    } finally {
      this.running = false;
      this.controller.stop();
    }
    return this.status();
  }

  stop() {
    this.running = false;
    return this.controller.stop();
  }
}

export function createFrameSourceFromAsyncIterable(iterable) {
  if (!iterable || typeof iterable[Symbol.asyncIterator] !== 'function') throw new Error('INVALID_FRAME_SOURCE');
  return iterable;
}
