// Constants
const fs = require('fs');
const path = require('path');
const client = require("./js/client.js");
const request = require('request');
const {dialog} = require("electron").remote;
const {ipcRenderer} = require("electron");

// Check for update on startup
request({
  url: "https://api.github.com/repos/arogan-group/irc4osu/releases/latest",
  json: true,
  headers: {
    'User-Agent': 'irc4osu'
  }
}, function(err, resp, body) {
  if (body.tag_name !== process.env.npm_package_version) {
    dialog.showMessageBox(null, {
      type: "info",
      buttons: ["Yes", "No"],
      title: "New update is available",
      message: `A newer version of irc4osu! has been released! (${body.tag_name})\n\nDo you wish to download it?`
    }, response => {
      if (response == 0) {
        require('electron').shell.openExternal("https://github.com/arogan-group/irc4osu/releases/latest");
      }
    });
  }
});

// Check if credentials exist in storage
client.getCredentials((credentials) => {
  if (credentials) {

    // Initialize client
    client.init(credentials);

  } else {
    // Show login window
    $("#login-modal").fadeIn(150);
  }
});

// Submit login
$("#login-form").submit(e => {
  e.preventDefault();

  // Loading
  $("#login-form input[name='username']").prop("disabled", true);
  $("#login-form input[name='password']").prop("disabled", true);
  $("#login-form button").prop("disabled", true);

  let credentials = {
    username: $("input[name='username']").val(),
    password: $("input[name='password']").val()
  }

  // Save credentials to storage
  client.updateCredentials(credentials, () => {
    client.init(credentials);
  });
});

// Click on tab
$(document).on("click", "#tab-slider .tab .tab-name", e => {
  client.changeTab($(e.target).closest(".tab").data("channel"));
});

// Click on close tab
$(document).on("click", "#tab-slider .tab .close", e => {
  client.closeTab($(e.target).closest(".tab").data("channel"));
});

// Click on send message
$(document).on("click", "#send-button", () => {
  var message = $("#text-input").val();
  if (message === "") return;

  client.sendMessage(client.tabs[client.activeTab].name, message);

  $("#text-input").val("");
});

// If enter was pressed
$(document).on("keyup", "#text-input", e => {
  if (e.keyCode === 13) {
    var message = $("#text-input").val();
    if (message === "") return;

    client.sendMessage(client.tabs[client.activeTab].name, message);

    $("#text-input").val("");
  }
});

// Open join channel modal
$(document).on("click", "#open-channel-dialog", () => {

  // Reset values
  $("#select-channel-modal .channel-row").remove();
  $("#channels-filter").val("");

  // Open dialog
  $("#select-channel-modal").fadeIn(150);

  // Collect all channel names we have open
  let tabsList = client.tabs.map(e => e.name);

  client.channels.every(channelInfo => {

    // Skip any channels we already have opened
    if (tabsList.indexOf(channelInfo.name) !== -1) return true;

    // Append the html
    $("#channels-list").append(
      `<div data-channel="${channelInfo.name}" class="channel-row join-channel">
         <h1>${channelInfo.name}</h1>
         <p>${channelInfo.topic}<span class="active-users">${channelInfo.users} users</span></p>
       </div>`);

    return true;
  });
});

// Filter channels
$(document).on("keyup", "#channels-filter", () => {
  $("#select-channel-modal .channel-row").remove();

  // Collect all channel names we have open
  let tabsList = client.tabs.map(e => e.name);

  client.channels.every(channelInfo => {

    // Skip any channels we already have opened
    if (tabsList.indexOf(channelInfo.name) !== -1) return true;

    // Skip any channels that dont match the filter
    if(channelInfo.name.indexOf($("#channels-filter").val()) === -1) return true;

    // Append the html
    $("#channels-list").append(
      `<div data-channel="${channelInfo.name}" class="channel-row join-channel">
         <h1>${channelInfo.name}</h1>
         <p>${channelInfo.topic}<span class="active-users">${channelInfo.users} users</span></p>
       </div>`);

    return true;
  });
});

