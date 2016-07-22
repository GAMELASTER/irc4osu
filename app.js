const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const {ipcMain} = require('electron');
const storage = require('electron-json-storage');
const irc = require("irc");
const request = require("request");

let mainWindow;
let client;
let saveUserID = false;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    useContentSize: true,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    icon: "./www/images/logo.ico",
    webPreferences: {
      experimentalFeatures: true,
    }
  });
  mainWindow.loadURL(`file://${__dirname}/www/index.html`);
  mainWindow.webContents.openDevTools({ detach: true });
  //mainWindow.setMenu(null);
  storage.has('login', function(error, hasKey) {
    if(error) throw error;
    if(hasKey)
    {
      storage.get('login', function(error, data) {
        if (error) throw error;
        logIn(data);
      });
    }
    else saveUserID = true;
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
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
        break;
    }
  }
  else {
    client.say(arg.channel, arg.message);
  }
});

ipcMain.on("joinChannel", (event, arg) => {
  joinChannel(arg.channel);
});

function logIn(credentials) {
  mainWindow.webContents.send("changeLoginFormState", {state: "loading", credentials: credentials});
  client = new irc.Client('irc.ppy.sh', credentials.username, {
    password: credentials.password,
    autoConnect: false,
    //debug: true
  });
  client.connect(0, function(message) {
    var sendInfo = function() {
      mainWindow.webContents.send("changeLoginFormState", {state: "hide", credentials: credentials});
      joinChannel("#english");
      client.list();
    }
    setInterval(function() {
      client.list();
    }, 60000);
    if(saveUserID)
    {
      request({ url: 'http://185.91.116.205/irc4osu/getUserBasic.php?username=' + credentials.username, json: true}, function (error, response, body) {
        credentials.userID = body[0].user_id;
        storage.set('login', credentials, function(error) {
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
    console.log(message);
  });

  client.addListener('message', function (from, to, message) {
    mainWindow.webContents.send("onMessage", { from, to, message });
  });

  client.addListener("channellist", function(channel_list) {
    mainWindow.webContents.send("onChannelList", { channel_list });
  });
}

function joinChannel(name) {
  mainWindow.webContents.send("onJoiningChannel", {channel: name});
  client.join(name, (message) => {
    mainWindow.webContents.send("onJoinedChannel", {channel: name});
  });
}