// Constants
const fs = require('fs');
const path = require('path');
const client = require("../shared/client.js");
const request = require('request');
const {remote, ipcRenderer} = require("electron");
const {dialog} = remote;

// Shared variables
let tray = remote.getCurrentWindow().tray;

// Set translations for elements
$("#text-input").attr("placeholder", __("Enter a message..."));
$("#login-form input[name='username']").attr("placeholder", __("Username"));
$("#login-form input[name='password']").attr("placeholder", __("IRC Password"));
$("#channels-filter").attr("placeholder", __("Filter"));

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

  client.init(credentials);
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

// Used to track where we are in history with up/down arrows
var sentHistoryIndex = -1;

// If enter was pressed
$(document).on("keyup", "#text-input", e => {

  // Enter key
  if (e.keyCode === 13) {
    var message = $("#text-input").val();
    if (message === "") return;

    client.sendMessage(client.tabs[client.activeTab].name, message);

    sentHistoryIndex = -1;
    $("#text-input").val("");
  }

  // Up arrow
  else if (e.keyCode === 38) {
    if (sentHistoryIndex < client.sentHistory.length - 1) {
      sentHistoryIndex++;
      $("#text-input").val(client.sentHistory[sentHistoryIndex]);
    }
  }

  // Down arrow
  else if (e.keyCode === 40) {
    if (sentHistoryIndex === -1) {
      $("#text-input").val("");
    } else {
      sentHistoryIndex--;
      $("#text-input").val(client.sentHistory[sentHistoryIndex]);
    }
  }
});

// If CTRL + TAB pressed
$(document).keydown(e => {
  if (e.ctrlKey && e.which == 9) {
    client.activeTab++;
    if (client.activeTab == client.tabs.length)
      client.activeTab = 0;
    client.changeTab(client.tabs[client.activeTab].name);
  }
})

// Open join channel modal
$(document).on("click", "#open-channel-dialog", () => {
  if (!client.connected || client.channels.length == 0)
    return true;
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
         <p>${channelInfo.topic}<span class="active-users">${channelInfo.users} ${__("users")}</span></p>
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
         <p>${channelInfo.topic}<span class="active-users">${channelInfo.users} ${__("users")}</span></p>
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
  $("#friend-name").val("");
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
    tray.settings.nightMode().checked = settings.nightMode;
  });
});

// Notifications
$(document).on("change", "#notificationsCheckbox", () => {
  client.getSettings(settings => {
    settings.notifications = !settings.notifications;
    client.updateSettings(settings);
    tray.settings.notifications().checked = settings.notifications;
  });
});

// Sounds
$(document).on("change", "#soundsCheckbox", () => {
  client.getSettings(settings => {
    settings.sounds = !settings.sounds;
    client.updateSettings(settings);
    tray.settings.sounds().checked = settings.sounds;
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

// User signatures
var userSignsTimers = {};

$(document).on("mouseover", ".user-tag", e => {
  var userName = $(e.target).text();
  userSignsTimers[userName] = setTimeout(function() {
    $("#user-sign").css({
      left:  e.pageX + 10,
      top:   e.pageY + 10
    });
    $("#user-sign img").attr("src", `http://marekkraus.sk/irc4osu/getStatusBar.php?nick=${userName}`);
    $("#user-sign").fadeIn(150);
  });
});

$(document).on("mouseout", ".user-tag", e => {
  var userName = $(e.target).text();
  $("#user-sign").fadeOut(150, function() {
    $("#user-sign img").attr("src", "");
  });
  clearTimeout(userSignsTimers[userName]);
  delete userSignsTimers[userName];
});

function isPositiveInteger(x) {
    // http://stackoverflow.com/a/1019526/11236
    return /^\d+$/.test(x);
}

// Compare 2 version numbers
function compareVersionNumbers(v1, v2) {
    var v1parts = v1.split('.');
    var v2parts = v2.split('.');

    // First, validate both numbers are true version numbers
    function validateParts(parts) {
        for (var i = 0; i < parts.length; ++i) {
            if (!isPositiveInteger(parts[i])) {
                return false;
            }
        }
        return true;
    }
    if (!validateParts(v1parts) || !validateParts(v2parts)) {
        return NaN;
    }

    for (var i = 0; i < v1parts.length; ++i) {
        if (v2parts.length === i) {
            return 1;
        }

        if (v1parts[i] === v2parts[i]) {
            continue;
        }
        if (v1parts[i] > v2parts[i]) {
            return 1;
        }
        return -1;
    }

    if (v1parts.length != v2parts.length) {
        return -1;
    }

    return 0;
}

// Tray events

// Fires when we click on notifications in tray
tray.on("notifications", (bool) => {
  client.getSettings(settings => {
    settings.notifications = bool;
    client.updateSettings(settings);

    // Set settings in settings modal
    $("#notificationsCheckbox").prop("checked", bool);
  });
});

// Fires when we click on nightmode in tray
tray.on("nightMode", (bool) => {
  client.getSettings(settings => {
    settings.nightMode = bool;
    client.updateSettings(settings);

    // Set settings in settings modal
    $("#nightModeCheckbox").prop("checked", bool);

    client.nightMode(bool);
  });
});

// Fires when we click on sounds in tray
tray.on("sounds", (bool) => {
  client.getSettings(settings => {
    settings.sounds = bool;
    client.updateSettings(settings);

    // Set settings in settings modal
    $("#soundsCheckbox").prop("checked", bool);
  });
});

ipcRenderer.on('notify', (event, obj) => {
  client.notify(obj);
});