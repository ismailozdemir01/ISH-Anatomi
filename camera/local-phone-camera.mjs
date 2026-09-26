import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const MAX_FRAME_BYTES = 8 * 1024 * 1024;
const MAX_POSE_BYTES = 16 * 1024;
const DEFAULT_FPS = 15;
const token = () => crypto.randomBytes(18).toString('base64url');

function localAddresses(host, port, secret, protocol) {
  if (['127.0.0.1','localhost','::1'].includes(String(host).toLowerCase())) return [];
  const urls = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const entry of interfaces ?? []) {
      if (entry?.family === 'IPv4' && !entry.internal) urls.push(protocol + '://' + entry.address + ':' + port + '/camera/' + secret);
    }
  }
  return [...new Set(urls)];
}
function readBody(req, limit) {
  return new Promise((resolve,reject) => {
    const chunks=[]; let size=0;
    req.on('data',chunk=>{size+=chunk.length;if(size>limit){req.destroy();reject(new Error('PAYLOAD_TOO_LARGE'));return;}chunks.push(chunk);});
    req.on('end',()=>resolve(Buffer.concat(chunks))); req.on('error',reject);
  });
}
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'content-type':type,'cache-control':'no-store'});res.end(typeof body==='string'?body:JSON.stringify(body));}

function ensureTlsMaterial(certPath, keyPath, host) {
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) return true;
  try {
    fs.mkdirSync(path.dirname(certPath), {recursive:true});
    fs.mkdirSync(path.dirname(keyPath), {recursive:true});
    try { execFileSync('mkcert',['-install'],{stdio:'ignore'}); } catch {}
    const names=['localhost','127.0.0.1','::1'];
    for (const interfaces of Object.values(os.networkInterfaces())) {
      for (const entry of interfaces ?? []) if (entry?.family === 'IPv4' && !entry.internal) names.push(entry.address);
    }
    execFileSync('mkcert',['-cert-file',certPath,'-key-file',keyPath,...[...new Set(names)]],{stdio:'ignore'});
    return fs.existsSync(certPath) && fs.existsSync(keyPath);
  } catch { return false; }
}

