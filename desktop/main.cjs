const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

let atlasProcess = null;
const atlasDir = () => path.join(app.isPackaged ? process.resourcesPath : path.join(__dirname, '..'), 'vendor', 'human-atlas');

function startAtlas() {
  const cwd = atlasDir();
  atlasProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', '--', '--host', '127.0.0.1'], {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, BROWSER: 'none' }
  });
  atlasProcess.on('error', (error) => {
    dialog.showErrorBox('ISH-Anatomi', `Anatomy engine could not start: ${error.message}`);
  });
}

async function waitForAtlas(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try { await fetch(url); return true; } catch (_) { await new Promise((r) => setTimeout(r, 400)); }
  }
  return false;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1100, minHeight: 720,
    backgroundColor: '#0b1020',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });

  if (app.isPackaged) {
    const index = path.join(atlasDir(), 'dist', 'index.html');
    if (!fs.existsSync(index)) {
      dialog.showErrorBox('ISH-Anatomi', 'Packaged anatomy engine is missing. Build the Human Atlas before packaging.');
      app.quit(); return;
    }
    await win.loadFile(index);
    return;
  }

  startAtlas();
  const ready = await waitForAtlas('http://127.0.0.1:5173');
  if (!ready) { dialog.showErrorBox('ISH-Anatomi', '3D anatomy engine did not become ready within 30 seconds.'); app.quit(); return; }
  await win.loadURL('http://127.0.0.1:5173');
}

app.whenReady().then(async () => {
  await createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('before-quit', () => { if (atlasProcess && !atlasProcess.killed) atlasProcess.kill(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
