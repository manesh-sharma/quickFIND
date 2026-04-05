require('electron-reload')(__dirname + '/../');

const { buildIndex, searchFiles, loadCache } = require('../indexer/indexer');
const { app, BrowserWindow, ipcMain, shell, globalShortcut } = require('electron');
const path = require('path');

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 700,
    height: 400,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  
  win.setResizable(false);
  win.loadURL('http://localhost:5173');

  // Hide when focus lost
  win.on('blur', () => {
    win.hide();
  });
}

app.whenReady().then(() => {
  console.log('Loading cache...');
  loadCache();

  createWindow();

  // 🔥 GLOBAL SHORTCUT
  globalShortcut.register('Control+Space', () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });

  setTimeout(() => {
    console.log('Rebuilding index in background...');
    buildIndex('C:/Users/HP');
  }, 2000);
});

// ✅ FIX: Add this handler
ipcMain.handle('search-files', async (event, query) => {
  return searchFiles(query).slice(0, 20);
});

// ✅ Open file
ipcMain.on('open-file', (event, filePath) => {
  shell.openPath(filePath);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});