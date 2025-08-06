const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleOverlay: () => ipcRenderer.invoke('toggle-osr-visibility'),
  onConsoleMessage: (callback) => ipcRenderer.on('console-message', callback),
});
