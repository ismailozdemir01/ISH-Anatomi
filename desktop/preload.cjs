const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ishAnatomi', {
  appInfo: () => ipcRenderer.invoke('app:info'),
  compileIntent: (text) => ipcRenderer.invoke('ai:compile', text),
  studyCard: (text) => ipcRenderer.invoke('study:card', text),
  createQuiz: (count, seed) => ipcRenderer.invoke('study:quiz', count, seed),
  clinicalAssess: (payload) => ipcRenderer.invoke('clinical:assess', payload),
  executeViewerActions: (actions) => ipcRenderer.invoke('viewer:actions', actions),
  probeList: () => ipcRenderer.invoke('probe:list'),
  probeStatus: () => ipcRenderer.invoke('probe:status'),
  liveStart: (session) => ipcRenderer.invoke('imaging:start', session),
  liveStop: () => ipcRenderer.invoke('imaging:stop'),
  liveFrame: (frame) => ipcRenderer.invoke('imaging:frame', frame),
  onLiveResult: (handler) => ipcRenderer.on('imaging:result', (_event, result) => handler(result)),
  onViewerActions: (handler) => ipcRenderer.on('viewer:actions:apply', (_event, actions) => handler(actions))
});