function page(secret,fps){
  const html = '<!doctype html><html lang="tr"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>ISH-Anatomi · Telefon Kamerası</title><style>body{font:16px system-ui;margin:0;padding:24px;background:#0b1020;color:#fff}button{padding:14px 18px;border:0;border-radius:12px;margin:6px 0;font-weight:700}video{width:100%;max-width:720px;border-radius:16px;background:#000}#s{color:#cbd5e1;line-height:1.5}</style><h2>ISH-Anatomi · Telefon Kamerası</h2><p>Telefon kamerası doğrudan yerel bilgisayara gönderilir. Bulut/API yok.</p><button id="start">Kamerayı başlat</button><button id="motion">Yönelim iznini ver</button><button id="stop" disabled>Durdur</button><p id="s">Hazır · hedef __FPS__ FPS</p><video id="v" autoplay playsinline muted></video><canvas id="c" hidden></canvas><script>
const secret="__SECRET__", targetFps=__FPS__, statusEl=document.querySelector('#s'), video=document.querySelector('#v'), canvas=document.querySelector('#c'), stopButton=document.querySelector('#stop');
let stream=null,running=false,motionOn=false,lastPoseAt=0;
async function start(){try{if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('HTTPS güvenli bağlam gerekli');stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:targetFps,max:targetFps}},audio:false});video.srcObject=stream;running=true;stopButton.disabled=false;statusEl.textContent='Telefon kamerası bağlı · PC aktarımı başladı';sendFrames();}catch(e){statusEl.textContent='Kamera erişimi başarısız: '+e.message;}}
async function sendFrames(){const interval=Math.max(33,Math.round(1000/targetFps));while(running){if(video.readyState>=2&&video.videoWidth&&video.videoHeight){const maxWidth=1280,scale=Math.min(1,maxWidth/video.videoWidth);canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.78));if(blob)fetch('/camera/'+secret+'/frame',{method:'POST',headers:{'content-type':'image/jpeg'},body:blob}).catch(()=>{});}await new Promise(r=>setTimeout(r,interval));}}
function stop(){running=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}video.srcObject=null;stopButton.disabled=true;statusEl.textContent='Aktarım durduruldu.';}
async function motion(){try{if(typeof DeviceOrientationEvent==='undefined')throw new Error('Cihaz yönelim sensörü desteklenmiyor');if(typeof DeviceOrientationEvent.requestPermission==='function'){const p=await DeviceOrientationEvent.requestPermission();if(p!=='granted')throw new Error('İzin verilmedi');}if(motionOn)return;motionOn=true;window.addEventListener('deviceorientation',e=>{const now=Date.now();if(now-lastPoseAt<50)return;lastPoseAt=now;if([e.alpha,e.beta,e.gamma].some(v=>!Number.isFinite(Number(v))))return;fetch('/camera/'+secret+'/pose',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({alpha:e.alpha,beta:e.beta,gamma:e.gamma,absolute:e.absolute,timestamp:now})}).catch(()=>{});});statusEl.textContent='Kamera + yönelim aktarımı aktif';}catch(e){statusEl.textContent='Yönelim erişimi: '+e.message;}}
document.querySelector('#start').onclick=start;document.querySelector('#motion').onclick=motion;stopButton.onclick=stop;
</script></html>';
  return html.replace('__SECRET__',JSON.stringify(secret)).replace('__FPS__',String(Number(fps)));
}
export class LocalPhoneCameraServer{
  constructor({onFrame,onPose,host='0.0.0.0',port=0,httpsPort=0,fps=DEFAULT_FPS,certPath=process.env.ISH_CAMERA_TLS_CERT||'.runtime/local-phone-camera/cert.pem',keyPath=process.env.ISH_CAMERA_TLS_KEY||'.runtime/local-phone-camera/key.pem'}={}){
    this.onFrame=onFrame;this.onPose=onPose;this.host=host;this.port=port;this.httpsPort=httpsPort;this.fps=Math.max(1,Math.min(30,Number(fps)||DEFAULT_FPS));this.certPath=certPath;this.keyPath=keyPath;this.secret=token();this.server=null;this.httpsServer=null;this.lastFrameAt=null;this.lastPoseAt=null;this.frames=0;
  }
  handler(req,res){return this.#handle(req,res);}
  async #handle(req,res){
    try{const prefix='/camera/'+this.secret;
      if(req.url===prefix||req.url===prefix+'/'){if(req.method!=='GET')return send(res,405,{error:'METHOD_NOT_ALLOWED'});return send(res,200,page(this.secret,this.fps),'text/html; charset=utf-8');}
      if(req.url===prefix+'/frame'){if(req.method!=='POST')return send(res,405,{error:'METHOD_NOT_ALLOWED'});const body=await readBody(req,MAX_FRAME_BYTES);if(!body.length||body[0]!==0xff||body[1]!==0xd8)return send(res,415,{error:'JPEG_REQUIRED'});this.frames++;this.lastFrameAt=Date.now();await this.onFrame?.(body);return send(res,204,'');}
      if(req.url===prefix+'/pose'){if(req.method!=='POST')return send(res,405,{error:'METHOD_NOT_ALLOWED'});const body=await readBody(req,MAX_POSE_BYTES);const pose=JSON.parse(body.toString('utf8'));if(![pose.alpha,pose.beta,pose.gamma].every(v=>Number.isFinite(Number(v))))return send(res,400,{error:'INVALID_POSE'});this.lastPoseAt=Date.now();await this.onPose?.({...pose,alpha:Number(pose.alpha),beta:Number(pose.beta),gamma:Number(pose.gamma)});return send(res,204,'');}
      if(req.url==='/health')return send(res,200,this.status());return send(res,404,{error:'NOT_FOUND'});
    }catch(error){return send(res,400,{error:error.message});}
  }
  async start(){
    if(this.server)return this.info();
    this.server=http.createServer((req,res)=>this.handler(req,res));
    await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(this.port,this.host,resolve);});
    try{if(ensureTlsMaterial(this.certPath,this.keyPath,this.host)){const tls={cert:fs.readFileSync(this.certPath),key:fs.readFileSync(this.keyPath)};this.httpsServer=https.createServer(tls,(req,res)=>this.handler(req,res));await new Promise((resolve,reject)=>{this.httpsServer.once('error',reject);this.httpsServer.listen(this.httpsPort,this.host,resolve);});}}catch{}
    return this.info();
  }
  info(){
    const a=this.server?.address(),port=typeof a==='object'&&a?a.port:this.port;const h=this.httpsServer?.address(),httpsPort=typeof h==='object'&&h?h.port:this.httpsPort;
    const httpUrls=localAddresses(this.host,port,this.secret,'http');const httpsUrls=this.httpsServer?localAddresses(this.host,httpsPort,this.secret,'https'):[];
    return {status:'READY',transport:this.httpsServer?'HYBRID_LOCAL':'HTTP_LOCAL',port,httpsPort:httpsPort||null,fps:this.fps,urls:[...httpsUrls,...httpUrls],httpUrls,httpsUrls,httpsAvailable:Boolean(this.httpsServer),frames:this.frames,lastFrameAt:this.lastFrameAt,lastPoseAt:this.lastPoseAt,secureContextRequired:true};
  }
  status(){return {...this.info(),connected:Boolean(this.lastFrameAt&&Date.now()-this.lastFrameAt<3000)};}
  async stop(){const closers=[];if(this.server)closers.push(new Promise(r=>this.server.close(()=>r())));if(this.httpsServer)closers.push(new Promise(r=>this.httpsServer.close(()=>r())));await Promise.all(closers);this.server=null;this.httpsServer=null;return {status:'STOPPED'};}
}
