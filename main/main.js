require('electron-reload')(__dirname + '/../');

const { buildIndex, searchFiles, loadCache } = require('../indexer/indexer');
const { app, BrowserWindow, ipcMain, shell, globalShortcut } = require('electron');
const path = require('path');

// ✅ Dev vs production URL
const isDev = !app.isPackaged;
const RENDERER_URL = isDev
  ? 'http://localhost:5173'
  : `file://${path.join(__dirname, '../renderer/dist/index.html')}`;

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

  win.loadURL(RENDERER_URL);

  // Hide when focus lost
  win.on('blur', () => {
    win.hide();
  });
}

app.whenReady().then(async () => {
  console.log('Loading cache...');
  await loadCache(); // ✅ awaited — non-blocking async read

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

  // ✅ Build index in background — scans Downloads, Desktop, Documents, Music, Pictures, Videos
  setTimeout(() => {
    console.log('Rebuilding index in background...');
    buildIndex(); // uses ROOT_PATHS from indexer.js
  }, 2000);
});

ipcMain.handle('search-files', async (event, query) => {
  return searchFiles(query).slice(0, 20);
});

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