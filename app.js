
// Electron includes
const {
  app,
  BrowserWindow,
  dialog,
  Menu,
  MenuItem,
  Tray,
  ipcMain
} = require("electron");

const fs = require("fs");
const path = require("path");
const i18n = require("i18n");
const osLocale = require('os-locale');

const tray = require('./window/tray');
const menu = require('./window/menu');

let mainWindow;
let client;
let logInData;
let __;

let oneTimeNotify = false;
let willQuit = false;

// Settings
let nightModeItem;
let notificationsItem;
let soundsItem;

function createWindow() {

  // Initialize the main window
  mainWindow = new BrowserWindow({
    width: 825,
    height: 600,
    minWidth: 825, 
    minHeight: 400,
    useContentSize: true,
    autoHideMenuBar: true,
    icon: "./www/images/logo.ico"
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

  tray.initializeTray();
  menu.initializeMenu();

  // Make sure cache exists
  if (fs.existsSync(app.getPath('userData') + path.sep + "avatarCache") == false) {
    fs.mkdir(app.getPath('userData') + path.sep + "avatarCache" + path.sep);
  }
  mainWindow.loadURL(`file://${__dirname}/www/index.html`);
  if(process.argv[0].indexOf("electron") !== -1) mainWindow.webContents.openDevTools({ detach: true });
  
  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      if(willQuit)
      {
        app.quit();
      }
      else
      {
        event.preventDefault();
        if (!oneTimeNotify) {
          require("node-notifier").notify({
            "title": "irc4osu!",
            "icon": `${__dirname}/www/images/tray@2x.png`,
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

// Settings
ipcMain.on("settings", (event, settings) => {
  tray.settings.notifications().checked = settings.notifications;
  tray.settings.nightMode().checked = settings.nightMode;
  tray.settings.sounds().checked = settings.sounds;
});

// Notification flash
ipcMain.on("flashFrame", function(event, flag) {
    mainWindow.flashFrame(flag);
});

// the signal to exit and wants to start closing windows
app.on("before-quit", () => willQuit = true);

module.exports = {
  __: () => __,
  mainWindow: () => mainWindow
};