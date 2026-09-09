import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalPhoneCameraServer} from './local-phone-camera.mjs';

async function request(url, options = {}) { return fetch(url, options); }

test('starts a local phone camera transport with a secret URL', async () => {
  const server = new LocalPhoneCameraServer({host:'127.0.0.1',port:0});
  const info = await server.start();
  assert.equal(info.status,'READY');
  assert.ok(info.port > 0);
  assert.equal(info.urls.length,0);
  const page = await request(`http://127.0.0.1:${info.port}/camera/${server.secret}`);
  assert.equal(page.status,200);
  assert.match(await page.text(),/ISH-Anatomi/);
  await server.stop();
});

test('rejects non-JPEG frames and invalid poses', async () => {
  const server = new LocalPhoneCameraServer({host:'127.0.0.1',port:0});
  const info = await server.start();
  const base = `http://127.0.0.1:${info.port}/camera/${server.secret}`;
  let r = await request(`${base}/frame`,{method:'POST',headers:{'content-type':'image/jpeg'},body:Buffer.from('not-jpeg')});
  assert.equal(r.status,415);
  r = await request(`${base}/pose`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({alpha:'x',beta:0,gamma:0})});
  assert.equal(r.status,400);
  await server.stop();
});

test('accepts a JPEG frame and forwards pose without external services', async () => {
  let frameSeen = null;
  let poseSeen = null;
  const server = new LocalPhoneCameraServer({host:'127.0.0.1',port:0,onFrame:async b=>{frameSeen=b},onPose:async p=>{poseSeen=p}});
  const info = await server.start();
  const base = `http://127.0.0.1:${info.port}/camera/${server.secret}`;
  const jpeg = Buffer.from([0xff,0xd8,0xff,0xd9]);
  let r = await request(`${base}/frame`,{method:'POST',headers:{'content-type':'image/jpeg'},body:jpeg});
  assert.equal(r.status,204);
  r = await request(`${base}/pose`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({alpha:10,beta:20,gamma:-5,absolute:true,timestamp:123})});
  assert.equal(r.status,204);
  assert.deepEqual(frameSeen,jpeg);
  assert.equal(poseSeen.alpha,10);
  assert.equal(server.frames,1);
  await server.stop();
});
