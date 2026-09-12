export const TRACK_STATUS = Object.freeze({ STABLE:'STABLE', REACQUIRING:'REACQUIRING', LOST:'LOST' });

export class TemporalFrameTracker {
  constructor({windowSize=30, maxGapMs=500, maxConfidenceDrop=0.35, stableFrames=3}={}) {
    if (!Number.isInteger(windowSize)||windowSize<2) throw new Error('INVALID_WINDOW_SIZE');
    if (!Number.isFinite(maxGapMs)||maxGapMs<1) throw new Error('INVALID_MAX_GAP');
    this.windowSize=windowSize; this.maxGapMs=maxGapMs; this.maxConfidenceDrop=maxConfidenceDrop;
    this.stableFrames=Math.max(1,Math.floor(stableFrames)); this.frames=[];
  }
  push({timestamp,anatomy=null,quality=null}={}) {
    const ts=Number(timestamp), confidence=anatomy?.confidence==null?null:Number(anatomy.confidence);
    if (!Number.isFinite(ts)||ts<=0) throw new Error('INVALID_TIMESTAMP');
    if (this.frames.length && ts<=this.frames.at(-1).timestamp) throw new Error('NON_MONOTONIC_TIMESTAMP');
    const sample={timestamp:ts,structureId:anatomy?.structureId??null,confidence:Number.isFinite(confidence)?Math.max(0,Math.min(1,confidence)):null,quality:quality?.status??null,measurements:anatomy?.measurements??null};
    this.frames.push(sample); if(this.frames.length>this.windowSize)this.frames.shift(); return this.snapshot();
  }
  snapshot() {
    const last=this.frames.at(-1)??null, previous=this.frames.length>1?this.frames.at(-2):null;
    const dt=last&&previous?last.timestamp-previous.timestamp:0;
    const confidenceDelta=last?.confidence!=null&&previous?.confidence!=null?last.confidence-previous.confidence:null;
    const same=Boolean(last?.structureId&&previous?.structureId&&last.structureId===previous.structureId);
    const gap=dt>this.maxGapMs;
    const drop=confidenceDelta!=null&&confidenceDelta < -this.maxConfidenceDrop;
    const consecutive=this.frames.slice(-this.stableFrames).filter(f=>f.structureId===last?.structureId&&f.structureId).length;
    const status=!last?.structureId||gap?'LOST':drop||!same||consecutive<this.stableFrames?'REACQUIRING':'STABLE';
    return {count:this.frames.length,current:last,previous,deltaMs:dt,structureStable:same,confidenceDelta,confidenceDecay:drop,status,reacquisitionRequired:status!=='STABLE'};
  }
  reset(){this.frames.length=0;return this.snapshot();}
}
