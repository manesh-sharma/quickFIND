const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  searchFiles: (query) => ipcRenderer.invoke('search-files', query),
  openFile: (filePath) => ipcRenderer.send('open-file', filePath),
});