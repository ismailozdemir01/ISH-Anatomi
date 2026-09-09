const { app, BrowserWindow, dialog, ipcMain, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

let win;
let liveController;
let probeManager;
let phoneCamera;
const root = () => app.getAppPath();
const atlasDir = () => path.join(root(), 'vendor', 'human-atlas');

async function imagingModules() {
  return Promise.all([
    import(path.join(root(), 'imaging', 'live-controller.mjs')),
    import(path.join(root(), 'probe', 'manager.mjs')),
    import(path.join(root(), 'clinical', 'engine.cjs'))
  ]);
}

async function initImaging() {
  const [{LiveImagingController}, {ProbeManager}, clinical] = await imagingModules();
  probeManager = new ProbeManager();
  liveController = new LiveImagingController({
    anatomyLocator: async () => ({status:'NOT_CONFIGURED', reason:'REAL_ANATOMICAL_LOCALIZER_REQUIRED'}),
    clinicalEngine: async ({frame, quality, anatomy}) => clinical.assess({imaging:{modality:'US',frame,quality,anatomy}})
  });
  liveController.onResult(result => { if (win && !win.isDestroyed()) win.webContents.send('imaging:result', result); });
}

async function initPhoneCamera() {
  const {LocalPhoneCameraServer} = await import(path.join(root(), 'camera', 'local-phone-camera.mjs'));
  phoneCamera = new LocalPhoneCameraServer({
    onFrame: async buffer => {
      const image = nativeImage.createFromBuffer(buffer);
      const size = image.getSize();
      if (!size.width || !size.height) return;
      const bitmap = image.toBitmap();
      const gray = new Uint8Array(size.width * size.height);
      for (let i=0,p=0;i<gray.length;i+=1,p+=4) gray[i]=Math.round(bitmap[p]*0.114+bitmap[p+1]*0.587+bitmap[p+2]*0.299);
      if (win && !win.isDestroyed()) win.webContents.send('phone-camera:frame',{width:size.width,height:size.height,jpeg:buffer,gray});
    },
    onPose: async pose => { if (win && !win.isDestroyed()) win.webContents.send('phone-camera:pose', pose); }
  });
  return phoneCamera.start();
}

async function localModules() {
  return Promise.all([
    import(path.join(root(), 'local-ai', 'intent.mjs')),
    import(path.join(root(), 'local-ai', 'catalog.mjs')),
    import(path.join(root(), 'local-ai', 'knowledge.mjs')),
    import(path.join(root(), 'local-ai', 'study.mjs'))
  ]);
}

async function compileIntent(text) {
  const [intent, catalogModule, knowledge] = await localModules();
  const result = intent.compileIntent(text);
  const catalog = await catalogModule.loadCatalog(root());
  const status = catalogModule.catalogStatus(catalog);
  const search = result.actions.find(a => a.type === 'search');
  if (search && catalog) {
    const concept = catalogModule.findConcept(catalog, search.query);
    if (!concept) {
      result.actions = result.actions.filter(a => a !== search);
      result.answer = 'Bu ifade gerçek anatomi kataloğunda doğrulanamadı; modelde olmayan bir yapı uydurulmadı.';
      result.type = 'catalog_miss';
    } else { search.query = concept.name; search.conceptId = concept.id; }
  }
  const question = knowledge.answerAnatomyQuestion(text);
  if (question.status === 'KNOWN') result.knowledge = question;
  result.catalog = status;
  return result;
}

async function studyCard(text) { const [, , , study] = await localModules(); return study.studyCard(text); }
async function createQuiz(count, seed) { const [, , , study] = await localModules(); return study.createQuiz(count, seed); }

function viewerScript(actions) {
  return `(() => {
    const actions = ${JSON.stringify(actions)};
    const text = (el) => (el?.innerText || el?.textContent || el?.getAttribute('aria-label') || el?.getAttribute('title') || '').trim().toLocaleLowerCase('tr-TR');
    const clickText = (needle) => { const els=[...document.querySelectorAll('button,[role="button"]')]; const hit=els.find(e=>text(e).includes(String(needle).toLocaleLowerCase('tr-TR'))); if(hit){hit.click();return true} return false; };
    for (const a of actions) {
      if (a.type === 'search') { const input=[...document.querySelectorAll('input')].find(e=>/structure|anatom|search|ara|find/i.test(e.getAttribute('placeholder')||'')||e.getAttribute('role')==='combobox'); if(input){input.focus();const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,a.query);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{const result=[...document.querySelectorAll('[role="option"],button')].find(e=>text(e).includes(a.query.toLocaleLowerCase('tr-TR')));if(result)result.click();},300);} }
      if (a.type === 'system') clickText(a.id);
      if (a.type === 'view') clickText(a.view);
      if (a.type === 'rotate') { const b=[...document.querySelectorAll('button')].find(e=>/rotate|döndür/i.test(text(e))); if(b)b.click(); }
      if (a.type === 'explode') { const r=[...document.querySelectorAll('input[type="range"]')].find(e=>/explode|patlat|ayır|ayir/i.test(text(e.parentElement))); if(r){r.value=String(a.value);r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));} }
      if (a.type === 'isolate') clickText(a.value ? 'isolate' : 'show all');
    }
    return true;
  })()`;
}

async function executeViewerActions(actions) {
  if (!win || win.isDestroyed()) return {ok:false,error:'WINDOW_NOT_READY'};
  try { await win.webContents.executeJavaScript(viewerScript(actions)); return {ok:true}; } catch(error) { return {ok:false,error:error.message}; }
}

function assistantPanelScript() {
  return `(() => {
    if(document.getElementById('ish-local-assistant')) return;
    const style=document.createElement('style');style.textContent='#ish-local-assistant{position:fixed;right:18px;top:18px;width:380px;z-index:2147483647;background:rgba(12,18,30,.97);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:14px;box-shadow:0 18px 60px rgba(0,0,0,.35);font:14px system-ui,sans-serif}#ish-local-assistant h3{margin:0 0 8px;font-size:15px}#ish-local-assistant .row{display:flex;gap:7px}#ish-local-assistant input{flex:1;padding:10px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#fff}#ish-local-assistant button{padding:10px 12px;border:0;border-radius:10px;background:#334155;color:#fff;cursor:pointer}#ish-local-assistant .status{margin-top:8px;color:#cbd5e1;font-size:12px;line-height:1.45}#ish-local-assistant .answer{margin-top:8px;color:#f8fafc;line-height:1.45}#ish-live,#ish-phone{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12)}#ish-live .metric,#ish-phone .metric{display:flex;justify-content:space-between;margin:4px 0;color:#cbd5e1}#ish-live button{width:100%;margin-top:6px}#ish-phone code{display:block;word-break:break-all;color:#93c5fd;font-size:11px;margin-top:6px}#ish-phone img{width:100%;max-height:190px;object-fit:contain;background:#000;border-radius:10px;margin-top:8px}';document.head.appendChild(style);
    const box=document.createElement('aside');box.id='ish-local-assistant';box.innerHTML='<h3>ISH-Anatomi · Yerel AI</h3><div class="row"><input id="ish-ai-q" placeholder="Anatomi komutu veya soru…"><button id="ish-ai-send">Uygula</button></div><div class="status" id="ish-ai-status">Harici AI API yok. Gerçek atlas kataloğu kullanılır.</div><div class="answer" id="ish-ai-answer"></div><section id="ish-live"><strong>Canlı Ultrason</strong><div class="metric"><span>Prob</span><span id="ish-probe">NOT_CONNECTED</span></div><div class="metric"><span>Görüntü</span><span id="ish-frame">NO_SIGNAL</span></div><div class="metric"><span>Anatomi</span><span id="ish-anatomy">UNKNOWN</span></div><div class="metric"><span>Klinik</span><span id="ish-clinical">UNKNOWN</span></div><button id="ish-probe-refresh">Prob durumunu yenile</button></section><section id="ish-phone"><strong>Telefon · Sanal Kamera</strong><div class="status" id="ish-phone-status">Yerel bağlantı hazırlanıyor…</div><code id="ish-phone-url">-</code><img id="ish-phone-img" alt="Yerel telefon kamera önizlemesi"><div class="metric"><span>Yönelim</span><span id="ish-phone-pose">NO_SIGNAL</span></div></section></aside>';document.body.appendChild(box);
    const q=box.querySelector('#ish-ai-q'),send=box.querySelector('#ish-ai-send'),status=box.querySelector('#ish-ai-status'),answer=box.querySelector('#ish-ai-answer');
    const run=async()=>{const value=q.value.trim();if(!value)return;status.textContent='Yerel anatomi motoru çalışıyor…';answer.textContent='';try{const result=await window.ishAnatomi.compileIntent(value);const cat=result.catalog&&result.catalog.status==='READY'?' · '+result.catalog.parts+' parça / '+result.catalog.concepts+' kavram':'';status.textContent=result.answer+cat;if(result.knowledge?.status==='KNOWN')answer.textContent=result.knowledge.answer;await window.ishAnatomi.executeViewerActions(result.actions||[]);}catch(e){status.textContent='Yerel motor hatası: '+e.message;}};
    send.addEventListener('click',run);q.addEventListener('keydown',e=>{if(e.key==='Enter')run();});
    const refreshProbe=async()=>{try{const s=await window.ishAnatomi.probeStatus();box.querySelector('#ish-probe').textContent=s.status+(s.transport?' · '+s.transport:'');}catch(e){box.querySelector('#ish-probe').textContent='ERROR';}};box.querySelector('#ish-probe-refresh').addEventListener('click',refreshProbe);refreshProbe();
    window.ishAnatomi.onLiveResult(r=>{box.querySelector('#ish-frame').textContent=r.status||'UNKNOWN';box.querySelector('#ish-anatomy').textContent=r.registration?.structureId||r.anatomy?.status||'UNKNOWN';box.querySelector('#ish-clinical').textContent=r.clinical?.status||'UNKNOWN';});
    window.ishAnatomi.onPhoneCameraInfo(info=>{box.querySelector('#ish-phone-status').textContent='Telefonu aynı yerel ağa bağla ve aşağıdaki adresi aç.';box.querySelector('#ish-phone-url').textContent=info.urls?.[0]||'Yerel ağ adresi bulunamadı';});
    window.ishAnatomi.onPhoneCameraFrame(payload=>{const blob=new Blob([payload.jpeg],{type:'image/jpeg'});const url=URL.createObjectURL(blob);const img=box.querySelector('#ish-phone-img');const old=img.dataset.url;if(old)URL.revokeObjectURL(old);img.dataset.url=url;img.src=url;});
    window.ishAnatomi.onPhoneCameraPose(p=>{box.querySelector('#ish-phone-pose').textContent=[p.alpha,p.beta,p.gamma].map(v=>Number(v).toFixed(1)+'°').join(' / ');});
  })()`;
}

async function createWindow() {
  win = new BrowserWindow({width:1440,height:920,minWidth:1100,minHeight:720,backgroundColor:'#0b1020',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  if (app.isPackaged) {
    const index=path.join(atlasDir(),'dist','index.html');
    if(!fs.existsSync(index)){dialog.showErrorBox('ISH-Anatomi','Paketlenmiş anatomi motoru bulunamadı.');app.quit();return;}
    await win.loadFile(index);
  } else {
    const {spawn}=require('node:child_process');
    const child=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev','--','--host','127.0.0.1'],{cwd:atlasDir(),stdio:'inherit',shell:false,env:{...process.env,BROWSER:'none'}});
    win.once('closed',()=>{if(!child.killed)child.kill();});
    const start=Date.now();let ready=false;while(Date.now()-start<30000){try{await fetch('http://127.0.0.1:5173');ready=true;break}catch{await new Promise(r=>setTimeout(r,400));}}if(!ready){dialog.showErrorBox('ISH-Anatomi','3D anatomi motoru 30 saniye içinde hazır olmadı.');app.quit();return;}
    await win.loadURL('http://127.0.0.1:5173');
  }
  await win.webContents.executeJavaScript(assistantPanelScript());
  if(phoneCamera)win.webContents.send('phone-camera:info',phoneCamera.info());
}

ipcMain.handle('app:info',()=>({name:'ISH-Anatomi',version:app.getVersion(),localAI:true,externalAI:false,clinicalExtension:true,liveUltrasound:true,localPhoneCamera:true,transports:['usb','wifi','bluetooth-le','phone-local-lan']}));
ipcMain.handle('ai:compile',(_event,text)=>compileIntent(text));
ipcMain.handle('study:card',(_event,text)=>studyCard(text));
ipcMain.handle('study:quiz',(_event,count,seed)=>createQuiz(count,seed));
ipcMain.handle('clinical:assess',(_event,payload)=>require('../clinical/engine.cjs').assess(payload));
ipcMain.handle('viewer:actions',(_event,actions)=>executeViewerActions(actions));
ipcMain.handle('probe:list',()=>probeManager?.list()??[]);
ipcMain.handle('probe:status',()=>probeManager?.status()??{status:'NOT_CONFIGURED'});
ipcMain.handle('imaging:start',(_event,session)=>{if(!liveController)return {status:'NOT_CONFIGURED'};return {status:'STARTED',session:liveController.start(session)};});
ipcMain.handle('imaging:stop',()=>liveController?.stop()??{status:'NOT_CONFIGURED'});
ipcMain.handle('imaging:frame',(_event,frame)=>liveController?.push(frame)??{status:'NOT_CONFIGURED'});
ipcMain.handle('phone-camera:status',()=>phoneCamera?.status()??{status:'NOT_CONFIGURED'});
ipcMain.handle('phone-camera:stop',()=>phoneCamera?.stop()??{status:'NOT_CONFIGURED'});

app.whenReady().then(async()=>{await initImaging();await initPhoneCamera();await createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('before-quit',async()=>{await phoneCamera?.stop();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
