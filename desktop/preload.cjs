const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ishAnatomi', {
  appInfo: () => ipcRenderer.invoke('app:info'),
  compileIntent: (text) => ipcRenderer.invoke('ai:compile', text),
  studyCard: (text) => ipcRenderer.invoke('study:card', text),
  createQuiz: (count, seed) => ipcRenderer.invoke('study:quiz', count, seed),
  clinicalAssess: (payload) => ipcRenderer.invoke('clinical:assess', payload),
  executeViewerActions: (actions) => ipcRenderer.invoke('viewer:actions', actions),
  onViewerActions: (handler) => ipcRenderer.on('viewer:actions:apply', (_event, actions) => handler(actions))
});
