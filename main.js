// Legend of the Six Elements – Electron indító
const { app, BrowserWindow } = require('electron');
const path = require('path');

// a menüzene azonnal indulhasson, ne kelljen hozzá kattintás
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow () {
  const win = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#0D0716',
    title: 'Legend of the Six Elements',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { contextIsolation: true }
  });

  win.removeMenu();
  win.loadFile('game.html');

  // F11: teljes képernyő ki/be
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
