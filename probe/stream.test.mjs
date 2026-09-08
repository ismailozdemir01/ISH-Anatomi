import test from 'node:test';
import assert from 'node:assert/strict';
import {ProbeStreamBridge} from './stream.mjs';

function frames(values) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const frame of values) yield frame;
    }
  };
}

const valid = {sequence:1,timestamp:Date.now(),width:640,height:480,pixels:new Uint8Array(640*480)};

test('stream bridge refuses to fabricate frames without a source', async () => {
  const bridge = new ProbeStreamBridge({controller:{start(){},stop(){},push(){throw new Error('should not run')}}});
  assert.deepEqual(await bridge.start(), {status:'NO_FRAME_SOURCE'});
});

test('stream bridge consumes a real async frame source', async () => {
  const seen=[];
  const controller={start(session){seen.push(['start',session])},stop(){seen.push(['stop'])},async push(frame){seen.push(['frame',frame.sequence]);return {status:'ANALYZED'}}};
  const bridge = new ProbeStreamBridge({controller,frameSource:frames([valid,{...valid,sequence:2}])});
  const status=await bridge.start({id:'test-session'});
  assert.equal(status.status,'IDLE');
  assert.equal(status.framesSeen,2);
  assert.equal(status.framesAnalyzed,2);
  assert.deepEqual(seen,[['start',{id:'test-session'}],['frame',1],['frame',2],['stop']]);
});

test('stream bridge stops between frames', async () => {
  let bridge;
  const controller={start(){},stop(){},async push(frame){if(frame.sequence===1) bridge.stop(); return {status:'ANALYZED'}}};
  bridge=new ProbeStreamBridge({controller,frameSource:frames([valid,{...valid,sequence:2}])});
  const status=await bridge.start();
  assert.equal(status.framesSeen,1);
});
