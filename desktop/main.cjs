const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');

let atlasProcess = null;

function startAtlas() {
  const atlasDir = path.join(__dirname, '..', 'vendor', 'human-atlas');
  atlasProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', '--', '--host', '127.0.0.1'], {
    cwd: atlasDir,
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
    try {
      await fetch(url);
      return true;
    } catch (_) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  return false;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const ready = await waitForAtlas('http://127.0.0.1:5173');
  if (!ready) {
    dialog.showErrorBox('ISH-Anatomi', '3D anatomy engine did not become ready within 30 seconds.');
    app.quit();
    return;
  }
  await win.loadURL('http://127.0.0.1:5173');
}

app.whenReady().then(async () => {
  startAtlas();
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (atlasProcess && !atlasProcess.killed) atlasProcess.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
