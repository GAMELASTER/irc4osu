// Constants
const fs = require('fs');
const path = require('path');
const client = require("./js/client.js");
const request = require('request');
const {dialog} = require("electron");

// Check for update on startup
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
  client.changeTab($(e.target).parent(".tab").data("channel"));
});

// Click on close tab
$(document).on("click", "#tab-slider .tab .close", e => {
  client.closeTab($(e.target).parent(".tab").data("channel"));
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

// Click in channel name inside channel modal
$(document).on("click", ".join-channel", e => {
  client.joinChannel($(e.target).parent(".join-channel").data("channel"));
  $("#select-channel-modal").fadeOut(150);
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

// Whenever we use the mousewheel
$(document).on("mousewheel", ".chat-container", e => {

  // Get channel name
  var channel = $(e.target).attr("name");

  // Get tab item
  var tab = client.tabs.find(tab => tab.name === channel);

  console.log($(e.target).scrollTop() + $(e.target).innerHeight());
 
  if (e.originalEvent.wheelDelta / 120 > 0) {
      // Scrolling up
      tab.autoScroll = false;
  } else {
    // Scrolling down
    if ($(e.target).scrollTop() + $(e.target).innerHeight() >= $(e.target)[0].scrollHeight - 50)
      tab.autoScroll = true;
  }
});

$(document).on("click", "a.link-external", e => {
  e.preventDefault();

  require('electron').shell.openExternal($(e.target).data("link"));
});