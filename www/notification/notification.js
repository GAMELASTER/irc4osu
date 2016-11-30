// Electron includes
const electron = require('electron');
let {
  BrowserWindow,
  ipcRenderer
} = electron;

if (BrowserWindow === undefined) {
  BrowserWindow = electron.remote.BrowserWindow;
}

let notification;

module.exports = {
  init: (mode) => {
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize

    notification = new BrowserWindow({
      width: 400,
      height: 100,
      x: width - 420,
      y: height - 120,
      resizable: false,
      autoHideMenuBar: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      frame: false,
      show: false,
      focusable: false
    });

    notification.loadURL(`file://${__dirname}/notification.html`);
  },

  // Callback is only called if notification is clicked
  notify: (params, callback) => {
    notification.webContents.send('notify', { nick: params.title, msg: params.message, icon: params.icon, callback: callback });
    if (ipcRenderer) {
      ipcRenderer.on('click', function () {
        if (callback) callback();
        ipcRenderer.removeAllListeners('click');
      });
    }
  }
};