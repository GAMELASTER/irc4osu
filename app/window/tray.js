// Electron includes
const {
  Menu,
  MenuItem,
  Tray
} = require("electron");

const path = require('path');

const events = require('events');
const eventEmitter = new events.EventEmitter();

let tray;

// Responsive settings items
let nightModeItem;
let notificationsItem;
let soundsItem;

module.exports = {

    // For events
    on: (event, func) => eventEmitter.on(event, func),

    // Getters for each settings item
    // If we don't do this, we dont get the
    // latest properties from the tray item
    settings: {
        nightMode: () => nightModeItem,
        notifications: () => notificationsItem,
        sounds: () => soundsItem
    },

    destroy: () => {
        tray.destroy();
    },

    init: () => {

        // Gets the latest values from app
        const mainWindow = require('../../app').mainWindow();
        const __ = require('../../app').__();

        // Initialize the tray item
        tray = new Tray(path.join(__dirname, '..', 'resources', 'images', 'tray.png'));

        // Build the night mode setting
        nightModeItem = new MenuItem({
            label: __("Night mode"),
            type: "checkbox",
            click: (menuItem) => {
                eventEmitter.emit("nightMode", menuItem.checked);
                //mainWindow.webContents.send("nightMode", {bool: menuItem.checked});
            }
        });

        // Build the notification mode setting
        notificationsItem = new MenuItem({
            label: __("Notifications"),
            type: "checkbox",
            click: (menuItem) => {
                eventEmitter.emit("notifications", menuItem.checked);
                //mainWindow.webContents.send("notifications", {bool: menuItem.checked});
            }
        });

        // Build the sound mode setting
        soundsItem = new MenuItem({
            label: __("Sounds"),
            type: "checkbox",
            click: (menuItem) => {
                eventEmitter.emit("sounds", menuItem.checked);
                //mainWindow.webContents.send("sounds", {bool: menuItem.checked});
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
    }
}