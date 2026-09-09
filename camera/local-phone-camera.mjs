import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';

const MAX_FRAME_BYTES = 8 * 1024 * 1024;
const MAX_POSE_BYTES = 16 * 1024;

function token() { return crypto.randomBytes(18).toString('base64url'); }

function localAddresses(port, secret) {
  const urls = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const entry of interfaces ?? []) {
      if (entry && entry.family === 'IPv4' && !entry.internal) urls.push(`http://${entry.address}:${port}/camera/${secret}`);
    }
  }
  return [...new Set(urls)];
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) { req.destroy(); reject(new Error('PAYLOAD_TOO_LARGE')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {'content-type': type, 'cache-control': 'no-store'});
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const PAGE = ({secret}) => `<!doctype html><html lang="tr"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>ISH-Anatomi · Telefon Kamerası</title><style>body{font:16px system-ui;margin:0;padding:24px;background:#0b1020;color:#fff}button{padding:14px 18px;border:0;border-radius:12px;margin:6px 0;font-weight:700}video{width:100%;max-width:720px;border-radius:16px;background:#000}#s{color:#cbd5e1;line-height:1.5}</style><h2>ISH-Anatomi · Sanal Kamera</h2><p>Bu telefon kamerası doğrudan yerel bilgisayara görüntü ve cihaz yönelimi gönderir. Bulut/API yok.</p><button id="start">Kamerayı başlat</button><button id="motion">Yönelim iznini ver</button><p id="s">Hazır.</p><video id="v" autoplay playsinline muted></video><canvas id="c" hidden></canvas><script>
const secret=${JSON.stringify(secret)}, statusEl=document.querySelector('#s'), video=document.querySelector('#v'), canvas=document.querySelector('#c');
let stream=null, running=false;
async function start(){try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});video.srcObject=stream;running=true;statusEl.textContent='Kamera bağlı · yerel aktarım başladı';sendFrames();}catch(e){statusEl.textContent='Kamera erişimi başarısız: '+e.message;}}
async function sendFrames(){while(running){if(video.readyState>=2){canvas.width=video.videoWidth;canvas.height=video.videoHeight;const ctx=canvas.getContext('2d',{willReadFrequently:false});ctx.drawImage(video,0,0);const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.72));if(blob) fetch('/camera/'+secret+'/frame',{method:'POST',headers:{'content-type':'image/jpeg'},body:blob}).catch(()=>{});}await new Promise(r=>setTimeout(r,100));}}
async function motion(){try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const p=await DeviceOrientationEvent.requestPermission();if(p!=='granted')throw new Error('İzin verilmedi');}window.addEventListener('deviceorientation',e=>{fetch('/camera/'+secret+'/pose',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({alpha:e.alpha,beta:e.beta,gamma:e.gamma,absolute:e.absolute,timestamp:Date.now()})}).catch(()=>{});});statusEl.textContent='Kamera + yönelim aktarımı aktif';}catch(e){statusEl.textContent='Yönelim erişimi: '+e.message;}}
document.querySelector('#start').onclick=start;document.querySelector('#motion').onclick=motion;</script>`;

export class LocalPhoneCameraServer {
  constructor({onFrame, onPose, host = '0.0.0.0', port = 0} = {}) {
    this.onFrame = onFrame;
    this.onPose = onPose;
    this.host = host;
    this.port = port;
    this.secret = token();
    this.server = null;
    this.lastFrameAt = null;
    this.lastPoseAt = null;
    this.frames = 0;
  }

  async start() {
    if (this.server) return this.info();
    this.server = http.createServer(async (req, res) => {
      try {
        const prefix = `/camera/${this.secret}`;
        if (req.url === prefix || req.url === `${prefix}/`) {
          if (req.method !== 'GET') return send(res, 405, {error:'METHOD_NOT_ALLOWED'});
          return send(res, 200, PAGE({secret:this.secret}), 'text/html; charset=utf-8');
        }
        if (req.url === `${prefix}/frame`) {
          if (req.method !== 'POST') return send(res, 405, {error:'METHOD_NOT_ALLOWED'});
          const body = await readBody(req, MAX_FRAME_BYTES);
          if (!body.length || body[0] !== 0xff || body[1] !== 0xd8) return send(res, 415, {error:'JPEG_REQUIRED'});
          this.frames += 1;
          this.lastFrameAt = Date.now();
          await this.onFrame?.(body);
          return send(res, 204, '');
        }
        if (req.url === `${prefix}/pose`) {
          if (req.method !== 'POST') return send(res, 405, {error:'METHOD_NOT_ALLOWED'});
          const body = await readBody(req, MAX_POSE_BYTES);
          const pose = JSON.parse(body.toString('utf8'));
          if (![pose.alpha, pose.beta, pose.gamma].every(v => Number.isFinite(Number(v)))) return send(res, 400, {error:'INVALID_POSE'});
          this.lastPoseAt = Date.now();
          await this.onPose?.({...pose, alpha:Number(pose.alpha), beta:Number(pose.beta), gamma:Number(pose.gamma)});
          return send(res, 204, '');
        }
        if (req.url === '/health') return send(res, 200, this.status());
        return send(res, 404, {error:'NOT_FOUND'});
      } catch (error) {
        send(res, 400, {error:error.message});
      }
    });
    await new Promise((resolve, reject) => { this.server.once('error', reject); this.server.listen(this.port, this.host, resolve); });
    return this.info();
  }

  info() {
    const address = this.server?.address();
    const port = typeof address === 'object' && address ? address.port : this.port;
    return {status:'READY', port, urls:localAddresses(port, this.secret), frames:this.frames, lastFrameAt:this.lastFrameAt, lastPoseAt:this.lastPoseAt};
  }

  status() { return {...this.info(), connected:!!this.lastFrameAt && Date.now() - this.lastFrameAt < 3000}; }

  async stop() {
    if (!this.server) return {status:'STOPPED'};
    await new Promise(resolve => this.server.close(() => resolve()));
    this.server = null;
    return {status:'STOPPED'};
  }
}
