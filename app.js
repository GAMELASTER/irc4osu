const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({width: 800, height: 600, useContentSize: true, titleBarStyle: "hidden", autoHideMenuBar: true, icon: "./www/images/logo.ico"});
  mainWindow.loadURL(`file://${__dirname}/www/index.html`);
  mainWindow.webContents.openDevTools({ detach: true });
  //mainWindow.setMenu(null);

  mainWindow.on('closed', function () {
    mainWindow = null;
  })
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
