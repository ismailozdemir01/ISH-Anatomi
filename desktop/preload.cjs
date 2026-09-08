const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('ishAnatomiDesktop', Object.freeze({
  appName: 'ISH-Anatomi',
  version: '1.0.0',
  mode: 'desktop'
}));
