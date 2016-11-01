
// Electron includes
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  Tray
} = require("electron");

const storage = require("electron-json-storage");
const irc = require("irc");
const request = require("request");
const fs = require("fs");
const path = require("path");
const notifier = require('node-notifier');

let mainWindow;
let client;
let saveUserID = false;
let settings;
let logInData;
let tray = null;

function createWindow() {

  // Initialize the main window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 650, 
    minHeight: 400,
    useContentSize: true,
    autoHideMenuBar: true,
    icon: "./www/images/logo.ico"
  });

  // Initialize the menu
  const template = [{
    label: 'Edit',
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
    label: 'View',
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
      label: 'Learn More',
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
        label: 'Speech',
        submenu: [{
          role: 'startspeaking'
        }, {
          role: 'stopspeaking'
        }]
      })
      // Window menu.
    template[3].submenu = [{
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    }, {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    }, {
      label: 'Zoom',
      role: 'zoom'
    }, {
      type: 'separator'
    }, {
      label: 'Bring All to Front',
      role: 'front'
    }];
  }

  // Initialize the tray item
  tray = new Tray("./www/images/tray.png");

  // TODO: Add settings item
  const trayMenu = Menu.buildFromTemplate([
    {
      label: "Open irc4osu",
      type: "normal",
      click: function () {
        mainWindow.show();
      }
    },
    {
      label: "Exit",
      type: "normal",
      click: function () {
        mainWindow.destroy();
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
  //mainWindow.webContents.openDevTools({ detach: true });

  var checkCredentials = function() {
    storage.has('irc4osu-login', function(error, hasKey) {
      if (error) throw error;
      if (hasKey) {

        storage.get('irc4osu-login', function(error, data) {
          if (error) throw error;
          logIn(data);
        });
      } else saveUserID = true;
    });
  }

  storage.has('irc4osu-settings', function(error, hasKey) {
    if (error) throw error;
    if (hasKey) {

      storage.get('irc4osu-settings', function(error, data) {
        if (error) throw error;
        settings = data;
        checkCredentials();
      });
    } else {
      settings = {
        notifications: true,
        nightMode: false
      };

      storage.set('irc4osu-settings', settings, function(error) {
        if (error) throw error;
        checkCredentials();
      });
    }
  });

  request({
    url: "https://api.github.com/repos/arogan-group/irc4osu/releases/latest",
    json: true,
    headers: {
      'User-Agent': 'irc4osu'
    }
  }, function(err, resp, body) {
    if (body.tag_name != require('./package.json')
      .version) {
      dialog.showMessageBox(null, {
        type: "info",
        buttons: ["Yes", "No"],
        title: "New update is available",
        message: `A new version of irc4osu! ${body.tag_name} has been released!\n\nDo you want to download it?`
      }, (response) => {
        if (response == 0) {
          require('electron')
            .shell.openExternal("https://github.com/arogan-group/irc4osu/releases/latest");
        }
      });
    }
  });

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.webContents.send("showNotification", {
        title: "irc4osu!",
        message: "irc4osu! has been minimized to the tray!"
      });
      mainWindow.hide();
    }
    return false;
  });
}

app.on('ready', function() {
	createWindow();
});

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
});

ipcMain.on("init", (event, args) => {
  if(logInData != null)
  {
    mainWindow.webContents.send("changeLoginFormState", logInData);
    joinChannel("#english");    
  }
});

ipcMain.on("logIn", (event, credentials) => {
  logIn(credentials);
});

ipcMain.on("sendMessage", (event, arg) => {
  if(arg.message[0] === "/")
  {
    var args = arg.message.split(" ");
    switch(args[0])
    {
      case "/me":
        client.action(arg.channel, arg.message.substring(4));
        mainWindow.webContents.send("onMessage", { nick: arg.from, to: arg.channel, text: arg.message.substring(4), type: "action" });
        break;
    }
  }
  else {
    client.say(arg.channel, arg.message);
    mainWindow.webContents.send("onMessage", { nick: arg.from, to: arg.channel, text: arg.message, type: "message" });
  }
});

ipcMain.on("saveSettings", (event, newSettings) => {
  settings = newSettings;
  
  storage.set("irc4osu-settings", newSettings, function(error) {
    if(error) throw error;
  });
});

ipcMain.on("joinChannel", (event, arg) => {
  joinChannel(arg.channel);
});

ipcMain.on("partChannel", (event, arg) => {
  client.part(arg.channel);
});

ipcMain.on("logOut", (event, arg) => {
  
  storage.remove('irc4osu-login', function(error) {
    if(error) throw error;
    mainWindow.reload();
  });
});

function logIn(credentials) {
  mainWindow.webContents.send("changeLoginFormState", {state: "loading", credentials: credentials});
  client = new irc.Client('irc.ppy.sh', credentials.username, {
    password: credentials.password,
    autoConnect: false,
    //debug: true
  });
  client.connect(0, function(message) {
    client.list();
    var sendInfo = function() {
      logInData = {state: "hide", credentials: credentials, settings: settings};
      mainWindow.webContents.send("changeLoginFormState", logInData);
      joinChannel("#english");
      client.list();
    }
    setInterval(function() {
      client.list();
    }, 60000);
    if(saveUserID)
    {
      request({ url: 'https://marekkraus.sk/irc4osu/getUserBasic.php?username=' + credentials.username, json: true}, function (error, response, body) {
        credentials.userID = body[0].user_id;
        
        storage.set('irc4osu-login', credentials, function(error) {
          if (error) throw error;
          sendInfo();
        });
      });
    }
    else {
      sendInfo();
    }
  });
  
  client.addListener("error", function(message) {
    switch(message.command)
    {
      case "err_passwdmismatch":
        client.disconnect();
        mainWindow.webContents.send("changeLoginFormState", { state: "error", reason: "credentials" });
        break;
    }
  });

  client.addListener('message', function (nick, to, text, message) {
    mainWindow.webContents.send("onMessage", { nick: nick, to: to, text: text, message: message, type: "message" });
  });

  client.addListener('action', function (nick, to, text, message) {
    mainWindow.webContents.send("onMessage", { nick: nick, to: to, text: text, message: message, type: "action" });
  });

  client.addListener("channellist", function(channel_list) {
    mainWindow.webContents.send("onChannelList", { channel_list });
  });

  client.addListener("names", function(channel, nicks) {
    console.log(channel, nicks);
  })
}

function joinChannel(name) {
  mainWindow.webContents.send("onJoiningChannel", {channel: name});
  client.join(name, (message) => {
    mainWindow.webContents.send("onJoinedChannel", {channel: name});
  });
}