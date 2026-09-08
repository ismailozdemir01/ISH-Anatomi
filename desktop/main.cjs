const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

let win;
const root = () => app.getAppPath();
const atlasDir = () => path.join(root(), 'vendor', 'human-atlas');

async function compileIntent(text) {
  const [intent, catalogModule] = await Promise.all([
    import(path.join(root(), 'local-ai', 'intent.mjs')),
    import(path.join(root(), 'local-ai', 'catalog.mjs'))
  ]);
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
    } else {
      search.query = concept.name;
      search.conceptId = concept.id;
    }
  }
  result.catalog = status;
  return result;
}

function viewerScript(actions) {
  return `(() => {
    const actions = ${JSON.stringify(actions)};
    const text = (el) => (el?.innerText || el?.textContent || el?.getAttribute('aria-label') || el?.getAttribute('title') || '').trim().toLocaleLowerCase('tr-TR');
    const clickText = (needle) => { const els=[...document.querySelectorAll('button,[role="button"]')]; const hit=els.find(e=>text(e).includes(String(needle).toLocaleLowerCase('tr-TR'))); if(hit){hit.click();return true} return false; };
    for (const a of actions) {
      if (a.type === 'search') {
        const input=[...document.querySelectorAll('input')].find(e => /structure|anatom|search|ara|find/i.test(e.getAttribute('placeholder')||'') || e.getAttribute('role')==='combobox');
        if(input){input.focus(); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,a.query); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); setTimeout(()=>{ const result=[...document.querySelectorAll('[role="option"],button')].find(e=>text(e).includes(a.query.toLocaleLowerCase('tr-TR'))); if(result) result.click(); },300); }
      }
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
  if (!win || win.isDestroyed()) return {ok:false, error:'WINDOW_NOT_READY'};
  try { await win.webContents.executeJavaScript(viewerScript(actions)); return {ok:true}; }
  catch (error) { return {ok:false,error:error.message}; }
}

function assistantPanelScript() {
  return `(() => {
    if(document.getElementById('ish-local-assistant')) return;
    const style=document.createElement('style'); style.textContent='#ish-local-assistant{position:fixed;right:18px;top:18px;width:330px;z-index:2147483647;background:rgba(12,18,30,.96);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:14px;box-shadow:0 18px 60px rgba(0,0,0,.35);font:14px system-ui,sans-serif}#ish-local-assistant h3{margin:0 0 8px;font-size:15px}#ish-local-assistant .row{display:flex;gap:7px}#ish-local-assistant input{flex:1;padding:10px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#fff}#ish-local-assistant button{padding:10px 12px;border:0;border-radius:10px;background:#334155;color:#fff;cursor:pointer}#ish-local-assistant .status{margin-top:8px;color:#cbd5e1;font-size:12px;line-height:1.4}';document.head.appendChild(style);
    const box=document.createElement('aside');box.id='ish-local-assistant';box.innerHTML='<h3>ISH-Anatomi · Yerel AI</h3><div class="row"><input id="ish-ai-q" placeholder="Anatomi komutu veya soru…"><button id="ish-ai-send">Uygula</button></div><div class="status" id="ish-ai-status">Harici AI API yok. Gerçek atlas kataloğu kullanılır.</div>';document.body.appendChild(box);
    const q=box.querySelector('#ish-ai-q'),send=box.querySelector('#ish-ai-send'),status=box.querySelector('#ish-ai-status');
    const run=async()=>{const value=q.value.trim();if(!value)return;status.textContent='Yerel anatomi motoru çalışıyor…';try{const result=await window.ishAnatomi.compileIntent(value);status.textContent=result.answer+(result.catalog?.status==='READY'?` · ${result.catalog.parts} parça / ${result.catalog.concepts} kavram`: '');await window.ishAnatomi.executeViewerActions(result.actions||[]);}catch(e){status.textContent='Yerel motor hatası: '+e.message;}};
    send.addEventListener('click',run);q.addEventListener('keydown',e=>{if(e.key==='Enter')run();});
  })()`;
}

async function createWindow() {
  win = new BrowserWindow({ width:1440,height:920,minWidth:1100,minHeight:720,backgroundColor:'#0b1020',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true} });
  if (app.isPackaged) {
    const index=path.join(atlasDir(),'dist','index.html');
    if(!fs.existsSync(index)){dialog.showErrorBox('ISH-Anatomi','Paketlenmiş anatomi motoru bulunamadı.');app.quit();return;}
    await win.loadFile(index);
  } else {
    const { spawn } = require('node:child_process');
    const child=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev','--','--host','127.0.0.1'],{cwd:atlasDir(),stdio:'inherit',shell:false,env:{...process.env,BROWSER:'none'}});
    win.once('closed',()=>{if(!child.killed)child.kill();});
    const start=Date.now();let ready=false;while(Date.now()-start<30000){try{await fetch('http://127.0.0.1:5173');ready=true;break}catch{await new Promise(r=>setTimeout(r,400));}}
    if(!ready){dialog.showErrorBox('ISH-Anatomi','3D anatomi motoru 30 saniye içinde hazır olmadı.');app.quit();return;}
    await win.loadURL('http://127.0.0.1:5173');
  }
  await win.webContents.executeJavaScript(assistantPanelScript());
}

ipcMain.handle('app:info',()=>({name:'ISH-Anatomi',version:app.getVersion(),localAI:true,externalAI:false}));
ipcMain.handle('ai:compile',(_event,text)=>compileIntent(text));
ipcMain.handle('clinical:assess',(_event,payload)=>require('../clinical/engine.cjs').assess(payload));
ipcMain.handle('viewer:actions',(_event,actions)=>executeViewerActions(actions));

app.whenReady().then(async()=>{await createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