// Click in channel name inside channel modal
$(document).on("click", ".join-channel", e => {
  client.joinChannel($(e.target).closest(".join-channel").data("channel"));
  $("#select-channel-modal").fadeOut(150);
});

// Click on friend button in channel modal
$(document).on("click", "#open-friend", e => {
  $("#select-channel-modal").fadeOut(150);
  client.joinUser($("#friend-name").val());
});

// Exit modal
$(document).on("click", ".close-modal", e => {
  $(".modal-container").fadeOut(150);
});

// Swipe left button
$(document).on("click", "#swipe-left", () => {
  $("#tab-slider").animate({
    scrollLeft: $("#tab-slider").scrollLeft() - 100
  }, 200);
});

// Swipe right button
$(document).on("click", "#swipe-right", () => {
  $("#tab-slider").animate({
    scrollLeft: $("#tab-slider").scrollLeft() + 100
  }, 200);
});

// Open settings
$(document).on("click", "#open-settings", () => {
  $("#settings-modal").fadeIn(150);
});

// Open about
$(document).on("click", "#open-about", () => {
  $("#about-modal").fadeIn(150);
});

// Logout
$(document).on("click", "#logout", () => {
  if (!client.connected) return;

  client.logout();
});

// Night mode
$(document).on("change", "#nightModeCheckbox", () => {
  client.getSettings(settings => {
    settings.nightMode = !settings.nightMode;
    client.nightMode(settings.nightMode);
    client.updateSettings(settings);

    // Send settings to the main process
    ipcRenderer.send("settings", settings);
  });
});

// Notifications
$(document).on("change", "#notificationsCheckbox", () => {
  client.getSettings(settings => {
    settings.notifications = !settings.notifications;
    client.updateSettings(settings);

    // Send settings to the main process
    ipcRenderer.send("settings", settings);
  });
});

// Sounds
$(document).on("change", "#soundsCheckbox", () => {
  client.getSettings(settings => {
    settings.sounds = !settings.sounds;
    client.updateSettings(settings);

    // Send settings to the main process
    ipcRenderer.send("settings", settings);
  });
});

// Whenever we use the mousewheel
$(document).on("mousewheel", ".chat-container", e => {

  // Get channel name
  var channel = $(e.target).attr("name");

  // Get tab item
  var tab = client.tabs.find(tab => tab.name === channel);
 
  if (e.originalEvent.wheelDelta / 120 > 0) {
      // Scrolling up
      tab.autoScroll = false;
  } else {
    // Scrolling down
    if ($(e.target).scrollTop() + $(e.target).innerHeight() >= $(e.target)[0].scrollHeight - 50)
      tab.autoScroll = true;
  }
});

// External links
$(document).on("click", ".link-external", e => {
  e.preventDefault();

  require('electron').shell.openExternal($(e.target).closest(".link-external").data("link"));
});

// IPC Events

// Fires when we click on notifications in tray
ipcRenderer.on("notifications", (sender, obj) => {
  client.getSettings(settings => {
    settings.notifications = obj.bool;
    client.updateSettings(settings);

    // Set settings in settings modal
    $("#notificationsCheckbox").prop("checked", obj.bool);
  });
});

// Fires when we click on nightmode in tray
ipcRenderer.on("nightMode", (sender, obj) => {
  client.getSettings(settings => {
    settings.nightMode = obj.bool;
    client.updateSettings(settings);

    // Set settings in settings modal
    $("#nightModeCheckbox").prop("checked", obj.bool);

    client.nightMode(obj.bool);
  });
});

// Fires when we click on sounds in tray
ipcRenderer.on("sounds", (sender, obj) => {
  client.getSettings(settings => {
    settings.sounds = obj.bool;
    client.updateSettings(settings);

    // Set settings in settings modal
    $("#soundsCheckbox").prop("checked", obj.bool);
  });
});