
// Electron includes
const {
  shell,
  ipcRenderer
} = require('electron');
const app = require('electron').remote.app;

// Constants
const notifier = require('node-notifier');
const request = require('request');
const fs = require('fs');
const path = require('path');
const irc = require('irc');
const storage = require("electron-json-storage");

const client = {

  tabs: [],
  activeTab: 0,
  defaultChannels: ["#osu", "#english"],
  channels: [],
  connected: false,
  username: "",

  // Holds the irc client
  irc: null,

  // Initializes the client
  init: function (credentials) {

    // Save the username for later use
    this.username = credentials.username;

    // Start the client
    this.irc = new irc.Client("irc.ppy.sh", credentials.username, {
      password: credentials.password,
      autoConnect: false
    });

    // Setup the listeners
    this.irc.connect(0, () => this.onConnected());

    this.irc.addListener("error", error => this.onError(error));

    this.irc.addListener("message#", (nick, to, text, message) => {
      this.onMessage({
        nick: nick,
        to: to,
        text: text,
        message: message
      });
    });

    this.irc.addListener("pm", (nick, text, message) => {
      this.onPrivateMessage({
        nick: nick,
        text: text,
        message: message
      });
    });

    this.irc.addListener("action", (nick, to, text, message) => {
      this.onAction({
        nick: nick,
        to: to,
        text: text,
        message: message
      });
    });

    this.irc.addListener("channellist", channelList => this.onChannelList(channelList));
  },

  onChannelList: function (channelList) {
    // Clear array
    this.channels = [];

    // Sort channel list alphabetically
    channelList.sort((a, b) => {
      var x = a.name.substring(1), y = b.name.substring(1);
      return x < y ? -1 : x > y ? 1 : 0;
    });

    // Add all channel info to our array
    channelList.map(e => this.channels.push(e));

    console.log(this.channels);
  },

  // Fires whenever we receive a message
  onMessage: function (args) {

    // Join channel if it doesn't exist yet
    var tab = this.tabs.find(tab => tab.name === args.to);
    if (!tab) this.joinChannel(args.to);

    // Build date
    var date = new Date();
    var hours = ("0" + date.getHours()).slice(-2);
    var minutes = ("0" + date.getMinutes()).slice(-2);

    // A hack to escape all html symbols and script injections
    var message = $("<div/>").text(args.text).html();

    var html = `<span class='time-tag'>[${hours}:${minutes}]</span> <a href="#" class="user-tag normal-user">${args.nick}</a>: ${message}<br />`;
    $(`#chat-area [name="${args.to}"]`).append(html);
  },

  // Fires whenever we recieve a private message
  onPrivateMessage: function (args) {

    // Join chat with user if it doesn't exist yet
    var tab = this.tabs.find(tab => tab.name === args.nick);
    if (!tab) this.joinUser(args.nick);

    // Build date
    var date = new Date();
    var hours = ("0" + date.getHours()).slice(-2);
    var minutes = ("0" + date.getMinutes()).slice(-2);

    // A hack to escape all html symbols and script injections
    var message = $("<div/>").text(args.text).html();

    var html = `<span class='time-tag'>[${hours}:${minutes}]</span> <a href="#" class="user-tag normal-user">${args.nick}</a>: ${message}<br />`;
    $(`#chat-area [name="${args.to}"]`).append(html);
  },

  // Fires whenever we receive an action
  onAction: function (args) {

    // Check if it was a pm
    var tabName = args.to === this.username ? args.nick : args.to;

    // Join chat with user if it doesn't exist yet
    var tab = this.tabs.find(tab => tab.name === tabName);

    // If tab doesnt exist, check if its a user or a channel
    if (!tab) {
      if (args.to === this.username)
        this.joinUser(tabName);
      else
        this.joinChannel(tabName)
    }

    // Build date
    var date = new Date();
    var hours = ("0" + date.getHours()).slice(-2);
    var minutes = ("0" + date.getMinutes()).slice(-2);

    // A hack to escape all html symbols and script injections
    var message = $("<div/>").text(args.text).html();

    var html = `<span class='time-tag'>[${hours}:${minutes}]</span> <a href="#" class="user-tag normal-user">${args.nick}</a> ${message}<br />`;
    $(`#chat-area [name="${args.to}"]`).append(html);
  },

  // Fires when we connect
  onConnected: function (args) {
    this.connected = true;
    
    // Hide login window
    $("#login-modal").fadeOut(150);

    this.irc.list();

    this.defaultChannels.forEach(function (channel) {
      this.joinChannel(channel);
    }, this);
  },

  // Fires whenever we receive an action
  onError: function (error) {
    console.log(error);

    switch (error.command) {
      
      // Wrong password
      case "err_passwdmismatch":

        // Enable login stuff
        $("#login-modal").fadeIn(150);
        $("#login-form input[name='username']").prop("disabled", false);
        $("#login-form input[name='password']").prop("disabled", false);
        $("#login-form button").prop("disabled", false);
        break;
    
    }
  },

  // Send message through irc client
  sendMessage: function (channel, message) {

    // Check if the message is a command
    if (message.charAt(0) === "/") return this.processCommand(message);

    this.irc.say(channel, message);
    this.onMessage({
      nick: this.username,
      to: channel,
      text: message,
      message: null
    });
  },

  systemMessage: function (channel, type, message) {
    $(`#chat-area [name="${channel}"]`).append(`<span class="${type}-tag">${message}</span><br>`);
  },

  processCommand: function (message) {

  },

  // Joins a channel
  joinChannel: function (channelName) {

    var element = $(`<div data-channel="${channelName}" class="tab default"><span class="close">X</span><span>${channelName}</span></div>`);
    this.tabs.push({
      name: channelName,
      autoScroll: true,
      isChannel: channelName.charAt(0) == "#" ? true : false
    });

    $("#chat-area").prepend(`<div name='${channelName}' class="chat-container hidden"></div>`);
    element.appendTo($("#tab-slider"));
    this.changeTab(channelName);
    this.systemMessage(channelName, "info", `Attempting to join channel...`);

    this.irc.join(channelName, () => {
      this.systemMessage(channelName, "success", `Joined ${channelName}!`);
    });
  },

  // Joins a user
  joinUser: function (username) {
      var element = $(`<div data-channel="${username}" class="tab default"><span class="close">X</span><span>${username}</span></div>`);
      this.tabs.push({
        name: username,
        autoScroll: true,
        isChannel: channelName.charAt(0) == "#" ? true : false
      });

      $("#chat-area").prepend(`<div name='${username}' class="chat-container hidden"></div>`);
      console.log(`Created chat with ${username}`);
      element.appendTo($("#tab-slider"));

      this.changeTab(username);
  },

  // Leaves a channel
  leaveChannel: function () {

  },

  // Changes active tab
  changeTab: function (tabName) {

    // Change active tab index
    this.activeTab = this.tabs.findIndex(tab => tab.name === tabName);

    // Remove all other active tabs
    $("#tab-slider .tab").removeClass("active");

    // Hide all other chat containers
    $("#chat-area .chat-container").addClass("hidden");

    // Make clicked tab active
    $(`#tab-slider div.tab[data-channel="${tabName}"]`).addClass("active");

    // Show chat container
    $(`#chat-area [name="${tabName}"]`).removeClass("hidden");
  },

  // Gets or creates the settings from storage
  getSettings: function (callback) {
    storage.has('irc4osu-settings', (error, hasKey) => {
        if (error) throw error;

        if (hasKey) {
          storage.get('irc4osu-settings', (error, settings) => {
            if (error) throw error;

            callback(settings);
          });
        } else {
          this.updateSettings({
            notifications: true,
            nightMode: false
          }, callback);
        }
      });
  },

  // Saves new settings to storage
  updateSettings: function (settings, callback) {
    storage.set("irc4osu-settings", settings, (error) => {
      if(error) throw error;

      callback();
    });
  },

  // Gets the credentials from storage
  getCredentials: function (callback) {
    storage.has('irc4osu-login', (error, hasKey) => {
      if (error) throw error;
      if (hasKey) {
        storage.get('irc4osu-login', (error, credentials) => {
          if (error) throw error;

          callback(credentials)
        });
      } else {
        callback(null);
      };
    });
  },

  // Saves new credentials to storage
  updateCredentials: function (credentials, callback) {

    // Get the user ID if its not in the object yet
    if (credentials.userID === undefined) {
      console.log("Requesting user id...");
      request({ url: 'https://marekkraus.sk/irc4osu/getUserBasic.php?username=' + credentials.username, json: true}, function (error, response, body) {
        if (error) throw error;

        credentials.userID = body[0].user_id;
        storage.set('irc4osu-login', credentials, function (error) {
          if (error) throw error;

          callback();
        });
      });
    } else {
      storage.set('irc4osu-login', credentials, function (error) {
        if (error) throw error;

        callback();
      });
    }
  },

  // Clears the login storage
  logout: function (callback) {
    storage.remove('irc4osu-login', function (error) {
      if(error) throw error;
      callback();
    });
  }
}

