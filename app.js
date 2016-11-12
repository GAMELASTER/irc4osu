
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

let mainWindow;
let client;
let logInData;
let tray;
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
    locales: ["en","de","sk","cs","pl","hu"],
    directory: __dirname + "/locales",
    defaultLocale: "en",
    prefix: "irc4osu-",
    register: lang
  });

  lang.setLocale(osLocale.sync().substring(0, 2));

  __ = lang.__;
  mainWindow.__ = __;

  // Initialize the menu
  const template = [
    {
    label: __('Edit'),
    submenu: [{
      role: 'undo'
    }, {
      role: 'redo'
    }, {
      type: 'separator'
    }, {
      role: 'cut'
    }, {
      role: 'copy'
    }, {
      role: 'paste'
    }, {
      role: 'pasteandmatchstyle'
    }, {
      role: 'delete'
    }, {
      role: 'selectall'
    }]
  }, {
    label: __('View'),
    submenu: [{
      type: 'separator'
    }, {
      role: 'resetzoom'
    }, {
      role: 'zoomin'
    }, {
      role: 'zoomout'
    }, {
      type: 'separator'
    }, {
      role: 'togglefullscreen'
    }]
  }, {
    role: 'window',
    submenu: [{
      role: 'minimize'
    }, {
      role: 'close'
    }]
  }, {
    role: 'help',
    submenu: [{
      label: __('Learn More'),
      click() {
        require('electron')
          .shell.openExternal('http://electron.atom.io')
      }
    }]
  }];

  // Initialize the menu for Mac
  if (process.platform === 'darwin') {
    template.unshift({
        label: app.getName(),
        submenu: [{
          role: 'about'
        }, {
          type: 'separator'
        }, {
          role: 'services',
          submenu: []
        }, {
          type: 'separator'
        }, {
          role: 'hide'
        }, {
          role: 'hideothers'
        }, {
          role: 'unhide'
        }, {
          type: 'separator'
        }, {
          role: 'quit'
        }]
      })
      // Edit menu.
    template[1].submenu.push({
        type: 'separator'
      }, {
        label: __('Speech'),
        submenu: [{
          role: 'startspeaking'
        }, {
          role: 'stopspeaking'
        }]
      })
      // Window menu.
    template[3].submenu = [{
      label: __('Close'),
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    }, {
      label: __('Minimize'),
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    }, {
      label: __('Zoom'),
      role: 'zoom'
    }, {
      type: 'separator'
    }, {
      label: __('Bring All to Front'),
      role: 'front'
    }];
  }

  // Initialize the tray item
  tray = new Tray(`${__dirname}/www/images/tray.png`);

  // Build the night mode setting
  nightModeItem = new MenuItem({
    label: __("Night mode"),
    type: "checkbox",
    click: (menuItem) => {
      mainWindow.webContents.send("nightMode", {bool: menuItem.checked});
    }
  });

  // Build the notification mode setting
  notificationsItem = new MenuItem({
    label: __("Notifications"),
    type: "checkbox",
    click: (menuItem) => {
      mainWindow.webContents.send("notifications", {bool: menuItem.checked});
    }
  });

  // Build the sound mode setting
  soundsItem = new MenuItem({
    label: __("Sounds"),
    type: "checkbox",
    click: (menuItem) => {
      mainWindow.webContents.send("sounds", {bool: menuItem.checked});
    }
  });

  // Build the actual settings menu
  let settings = new Menu();
  settings.append(nightModeItem);
  settings.append(notificationsItem);
  settings.append(soundsItem);

  const trayMenu = Menu.buildFromTemplate([
    {
      label: __("Open irc4osu"),
      type: "normal",
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: __("Settings"),
      type: "submenu",
      submenu: settings
    },
    {
      label: __("Exit"),
      type: "normal",
      click: () => {
        mainWindow.destroy();
        if (process.platform == 'darwin') {
          app.quit();
        }
      }
    }
  ]);

  // Click event should open or hide the window
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  });

  // Set the tray in the app
  tray.setToolTip("irc4osu!");
  tray.setContextMenu(trayMenu);

  // Set the menu in the app
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Make sure cache exists
  if (fs.existsSync(app.getPath('userData') + path.sep + "avatarCache") == false) {
    fs.mkdir(app.getPath('userData') + path.sep + "avatarCache" + path.sep);
  }
  mainWindow.loadURL(`file://${__dirname}/www/index.html`);
  mainWindow.webContents.openDevTools({ detach: true });
  
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
  notificationsItem.checked = settings.notifications;
  nightModeItem.checked = settings.nightMode;
  soundsItem.checked = settings.sounds;
});

// Notification flash
ipcMain.on("flashFrame", function(event, flag) {
    mainWindow.flashFrame(flag);
});

// the signal to exit and wants to start closing windows
app.on("before-quit", () => willQuit = true);
