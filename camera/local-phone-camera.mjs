import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';

const MAX_FRAME_BYTES = 8 * 1024 * 1024;
const MAX_POSE_BYTES = 16 * 1024;
const DEFAULT_FPS = 15;

function token() { return crypto.randomBytes(18).toString('base64url'); }

function localAddresses(host, port, secret) {
  const normalizedHost = String(host ?? '').toLowerCase();

  if (
    normalizedHost === '127.0.0.1' ||
    normalizedHost === 'localhost' ||
    normalizedHost === '::1'
  ) {
    return [];
  }

  const urls = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const entry of interfaces ?? []) {
      if (entry && entry.family === 'IPv4' && !entry.internal) {
        urls.push(`http://${entry.address}:${port}/camera/${secret}`);
      }
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

const PAGE = ({secret, fps = DEFAULT_FPS}) => `<!doctype html><html lang="tr"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>ISH-Anatomi · Telefon Kamerası</title><style>body{font:16px system-ui;margin:0;padding:24px;background:#0b1020;color:#fff}button{padding:14px 18px;border:0;border-radius:12px;margin:6px 0;font-weight:700}video{width:100%;max-width:720px;border-radius:16px;background:#000}#s{color:#cbd5e1;line-height:1.5}.warn{padding:12px;border-radius:12px;background:#3f2d0a;color:#fde68a;margin:10px 0}button.stop{background:#7f1d1d;color:#fff}</style><h2>ISH-Anatomi · Sanal Kamera</h2><p>Telefon kamerası ve yönelimi doğrudan yerel bilgisayara gönderilir. Bulut/API yok.</p><div id="secure" class="warn" hidden>Tarayıcı kamera erişimi için güvenli bağlam (HTTPS) gerekir. Bu bağlantı HTTP ise ISH-Anatomi yerel HTTPS veya yerel companion uygulaması kullanılmalıdır.</div><button id="start">Kamerayı başlat</button><button id="motion">Yönelim iznini ver</button><button id="stop" class="stop" disabled>Durdur</button><p id="s">Hazır · hedef ${fps} FPS</p><video id="v" autoplay playsinline muted></video><canvas id="c" hidden></canvas><script>
const secret=${JSON.stringify(secret)}, targetFps=${Number(fps)}, statusEl=document.querySelector('#s'), video=document.querySelector('#v'), canvas=document.querySelector('#c'), secureEl=document.querySelector('#secure'), stopButton=document.querySelector('#stop');
let stream=null, running=false, motionOn=false, lastPoseAt=0;
if(!window.isSecureContext) secureEl.hidden=false;
async function start(){try{if(!window.isSecureContext){statusEl.textContent='Kamera erişimi engellenebilir: HTTPS güvenli bağlamı gerekli.';}stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:targetFps,max:targetFps}},audio:false});video.srcObject=stream;running=true;stopButton.disabled=false;statusEl.textContent='Kamera bağlı · yerel canlı aktarım başladı';sendFrames();}catch(e){statusEl.textContent='Kamera erişimi başarısız: '+e.message;}}
async function sendFrames(){const interval=Math.max(33,Math.round(1000/targetFps));while(running){if(video.readyState>=2&&video.videoWidth&&video.videoHeight){const maxWidth=1280;const scale=Math.min(1,maxWidth/video.videoWidth);canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));const ctx=canvas.getContext('2d',{willReadFrequently:false});ctx.drawImage(video,0,0,canvas.width,canvas.height);const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.72));if(blob)fetch('/camera/'+secret+'/frame',{method:'POST',headers:{'content-type':'image/jpeg'},body:blob}).catch(()=>{});}await new Promise(r=>setTimeout(r,interval));}}
function stop(){running=false;motionOn=false;if(stream){for(const track of stream.getTracks())track.stop();stream=null;}video.srcObject=null;stopButton.disabled=true;statusEl.textContent='Aktarım durduruldu.';}
async function motion(){try{if(typeof DeviceOrientationEvent==='undefined')throw new Error('Cihaz yönelim sensörü desteklenmiyor');if(typeof DeviceOrientationEvent.requestPermission==='function'){const p=await DeviceOrientationEvent.requestPermission();if(p!=='granted')throw new Error('İzin verilmedi');}if(motionOn)return;motionOn=true;window.addEventListener('deviceorientation',e=>{const now=Date.now();if(now-lastPoseAt<50)return;lastPoseAt=now;if([e.alpha,e.beta,e.gamma].some(v=>!Number.isFinite(Number(v))))return;fetch('/camera/'+secret+'/pose',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({alpha:e.alpha,beta:e.beta,gamma:e.gamma,absolute:e.absolute,timestamp:now})}).catch(()=>{});});statusEl.textContent='Kamera + yönelim aktarımı aktif';}catch(e){statusEl.textContent='Yönelim erişimi: '+e.message;}}
document.querySelector('#start').onclick=start;document.querySelector('#motion').onclick=motion;stopButton.onclick=stop;document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop();});</script>`;

export class LocalPhoneCameraServer {
  constructor({onFrame, onPose, host = '0.0.0.0', port = 0, fps = DEFAULT_FPS} = {}) {
    this.onFrame = onFrame;
    this.onPose = onPose;
    this.host = host;
    this.port = port;
    this.fps = Math.max(1, Math.min(30, Number(fps) || DEFAULT_FPS));
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
          return send(res, 200, PAGE({secret:this.secret, fps:this.fps}), 'text/html; charset=utf-8');
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
    return {status:'READY', transport:'HTTP_LOCAL', port, fps:this.fps, urls:localAddresses(this.host, port, this.secret), frames:this.frames, lastFrameAt:this.lastFrameAt, lastPoseAt:this.lastPoseAt, secureContextRequired:true};
  }

  status() { return {...this.info(), connected:!!this.lastFrameAt && Date.now() - this.lastFrameAt < 3000}; }

  async stop() {
    if (!this.server) return {status:'STOPPED'};
    await new Promise(resolve => this.server.close(() => resolve()));
    this.server = null;
    return {status:'STOPPED'};
  }
}