// Check if credentials exist in storage
client.getCredentials((credentials) => {
  if (credentials) {

    // Hide window early
    $("#login-modal").fadeOut(150);

    // Initialize client
    client.init(credentials);
    
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

  console.log("Saving credentials to storage...");
  client.updateCredentials(credentials, () => {
    client.init(credentials);
  });
});

// Click on tab
$(document).on("click", "#tab-slider .tab span", e => {
  client.changeTab($(e.target).parent().data("channel"));
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

  client.channels.forEach((channelInfo) => {

    // Collect all channel names we have open
    let tabsList = client.tabs.map(e => e.name);

    // Skip any channels we already have opened
    if (channelInfo.name in tabsList) return;

    // Append the html
    $("#channels-list").append(
      `<div data-channel="${channelInfo.name}" class="channel-row join-channel">
         <h1>${channelInfo.name}</h1>
         <p>${channelInfo.topic}<span class="active-users">${channelInfo.users} users</span></p>
       </div>`);
  }, this);
});

$(document).on("click", ".join-channel", e => {
  client.joinChannel($(e.target).parent(".join-channel").data("channel"));
  $("#select-channel-modal").fadeOut(150);
});

$(document).on("click", "#exit-select-channel-modal", e => {
  $("#select-channel-modal").fadeOut(150);
});