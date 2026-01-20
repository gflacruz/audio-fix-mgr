const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Database Setup
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'audio-fix-db.json');

// Initialize DB if not exists
function initDB() {
  if (!fs.existsSync(dbPath)) {
    const initialData = {
      clients: [],
      repairs: []
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  }
}

function readDB() {
  try {
    if (!fs.existsSync(dbPath)) initDB();
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading DB:", error);
    return { clients: [], repairs: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error writing DB:", error);
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden', // Custom title bar look
    titleBarOverlay: {
      color: '#18181b', // match zinc-900
      symbolColor: '#f4f4f5'
    }
  });

  const isDev = !app.isPackaged;
  
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDB();
  createWindow();

  // IPC Handlers
  ipcMain.handle('db:read', () => {
    return readDB();
  });

  ipcMain.handle('db:write', (event, data) => {
    return writeDB(data);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
