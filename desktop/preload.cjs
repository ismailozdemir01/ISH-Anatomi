const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ishAnatomi', {
  appInfo: () => ipcRenderer.invoke('app:info'),
  compileIntent: (text) => ipcRenderer.invoke('ai:compile', text),
  clinicalAssess: (payload) => ipcRenderer.invoke('clinical:assess', payload),
  executeViewerActions: (actions) => ipcRenderer.invoke('viewer:actions', actions),
  onViewerActions: (handler) => ipcRenderer.on('viewer:actions:apply', (_event, actions) => handler(actions))
});
