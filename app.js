
// Electron includes
const electron = require("electron");
const {
  app,
  BrowserWindow,
  dialog,
  Menu,
  MenuItem,
  Tray,
  ipcMain
} = electron;

const isDev = require("electron-is-dev");

const fs = require("fs");
const path = require("path");
const i18n = require("i18n");
const osLocale = require('os-locale');

const tray = require('./app/window/tray');
const menu = require('./app/window/menu');

let mainWindow;

let logInData;
let __;

let oneTimeNotify = false;
let willQuit = false;

function createWindow() {

  // Initialize the main window
  mainWindow = new BrowserWindow({
    width: 825,
    height: 600,
    minWidth: 825, 
    minHeight: 400,
    useContentSize: true,
    autoHideMenuBar: true,
    icon: "./app/resources/images/logo.ico"
  });

  let lang = {};

  i18n.configure({
    locales: ["en","de","sk","cs","pl","hu","es","it","pt"],
    directory: __dirname + "/locales",
    defaultLocale: "en",
    prefix: "irc4osu-",
    register: lang
  });

  lang.setLocale(osLocale.sync().substring(0, 2));

  __ = lang.__;
  mainWindow.__ = __;

  tray.init();
  menu.initializeMenu();

  mainWindow.tray = tray;

  mainWindow.loadURL(`file://${__dirname}/app/chat/chat.html`);
  
  if (isDev)
    mainWindow.webContents.openDevTools({ detach: true });
  
  mainWindow.on('closed', function() {
    mainWindow = null;
    tray.destroy();
  });

  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      if (willQuit)
      {
        app.quit();
        tray.destroy();
      }
      else
      {
        event.preventDefault();
        if (!oneTimeNotify) {
          mainWindow.webContents.send('notify', {
             "title": "irc4osu!",
             "icon": path.join(__dirname, 'app', 'resources', 'images', 'tray@2x.png'),
             "message": __("irc4osu! has been minimized to the tray!")
          });
          oneTimeNotify = true;
        }
        
        mainWindow.hide();
      }
    }
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
	// On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
	// On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
  else {
    mainWindow.show();
  }
});

// IPC Events
ipcMain.on("show", () => {
  mainWindow.show();
});

// Notification flash
ipcMain.on("flashFrame", function(event, flag) {
    mainWindow.flashFrame(flag);
});

ipcMain.on('click', function () {
  mainWindow.webContents.send('click');
});

// the signal to exit and wants to start closing windows
app.on("before-quit", () => willQuit = true);

let {autoUpdater} = require("electron-auto-updater");

// Updates to renderer
ipcMain.on('checkForUpdates', () => {
  if (isDev) return;

  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-downloaded');
  });

  autoUpdater.on('download-progress', info => {
    mainWindow.webContents.send('download-progress', { info: info });
  });

  autoUpdater.checkForUpdates();
});

ipcMain.on('downloadUpdate', () => {
  if (isDev) return;

  autoUpdater.downloadUpdate();
})

ipcMain.on('quitAndInstall', () => {
  if (isDev) return;

  autoUpdater.quitAndInstall();
});

module.exports = {
  __: () => __,
  mainWindow: () => mainWindow
};