// Electron includes
const {
  app,
  Menu,
  MenuItem
} = require("electron");

module.exports = {
  initializeMenu: () => {

    // Gets the latest values from app
    const __ = require('../../main').__();

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
        role: '',
        submenu: [{
          role: 'minimize'
        }, {
          role: 'close'
        }]
      }, {
        role: 'help',
        submenu: [{
          label: __('Open DevTools'),
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
      //  menu.
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

    // Set the menu in the app
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}