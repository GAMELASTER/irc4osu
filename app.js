'use strict';

const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow;
let loginWindow;
const {ipcMain} = require('electron');
const irc = require("irc");
const request = require("request");
const storage = require('electron-json-storage');

let client;

function logIn(arg)
{
  client = new irc.Client('irc.ppy.sh', arg.user, {
    password: arg.password,
    autoConnect: false
  });
  client.connect(0, function(message) {
    if(loginWindow != null)
    {
      loginWindow.close();
      storage.set('login', arg, function(error) {
        if (error) throw error;
      });
    }
    request({ url: 'http://185.91.116.205/irc4osu/getUserBasic.php?username=' + arg.user, json: true}, function (error, response, body) {
      if(loginWindow != null) mainWindow.show();
      mainWindow.webContents.send("userInfo", { username: arg.user, avatar: "https://a.ppy.sh/"+body[0].user_id+"_"+Date.now()+".jpg"});
    });
  });

  client.addListener('message', function (from, to, message) {
    mainWindow.webContents.send("onMessage", { from, to, message });
  });

  client.addListener("error", function(message) {
    switch(message.command)
    {
      case "err_passwdmismatch":
        client.disconnect();
        if(loginWindow == null)
        {
          createLoginWindow();
        }
        loginWindow.webContents.send("onLogin", { err: "Wrong username or password!" });
        break;
    }
    console.log(message);
  });

  /*client.addListener("channellist_item", function(channel_info) {
    console.log("channel_info");
    console.log(channel_info);
  });*/
  
  client.addListener("channellist", function(channel_list) {
    mainWindow.webContents.send("channelList", { channel_list });
  });

}

ipcMain.on('login', (event, arg) => {
  logIn(arg);
});

ipcMain.on("sendMessage", (event, arg) => {
  client.say(arg.channel, arg.message);
});

ipcMain.on("listChannels", (event, arg) => {
  client.list();
});

ipcMain.on("joinChannel", (event, arg) => {
  console.log("join " + arg.channel);
  client.join(arg.channel, (message) => {
    mainWindow.webContents.send("onJoinedChannel", {channel: arg.channel});
  });
});

ipcMain.on("closeChannel", (event, arg) => {
  console.log("close " + arg.channel);
  client.part(arg.channel, "sayonara");
});

function createMainWindow () {

  mainWindow = new BrowserWindow({width: 800, height: 600, useContentSize: true, titleBarStyle: "hidden", autoHideMenuBar: true, icon: "./www/images/logo.ico"});
  mainWindow.loadURL('file://' + __dirname + '/www/index.html');
  mainWindow.webContents.openDevTools({detach: true});

  /*mainWindow.on('closed', function() {
    mainWindow = null;
  });*/
}

function createLoginWindow()
{
  loginWindow = new BrowserWindow({width: 350, height: 275, useContentSize: true, titleBarStyle: "hidden", autoHideMenuBar: true, icon: "./www/images/logo.ico"});
  loginWindow.loadURL('file://' + __dirname + '/www/login.html');
}

app.on('ready', function() {
  console.log(app.getPath('userData'));
  storage.has('login', function(error, hasKey) {
    if(error) throw error;
    createMainWindow();
    if(hasKey)
    {
      storage.get('login', function(error, data) {
        if (error) throw error;

        logIn(data);
      });
    }
    else
    {
      createLoginWindow();
      mainWindow.hide();
    }
  });
  //createWindow();
});

app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  /*if (mainWindow === null) {
    createWindow();
  }*/
});