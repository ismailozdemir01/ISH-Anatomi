const { app, BrowserWindow, dialog, ipcMain, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

let win;
let liveController;
let probeManager;
let probeStream;
let inferenceAdapter;
let clinicalAssessment;
let clinicalEvidenceStore;
let phoneCamera;
let virtualCamera;
let virtualCameraState;
let cameraAnalyzer;
let previousPhoneFrame;
let phoneImagingStarted = false;
let phoneFrameSequence = 0;
let atlasCatalog = null;
let bluetoothSelectionCallback = null;
let bluetoothPairingCallback = null;
const root = () => app.getAppPath();
const atlasDir = () => path.join(root(), 'vendor', 'human-atlas');

const importModule = filePath => import(pathToFileURL(filePath).href);

async function imagingModules() {
  return Promise.all([
    importModule(path.join(root(), 'imaging', 'live-controller.mjs')),
    importModule(path.join(root(), 'probe', 'manager.mjs')),
    importModule(path.join(root(), 'probe', 'stream.mjs')),
    importModule(path.join(root(), 'clinical', 'engine.cjs')),
    importModule(path.join(root(), 'clinical', 'assessment.mjs')),
    importModule(path.join(root(), 'imaging', 'model-runtime.mjs')),
    importModule(path.join(root(), 'local-ai', 'catalog.mjs')),
  ]);
}

async function initImaging() {
  const [{LiveImagingController}, {ProbeManager}, {ProbeStreamBridge}, clinical, assessment, modelRuntime, catalogModule] = await imagingModules();
  atlasCatalog = await catalogModule.loadCatalog(root());
  probeManager = new ProbeManager();
  clinicalAssessment = assessment;
  clinicalEvidenceStore = assessment.createEmptyEvidenceStore();
  inferenceAdapter = modelRuntime.createInferenceAdapter({});
  liveController = new LiveImagingController({
    atlasCatalog: atlasCatalog?.concepts ?? [],
    anatomyLocator: async frame => ({
      status:'NOT_CONFIGURED',
      reason:frame?.source==='PHONE_CAMERA'?'LOCAL_ANATOMY_MODEL_REQUIRED':'REAL_ANATOMICAL_LOCALIZER_REQUIRED'
    }),
    inference: async input => inferenceAdapter.infer(input),
    clinicalEngine: async ({frame, sourceFrame, quality, anatomy, inference}) => clinicalAssessment.assessClinicalCase({
      imaging:{modality:'US', frame, sourceFrame, quality, anatomy, inference},
      observations: anatomy?.structureId ? [anatomy.structureId] : [],
      imagingFindings: anatomy?.finding ? [anatomy.finding] : []
    }, {store:clinicalEvidenceStore, modelValidated:false})
  });
  probeStream = new ProbeStreamBridge({controller:liveController});
  liveController.onResult(result => { if (win && !win.isDestroyed()) win.webContents.send('imaging:result', result); });
}

function virtualCameraDragScript(drag) {
  return `(() => {
    const drag = ${JSON.stringify(drag)};
    if (!drag || (!drag.dx && !drag.dy)) return {status:'NO_MOVEMENT'};
    const canvas = document.querySelector('canvas[aria-label*="Interactive human anatomy"]') || document.querySelector('canvas');
    if (!canvas) return {status:'CANVAS_NOT_FOUND'};
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(rect.left + 2, Math.min(rect.right - 2, rect.left + rect.width / 2));
    const y = Math.max(rect.top + 2, Math.min(rect.bottom - 2, rect.top + rect.height / 2));
    const endX = Math.max(rect.left + 2, Math.min(rect.right - 2, x + drag.dx));
    const endY = Math.max(rect.top + 2, Math.min(rect.bottom - 2, y + drag.dy));
    const pointerId = 2147483001;
    canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:x,clientY:y,pointerId,pointerType:'mouse',button:0,buttons:1}));
    canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:endX,clientY:endY,pointerId,pointerType:'mouse',buttons:1}));
    canvas.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:endX,clientY:endY,pointerId,pointerType:'mouse',button:0,buttons:0}));
    return {status:'APPLIED',dx:drag.dx,dy:drag.dy};
  })()`;
}

async function applyVirtualCameraPose(pose) {
  if (!virtualCamera || !virtualCameraState) return {status:'NOT_CONFIGURED'};
  const mapped = virtualCamera.mapPoseToCameraDrag(virtualCameraState, pose);
  virtualCameraState = mapped.state;
  if (mapped.drag && win && !win.isDestroyed()) {
    try { await win.webContents.executeJavaScript(virtualCameraDragScript(mapped.drag)); } catch { return {status:'VIEWER_NOT_READY'}; }
  }
  return mapped;
}

async function initPhoneCamera() {
  const [{LocalPhoneCameraServer}, mapper, analyzer] = await Promise.all([
    importModule(path.join(root(), 'camera', 'local-phone-camera.mjs')),
    importModule(path.join(root(), 'camera', 'virtual-camera.mjs')),
    importModule(path.join(root(), 'camera', 'frame-analysis.mjs'))
  ]);
  virtualCamera = mapper;
  virtualCameraState = mapper.createVirtualCameraState();
  cameraAnalyzer = analyzer;
  previousPhoneFrame = null;
  phoneImagingStarted = false;
  phoneFrameSequence = 0;
  phoneCamera = new LocalPhoneCameraServer({
    onFrame: async buffer => {
      const image = nativeImage.createFromBuffer(buffer);
      const size = image.getSize();
      if (!size.width || !size.height) return;
      const bitmap = image.toBitmap();
      const gray = new Uint8Array(size.width * size.height);
      for (let i=0,p=0;i<gray.length;i+=1,p+=4) gray[i]=Math.round(bitmap[p]*0.114+bitmap[p+1]*0.587+bitmap[p+2]*0.299);
      const frame = {width:size.width,height:size.height,gray};
      const analysis = cameraAnalyzer.analyzePhoneFrame(frame);
      const motion = cameraAnalyzer.comparePhoneFrames(previousPhoneFrame, frame);
      previousPhoneFrame = frame;
      if (!phoneImagingStarted) {
        phoneImagingStarted = true;
        if (win && !win.isDestroyed()) win.webContents.send('phone-camera:status-update', {
          status:'CONNECTED',
          reason:'PHONE_CAMERA_IS_NOT_ULTRASOUND',
          message:'Telefon kamerası yerel optik görüntü kaynağıdır; US pipelineına zorlanmaz.'
        });
      }
      const pipelineFrame = {
        id:'phone-' + (++phoneFrameSequence),
        source:'PHONE_CAMERA',
        width:size.width,
        height:size.height,
        timestamp:Date.now(),
        data:gray,
        imageBase64:buffer.toString('base64')
      };
      const liveResult = null;
      if (win && !win.isDestroyed()) win.webContents.send('phone-camera:frame',{width:size.width,height:size.height,jpeg:buffer,analysis,motion,liveResult});
    },
    onPose: async pose => {
      if (win && !win.isDestroyed()) win.webContents.send('phone-camera:pose', pose);
      await applyVirtualCameraPose(pose);
    }
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
      if (a.type === 'explode') { const r=[...document.querySelectorAll('input[type="range"]')].find(e=>/explode|patlat|ayır|ayir/i.test(text(e.parentElement))); if(r){r.value=String(a.value);r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true));} }
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
    const style=document.createElement('style');style.textContent='#ish-local-assistant{position:fixed;right:18px;top:18px;width:380px;z-index:2147483647;background:rgba(12,18,30,.97);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:14px;box-shadow:0 18px 60px rgba(0,0,0,.35);font:14px system-ui,sans-serif}#ish-local-assistant h3{margin:0 0 8px;font-size:15px}#ish-local-assistant .row{display:flex;gap:7px}#ish-local-assistant input{flex:1;padding:10px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#fff}#ish-local-assistant button{padding:10px 12px;border:0;border-radius:10px;background:#334155;color:#fff;cursor:pointer}#ish-local-assistant .status{margin-top:8px;color:#cbd5e1;font-size:12px;line-height:1.45}#ish-local-assistant .answer{margin-top:8px;color:#f8fafc;line-height:1.45}#ish-live,#ish-phone{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12)}#ish-live .metric,#ish-phone .metric{display:flex;justify-content:space-between;margin:4px 0;color:#cbd5e1}#ish-live button,#ish-phone button,#ish-bluetooth button{width:100%;margin-top:6px}#ish-bluetooth{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12)}#ish-bluetooth .bt-device,#ish-phone .phone-device{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 0;border-top:1px solid rgba(255,255,255,.08)}#ish-bluetooth .bt-device button,#ish-phone .phone-device button{width:auto;margin:0;padding:7px 9px}#ish-phone code{display:block;word-break:break-all;color:#93c5fd;font-size:11px;margin-top:6px}#ish-phone img{width:100%;max-height:190px;object-fit:contain;background:#000;border-radius:10px;margin-top:8px}#ish-phone .active{background:#0f766e}';document.head.appendChild(style);
    const box=document.createElement('aside');box.id='ish-local-assistant';box.innerHTML='<h3>ISH-Anatomi · Yerel AI</h3><div class="row"><input id="ish-ai-q" placeholder="Anatomi komutu veya soru…"><button id="ish-ai-send">Uygula</button></div><div class="status" id="ish-ai-status">Harici AI API yok. Gerçek atlas kataloğu kullanılır.</div><div class="answer" id="ish-ai-answer"></div><section id="ish-live"><strong>Canlı Ultrason</strong><div class="metric"><span>Prob</span><span id="ish-probe">NOT_CONNECTED</span></div><div class="metric"><span>Görüntü</span><span id="ish-frame">NO_SIGNAL</span></div><div class="metric"><span>Anatomi</span><span id="ish-anatomy">UNKNOWN</span></div><div class="metric"><span>Klinik</span><span id="ish-clinical">UNKNOWN</span></div><button id="ish-probe-refresh">Prob durumunu yenile</button></section><section id="ish-bluetooth"><strong>Bluetooth · Yerel Cihaz</strong><div class="status" id="ish-bt-status">Bluetooth hazır değil.</div><div id="ish-bt-devices"></div><div class="metric"><span>Cihaz</span><span id="ish-bt-name">-</span></div><div class="metric"><span>GATT</span><span id="ish-bt-gatt">DISCONNECTED</span></div><button id="ish-bt-connect">Bluetooth cihazı bağla</button><button id="ish-bt-cancel">Aramayı iptal et</button><button id="ish-bt-disconnect">Bağlantıyı kes</button></section><section id="ish-phone"><strong>Telefon · Lokal Kamera</strong><div class="status" id="ish-phone-status">Yerel bağlantı hazırlanıyor…</div><code id="ish-phone-url">-</code><img id="ish-phone-img" alt="Yerel telefon kamera önizlemesi"><div class="metric"><span>Yönelim</span><span id="ish-phone-pose">NO_SIGNAL</span></div><div class="metric"><span>Görüntü kalitesi</span><span id="ish-phone-quality">NO_SIGNAL</span></div><div class="metric"><span>Hareket</span><span id="ish-phone-motion">NO_SIGNAL</span></div><div class="metric"><span>Atlas</span><span id="ish-phone-atlas">ANATOMY_MODEL_REQUIRED</span></div><button id="ish-phone-virtual">3D Sanal Kamerayı Aç</button></section></aside>';document.body.appendChild(box);
    const q=box.querySelector('#ish-ai-q'),send=box.querySelector('#ish-ai-send'),status=box.querySelector('#ish-ai-status'),answer=box.querySelector('#ish-ai-answer');
    const run=async()=>{const value=q.value.trim();if(!value)return;status.textContent='Yerel anatomi motoru çalışıyor…';answer.textContent='';try{const result=await window.ishAnatomi.compileIntent(value);const cat=result.catalog&&result.catalog.status==='READY'?' · '+result.catalog.parts+' parça / '+result.catalog.concepts+' kavram':'';status.textContent=result.answer+cat;if(result.knowledge?.status==='KNOWN')answer.textContent=result.knowledge.answer;await window.ishAnatomi.executeViewerActions(result.actions||[]);}catch(e){status.textContent='Yerel motor hatası: '+e.message;}};
    send.addEventListener('click',run);q.addEventListener('keydown',e=>{if(e.key==='Enter')run();});
    const refreshProbe=async()=>{try{const s=await window.ishAnatomi.probeStatus();box.querySelector('#ish-probe').textContent=s.status+(s.transport?' · '+s.transport:'');}catch(e){box.querySelector('#ish-probe').textContent='ERROR';}};box.querySelector('#ish-probe-refresh').addEventListener('click',refreshProbe);refreshProbe();
    const btStatus=box.querySelector('#ish-bt-status'),btName=box.querySelector('#ish-bt-name'),btGatt=box.querySelector('#ish-bt-gatt'),btDevices=box.querySelector('#ish-bt-devices');
    const phoneStatus=box.querySelector('#ish-phone-status'),phoneDevices=box.querySelector('#ish-phone-devices');
    let bluetoothDevice=null,bluetoothServer=null;
    const btSupported=!!navigator.bluetooth;
    if(!btSupported)btStatus.textContent='Bu Electron/Chromium ortamında Web Bluetooth kullanılamıyor.';
    else if(navigator.bluetooth.getAvailability) navigator.bluetooth.getAvailability().then(ok=>{if(!ok)btStatus.textContent='Bluetooth adaptörü kullanılabilir görünmüyor. Windows Bluetooth açık mı kontrol edin.';}).catch(()=>{});
    const renderBtDevices=(devices)=>{btDevices.innerHTML='';for(const d of(devices||[])){const row=document.createElement('div');row.className='bt-device';const label=document.createElement('span');label.textContent=d.deviceName||'İsimsiz Bluetooth cihazı';const pick=document.createElement('button');pick.textContent='Bağlan';pick.addEventListener('click',async()=>{btStatus.textContent=(d.deviceName||'Cihaz')+' seçiliyor…';await window.ishAnatomi.bluetoothSelect(d.deviceId);});row.append(label,pick);btDevices.appendChild(row);}if(devices?.length)btStatus.textContent='Bluetooth cihazları bulundu. Panelden bağlanacağın cihazı seç.';};
    const disconnectBluetooth=async()=>{try{if(bluetoothDevice?.gatt?.connected)bluetoothDevice.gatt.disconnect();}catch{}bluetoothServer=null;bluetoothDevice=null;btName.textContent='-';btGatt.textContent='DISCONNECTED';btStatus.textContent='Bluetooth bağlantısı kapatıldı.';};
    const connectBluetooth=async()=>{if(!btSupported)return;btStatus.textContent='Bluetooth cihazları aranıyor…';btDevices.innerHTML='';try{const device=await navigator.bluetooth.requestDevice({acceptAllDevices:true});bluetoothDevice=device;btName.textContent=device.name||device.id||'İsimsiz cihaz';device.addEventListener('gattserverdisconnected',()=>{bluetoothServer=null;btGatt.textContent='DISCONNECTED';btStatus.textContent='Bluetooth cihazı ayrıldı.';});if(device.gatt){btStatus.textContent='GATT bağlantısı kuruluyor…';bluetoothServer=await device.gatt.connect();btGatt.textContent=bluetoothServer.connected?'CONNECTED':'DISCONNECTED';btStatus.textContent='Bluetooth cihazı yerel olarak bağlandı. Veri protokolü/karakteristik cihazına göre ayrıca eşlenir.';}else btStatus.textContent='Cihaz bulundu fakat GATT desteği yok.';}catch(e){btStatus.textContent=e?.name==='NotFoundError'?'Bluetooth cihaz seçimi iptal edildi.':'Bluetooth hatası: '+(e?.message||e);}};
    box.querySelector('#ish-bt-connect').addEventListener('click',connectBluetooth);box.querySelector('#ish-bt-cancel').addEventListener('click',()=>window.ishAnatomi.bluetoothCancel());box.querySelector('#ish-bt-disconnect').addEventListener('click',disconnectBluetooth);window.ishAnatomi.onBluetoothDevices(renderBtDevices);
    window.ishAnatomi.onBluetoothDevicesEmpty(info=>{btStatus.textContent='Bluetooth taramasında cihaz bulunamadı. Cihazın BLE olması, açık olması ve Windows Bluetooth\'un açık olması gerekir.';});
    window.ishAnatomi.onBluetoothPairingRequest(async details=>{
      let response={confirmed:false};
      if(details.pairingKind==='confirm') response.confirmed=window.confirm('Bluetooth cihazı eşleştirilsin mi?\\nCihaz: '+details.deviceId);
      else if(details.pairingKind==='confirmPin') response.confirmed=window.confirm('Bluetooth PIN eşleşiyor mu?\\nPIN: '+details.pin);
      else if(details.pairingKind==='providePin'){const pin=window.prompt('Bluetooth PIN girin:');if(pin){response={confirmed:true,pin};}}
      await window.ishAnatomi.bluetoothPairingResponse(response);
    });
    let virtualOn=false;const virtualButton=box.querySelector('#ish-phone-virtual');virtualButton.addEventListener('click',async()=>{virtualOn=!virtualOn;const result=await window.ishAnatomi.setVirtualCamera(virtualOn);virtualButton.textContent=virtualOn?'3D Sanal Kamera Açık':'3D Sanal Kamerayı Aç';virtualButton.classList.toggle('active',virtualOn);box.querySelector('#ish-phone-status').textContent=result.status==='READY'?'Telefon yönelimi 3D anatomi kamerasını sürüyor.':'Sanal kamera: '+result.status;});
    window.ishAnatomi.onLiveResult(r=>{box.querySelector('#ish-frame').textContent=r.status||'UNKNOWN';box.querySelector('#ish-anatomy').textContent=r.registration?.structureId||r.anatomy?.status||'UNKNOWN';box.querySelector('#ish-clinical').textContent=r.clinical?.safety?.status||r.clinical?.status||'UNKNOWN';});
    const renderPhoneInfo=(info)=>{phoneDevices.innerHTML='';const urls=[...(info?.httpsUrls||[]),...(info?.urls||[])];const unique=[...new Set(urls)];for(const url of unique){const row=document.createElement('div');row.className='phone-device';const label=document.createElement('span');label.textContent=url;const open=document.createElement('button');open.textContent='Aç';open.addEventListener('click',()=>window.open(url,'_blank'));row.append(label,open);phoneDevices.appendChild(row);}box.querySelector('#ish-phone-url').textContent=unique[0]||'Yerel ağ adresi bulunamadı';phoneStatus.textContent=info?.status==='RUNNING'?'Telefon kamera sunucusu hazır. Telefonu aynı Wi‑Fi ağına bağla.':'Telefon kamera sunucusu hazır değil.';};
    window.ishAnatomi.onPhoneCameraInfo(renderPhoneInfo);
    box.querySelector('#ish-phone-search').addEventListener('click',async()=>{phoneStatus.textContent='Yerel kamera sunucusu aranıyor…';try{const info=await window.ishAnatomi.phoneCameraSearch();renderPhoneInfo(info);if(info?.status==='RUNNING')phoneStatus.textContent='Kamera bulundu. Telefonda gösterilen HTTPS adresini aç.';}catch(e){phoneStatus.textContent='Kamera arama hatası: '+(e?.message||e);}});
    box.querySelector('#ish-phone-start').addEventListener('click',async()=>{const r=await window.ishAnatomi.phoneCameraStart();phoneStatus.textContent=r?.status==='STARTED'?'Telefon kamerası çalışıyor.':('Kamera: '+(r?.status||'UNKNOWN'));});
    box.querySelector('#ish-phone-stop').addEventListener('click',async()=>{const r=await window.ishAnatomi.phoneCameraStop();phoneStatus.textContent=r?.status==='STOPPED'?'Telefon kamerası durduruldu.':('Kamera: '+(r?.status||'UNKNOWN'));});
    window.ishAnatomi.onPhoneCameraFrame(payload=>{const blob=new Blob([payload.jpeg],{type:'image/jpeg'});const url=URL.createObjectURL(blob);const img=box.querySelector('#ish-phone-img');const old=img.dataset.url;if(old)URL.revokeObjectURL(old);img.dataset.url=url;img.src=url;box.querySelector('#ish-phone-quality').textContent=payload.analysis?.quality||'UNKNOWN';box.querySelector('#ish-phone-motion').textContent=payload.motion?.status==='READY'?(Number(payload.motion.normalizedChange)*100).toFixed(1)+'%':'NO_PREVIOUS_FRAME';});
    window.ishAnatomi.onPhoneCameraPose(p=>{box.querySelector('#ish-phone-pose').textContent=[p.alpha,p.beta,p.gamma].map(v=>Number(v).toFixed(1)+'°').join(' / ');});
  })()`;
}

async function createWindow() {
  win = new BrowserWindow({width:1440,height:920,minWidth:1100,minHeight:720,backgroundColor:'#0b1020',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.session.setBluetoothPairingHandler((details, callback) => {
    bluetoothPairingCallback = callback;
    if (win && !win.isDestroyed()) win.webContents.send('bluetooth:pairing-request', {deviceId: details.deviceId, pairingKind: details.pairingKind, pin: details.pin || null});
  });

  win.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    bluetoothSelectionCallback = callback;
    const list = (devices || []).map(device => ({deviceId: device.deviceId, deviceName: device.deviceName || 'İsimsiz Bluetooth cihazı'}));
    if (win && !win.isDestroyed()) win.webContents.send('bluetooth:devices', list);
    if (list.length === 1 && bluetoothSelectionCallback) {
      const cb = bluetoothSelectionCallback;
      bluetoothSelectionCallback = null;
      cb(list[0].deviceId);
    }
    if (list.length === 0 && win && !win.isDestroyed()) win.webContents.send('bluetooth:devices-empty', {status:'NO_BLUETOOTH_DEVICES_FOUND'});
  });

  if (app.isPackaged) {
    const index=path.join(atlasDir(),'dist','index.html');
    if(!fs.existsSync(index)){dialog.showErrorBox('ISH-Anatomi','Paketlenmiş anatomi motoru bulunamadı.');app.quit();return;}
    await win.loadFile(index);
  } else {
    const {spawn}=require('node:child_process');
    const npmCli=path.join(process.env.ProgramFiles||'C:\\Program Files','nodejs','node_modules','npm','bin','npm-cli.js');
    const child=spawn(process.execPath,[npmCli,'run','dev','--','--host','127.0.0.1'],{cwd:atlasDir(),stdio:'inherit',shell:false,env:{...process.env,BROWSER:'none'}});
    win.once('closed',()=>{if(!child.killed)child.kill();});
    const start=Date.now();let ready=false;while(Date.now()-start<30000){try{await fetch('http://127.0.0.1:3016');ready=true;break}catch{await new Promise(r=>setTimeout(r,400));}}if(!ready){dialog.showErrorBox('ISH-Anatomi','3D anatomi motoru 30 saniye içinde hazır olmadı.');app.quit();return;}
    await win.loadURL('http://127.0.0.1:3016');
  }
  await win.webContents.executeJavaScript(assistantPanelScript());
  if (phoneCamera) win.webContents.send('phone-camera:info', phoneCamera.info());
}

app.whenReady().then(async()=>{
  await initImaging();
  await initPhoneCamera();
  ipcMain.handle('app:info',()=>({name:'ISH-Anatomi',version:app.getVersion()}));
  ipcMain.handle('ai:compile',(_e,text)=>compileIntent(text));
  ipcMain.handle('study:card',(_e,text)=>studyCard(text));
  ipcMain.handle('study:quiz',(_e,count,seed)=>createQuiz(count,seed));
  ipcMain.handle('clinical:assess',(_e,payload)=>clinicalAssessment.assessClinicalCase(payload,{store:clinicalEvidenceStore,modelValidated:false}));
  ipcMain.handle('viewer:actions',(_e,actions)=>executeViewerActions(actions));
  ipcMain.handle('probe:list',()=>probeManager?.list?.()??[]);
  ipcMain.handle('probe:status',()=>probeManager?.status?.()??{status:'NOT_CONFIGURED'});
  ipcMain.handle('probe:connect',async(_e,id)=>{
    const status=await probeManager.connect(id);
    const adapter=probeManager.active;
    if(adapter?.frameSource){probeStream=new (await importModule(path.join(root(),'probe','stream.mjs'))).ProbeStreamBridge({controller:liveController,frameSource:adapter.frameSource});void probeStream.start({transport:adapter.transport,probeId:adapter.id});}
    return status;
  });
  ipcMain.handle('probe:disconnect',()=>{probeStream?.stop?.();return probeManager?.disconnect?.()??{status:'NOT_CONFIGURED'};});
  ipcMain.handle('probe:stream-status',()=>probeStream?.status?.()??{status:'NOT_CONFIGURED'});
  ipcMain.handle('imaging:start',(_e,session)=>liveController?.start(session)??{status:'NOT_CONFIGURED'});
  ipcMain.handle('imaging:stop',()=>liveController?.stop()??{status:'NOT_CONFIGURED'});
  ipcMain.handle('imaging:frame',(_e,frame)=>liveController?.push(frame)??{status:'NOT_CONFIGURED'});
  ipcMain.handle('bluetooth:select', (_e, deviceId) => { if (!bluetoothSelectionCallback) return {status:'NO_PENDING_REQUEST'}; const id=typeof deviceId==='string'?deviceId:''; const cb=bluetoothSelectionCallback; bluetoothSelectionCallback=null; cb(id); return {status:id?'SELECTED':'CANCELLED'}; });
  ipcMain.handle('bluetooth:cancel', () => { if (!bluetoothSelectionCallback) return {status:'NO_PENDING_REQUEST'}; const cb=bluetoothSelectionCallback; bluetoothSelectionCallback=null; cb(''); return {status:'CANCELLED'}; });
  ipcMain.handle('bluetooth:pairing-response', (_e, response) => { if (!bluetoothPairingCallback) return {status:'NO_PAIRING_REQUEST'}; const cb=bluetoothPairingCallback; bluetoothPairingCallback=null; cb(response || {}); return {status:'RESPONDED'}; });
  ipcMain.handle('phone-camera:search',()=>phoneCamera?.info?.()??{status:'NOT_CONFIGURED'});
  ipcMain.handle('phone-camera:start',async()=>{if(!phoneCamera)return {status:'NOT_CONFIGURED'};return phoneCamera.start();});
  ipcMain.handle('phone-camera:status',()=>phoneCamera?.status?.()??{status:'NOT_CONFIGURED'});
  ipcMain.handle('phone-camera:visual-status',()=>({status:'LOCAL_VISUAL_MATCH_DISABLED',reason:'ANATOMY_MODEL_REQUIRED'}));
  ipcMain.handle('phone-camera:stop',()=>phoneCamera?.stop?.()??{status:'NOT_CONFIGURED'});
  ipcMain.handle('phone-camera:set-virtual',(_e,enabled)=>{virtualCameraState=virtualCamera?virtualCamera.enableVirtualCamera(virtualCameraState,enabled):virtualCameraState;return {status:virtualCameraState?.active?'READY':'DISABLED'};});
  ipcMain.handle('phone-camera:virtual-status',()=>({status:virtualCameraState?.active?'READY':'DISABLED'}));
  await createWindow();
});

app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
