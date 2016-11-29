/*
 *
 * Irc client handler
 *
 */

const irc = require('irc');
const storage = require("electron-json-storage");
const request = require('request');
const notifier = require('node-notifier');
const path = require("path");
const {ipcRenderer, remote} = require("electron");
const {app} = remote;

const client = {

  // Holds a list of all open tabs
  tabs: [],

  // Holds the index of the currently selected tab
  activeTab: 0,

  // Holds the channels to join on login
  defaultChannels: ["#osu", "#english"],

  // Holds all the channelInfos
  channels: [],

  // True whenever we are connected
  connected: false,

  // Holds the username
  username: "",

  // Holds the irc client
  irc: null,

  // Holds a list of moderators
  admins: [],

  // Holds a list of all available settings
  settingsArray: ["notifications", "nightMode", "sounds", "highlights"],

  // Holds the path to the notification sound
  notificationSound: `${__dirname}/../sounds/notification.wav`,

  // Where to store avatars
  avatarCache: path.join(app.getPath('userData'), "avatar_cache"),

  // Shared variable tray
  tray: remote.getCurrentWindow().tray,

  // Initializes the client
  init: function (credentials) {

    // Save the username for later use
    this.username = credentials.username;

    // Set settings
    this.getSettings(settings => {
      
      // Set settings in settings modal
      $("#nightModeCheckbox").prop("checked", settings.nightMode);
      $("#notificationsCheckbox").prop("checked", settings.notifications);
      $("#soundsCheckbox").prop("checked", settings.sounds);
      $("#highlightsTextbox").prop("value", settings.highlights);

      // Set nightmode if active
      this.nightMode(settings.nightMode);

      // Send settings to the main process
      tray.settings.nightMode().checked = settings.nightMode;
      tray.settings.sounds().checked = settings.sounds;
      tray.settings.notifications().checked = settings.notifications;
    });

    // Start the client
    this.irc = new irc.Client("irc.ppy.sh", credentials.username, {
      password: credentials.password,
      autoConnect: false
    });

    // Setup the listeners
    this.irc.connect(0, () => this.onConnected(credentials));

    this.irc.addListener("error", error => this.onError(error));

    this.irc.addListener("names", (channel, nicks) => this.onNames(channel, nicks));

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

  // Fires whenever we receive a channel listing from the server
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

    // Update user count for current tab
    this.updateUserCount(this.tabs[this.activeTab].name);
  },

  // Fires whenever we receive a list of names
  onNames: function (channel, nicks) {
  
    // Turn this hairy object into an array
    nicks = Object.keys(nicks);

    // Gather admin names
    nicks.every(nick => {

      // If user is not an admin, nope the fuck out
      if (nick.charAt(0) !== "@") return true;

      // Remove the @
      var newNick = nick.slice(1);

      // If admin is already in admin array, nope the fuck out
      if (this.admins.indexOf(newNick) !== -1) return true;

      // Add new admin
      this.admins.push(newNick);

      return true;
    });
  },

  // Fires whenever we receive or send a message
  onMessage: function (args) {

    // Join channel if it doesn't exist yet
    var tab = this.tabs.find(tab => tab.name === args.to);
    if (!tab) {
      if (args.to.charAt(0) === "#")
        this.joinChannel(args.to);
      else
        this.joinUser(args.to);
    }

    // Build date
    var date = new Date();
    var hours = ("0" + date.getHours()).slice(-2);
    var minutes = ("0" + date.getMinutes()).slice(-2);

    // A hack to escape all html symbols and script injections
    this.processMessage(args.text, message => {
    
      // Notify if mentioned
      if (this.checkMentioned(message))
        this.checkAndNotify(args);

      // Get the users name color
      var user = this.classForUser(args.nick);

      // Build html
      var html = `<span class='time-tag'>[${hours}:${minutes}]</span>
                <a href="#" class="user-tag ${user} link-external" data-link="https://osu.ppy.sh/u/${args.nick}">${args.nick}</a>: ${message}<br />`;

      // Append html
      $(`#chat-area [name="${args.to}"]`).append(html);
    });

    // Autoscroll
    if (tab && tab.autoScroll)
      $(`#chat-area [name="${args.to}"]`).scrollTop($(`#chat-area [name="${args.to}"]`)[0].scrollHeight);
    
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
    this.processMessage(args.text, message => {

      // Get the users name color
      var user = this.classForUser(args.nick);

      var html = `<span class='time-tag'>[${hours}:${minutes}]</span>
                  <a href="#" class="user-tag ${user} link-external" data-link="https://osu.ppy.sh/u/${args.nick}">${args.nick}</a>: ${message}<br />`;
      
      $(`#chat-area [name="${args.nick}"]`).append(html);
    });

    // Autoscroll
    if (tab && tab.autoScroll)
      $(`#chat-area [name="${args.nick}"]`).scrollTop($(`#chat-area [name="${args.nick}"]`)[0].scrollHeight);

    this.checkAndNotify(args);
  },

  // Fires whenever we send or receive an action
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
    this.processMessage(args.text, message => {

      // Notify if mentioned
      if (this.checkMentioned(message))
        this.checkAndNotify(args);

      // Get the users name color
      var user = this.classForUser(args.nick);

      var html = `<span class='time-tag'>[${hours}:${minutes}]</span>
                  <a href="#" class="user-tag ${user} link-external" data-link="https://osu.ppy.sh/u/${args.nick}">${args.nick}</a> ${message}<br />`;

      $(`#chat-area [name="${tabName}"]`).append(html);
    });

    // Autoscroll
    if (tab && tab.autoScroll)
      $(`#chat-area [name="${tabName}"]`).scrollTop($(`#chat-area [name="${tabName}"]`)[0].scrollHeight);
  },

  // Fires when we connect
  onConnected: function (credentials) {

    // Set connected to true
    this.connected = true;

    // Update profile pic
    $("#avatar").prop("src", `https://a.ppy.sh/${credentials.userID}_${Date.now()}.jpg`);

    // Update username
    $("#user-name").text(credentials.username);

    // Hide login window
    $("#login-modal").fadeOut(150);

    // Channel list with users online
    this.irc.list();

    // Join each default channel
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

      // User doesn't exist
      case "err_nosuchnick":

        this.systemMessage(this.tabs[this.activeTab].name, "error", "This user is either offline or doesn't exist!");

        break;
    }
  },

  // Send message through irc client
  sendMessage: function (channel, message) {

    // Check if the message is a command
    if (message.charAt(0) === "/") return this.processCommand(channel, message);

    this.irc.say(channel, message);
    this.onMessage({
      nick: this.username,
      to: channel,
      text: message,
      message: null
    });
  },

  // Send message through irc client
  sendAction: function (channel, message) {
    this.irc.action(channel, message);
    this.onAction({
      nick: this.username,
      to: channel,
      text: message,
      message: null
    });
  },

  // Sends a system message
  // Possible types: success, info, error
  systemMessage: function (channel, type, message) {
    $(`#chat-area [name="${channel}"]`).append(`<span class="${type}-tag">${message}</span><br>`);
  },

  // Process a command
  processCommand: function (channel, message) {

    // Split the messages
    let msgArray = message.split(" ");

    switch (msgArray[0]) {

      // Sends an action
      case "/me":
        this.sendAction(channel, msgArray.slice(1).join(" "));
        break;

      // Sends a PM
      case "/pm":
        this.sendMessage(msgArray[1], msgArray.slice(2).join(" "));
        break;

      // Sends a PM
      case "/msg":
        this.sendMessage(msgArray[1], msgArray.slice(2).join(" "));
        break;

      // Joins a channel
      case "/join":
        
        // Save channel
        let channelToJoin = msgArray[1];
        
        // Format channel
        if (msgArray[1].charAt(0) !== "#") channelToJoin = `#${channelToJoin}`;

        // Collect all channel names we have open
        let tabsList = this.tabs.map(e => e.name);

        // Array to hold available channel names
        let channelNames = [];

        // Check to see if we're in the channel already, if not, add to array
        this.channels.every(channelInfo => {

          // Skip any channels we already have opened
          if (tabsList.indexOf(channelInfo.name) !== -1) return true;

          // Add to array
          channelNames.push(channelInfo.name);

          // Continue
          return true;

        });

        // Join if available
        if (channelNames.indexOf(channelToJoin) !== -1)
          this.joinChannel(channelToJoin);
        else
          this.systemMessage(channel, "error", `${__("Error joining")} ${channelToJoin}!`);

        break;
    }
  },

  // Process a message before displaying it
  processMessage: function (message, callback) { 

    // Escape message from all injected scripts and html tags
    message = $("<div/>").text(message).html();

    // Search for all links in a message
    var pattern = /\[(http.*?) (.*?\]?)\]/g;
    var match = pattern.exec(message);

    // Replace each match with a functional link
    while (match) {
        message = message.replace(match[0], `<a href='#' title='${match[1]}' class='link link-external' data-link='${match[1]}'>${match[2]}</a>`);
        match = pattern.exec(message);
    }

    // Check highlight settings
    this.getSettings(settings => {

      // Tag mentions
      [this.username].concat(settings.highlights.split(" ")).map(highlight => this.escapeRegExp(highlight)).filter(highlight => highlight.length > 0).forEach(highlight => message = message.replace(new RegExp(highlight, 'gi'), `<span class="mention-tag">$&</span>`));

      if (callback) callback(message);
    });
  },
  
  checkMentioned: function (message) {
    
    // Check if replacement html exists
    return message.indexOf(`<span class="mention-tag">`) !== -1;
  },

  escapeRegExp: function (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  },

  // Returns a class for a user's name
  classForUser: function (user) {
    var userClass;

    // Self
    if (user === this.username) {
      return "self-user";
    }
    
    // BanchoBot
    if (user === "BanchoBot") {
      return "banchobot-user";
    }
    
    // Moderator
    if (this.admins.indexOf(user) !== -1) {
      return "moderator-user";
    }

    // Everyone else
    return "normal-user";
  },

  // Joins a channel
  joinChannel: function (channelName) {
    if (!channelName) throw "No channel name provided!";

    var element = $(`<div data-channel="${channelName}" class="tab default"><span class="close">X</span><span class="tab-name">${channelName}</span></div>`);
    this.tabs.push({
      name: channelName,
      autoScroll: true,
      isChannel: channelName.charAt(0) == "#" ? true : false
    });

    // Hide text for no tabs open
    $('#empty').hide();

    // Show text input
    $('#text-input').show();

    // Append html
    $("#chat-area").prepend(`<div name='${channelName}' class="chat-container hidden"></div>`);
    
    // Add tab to the tabslider
    element.appendTo($("#tab-slider"));

    // Change the tab to the newly created tab
    this.changeTab(channelName);

    // Add system message
    this.systemMessage(channelName, "info", __("Attempting to join channel..."));

    // Join from the irc client
    this.irc.join(channelName, () => {
      this.systemMessage(channelName, "success", __("Joined %s!", channelName));
    });
  },

  // Joins a user
  joinUser: function (username) {
    var element = $(`<div data-channel="${username}" class="tab default"><span class="close">X</span><span class="tab-name">${username}</span></div>`);
    this.tabs.push({
      name: username,
      autoScroll: true,
      isChannel: false
    });

    // Hide text for no tabs open
    $('#empty').hide();

    // Show text input
    $('#text-input').show();

    // Set user count to ...
    this.updateUserCount();

    // Add the chat to the html
    $("#chat-area").prepend(`<div name='${username}' class="chat-container hidden"></div>`);
    
    // Add the tab to the tabslider
    element.appendTo($("#tab-slider"));

    // Change the tab to the newly created tab
    this.changeTab(username);

    // Add a system message
    this.systemMessage(username, "info", __(`Created chat with %s!`, username));
  },

  // Leaves a channel
  closeTab: function (tabName) {

    // Remove elements that belong to the tab
    $(`#chat-area [name="${tabName}"]`).remove();
    $(`#tab-slider div.tab[data-channel="${tabName}"]`).remove();

    // Find tab index
    let index = this.tabs.findIndex(tab => tab.name === tabName);

    // Leave the irc channel
    if (this.tabs[index].isChannel) {
      this.irc.part(tabName);
    }

    // The next tab we're joining
    let indexToJoin = index;

    // Check to see if its the last index, if yes then change it to the tab before
    if (index > 0 && index === this.tabs.length - 1) indexToJoin--;

    // Remove array element
    this.tabs.splice(index, 1);

    // Make sure we have tabs open
    if (this.tabs.length !== 0) {

      // Show text input
      $('#text-input').show();

      // Hide text for no tabs open
      $('#empty').hide();

      // Change tab
      this.changeTab(this.tabs[indexToJoin].name);
    } else {

      // Hide text input
      $('#text-input').hide();

      // Show text for no tabs open
      $('#empty').show();

      // Set user count to ...
      this.updateUserCount();
    }

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

    // Update user count
    this.updateUserCount(tabName);
  },

  // Update online user count display
  updateUserCount: function (channel) {

    // Change to undefined if channel parameter is not a channel
    if (channel && channel.charAt(0) !== "#") channel = undefined;

    // Default
    if (channel === undefined) $("#online-users").text("...");
    
    // Check if channels array exists
    if (this.channels !== null) {

      // Find this channel
      var thisChannel = this.channels.find(channelInfo => channelInfo.name === channel);

      // If found, change text to this channel's user count
      if (thisChannel)
        $("#online-users").text(thisChannel.users);
    }
  },

  // Returns the user's avatar
  getAvatar: function (username, callback) {

    // Make sure cache exists
    if (!fs.existsSync(this.avatarCache)) {
      fs.mkdir(this.avatarCache);
    }

    // Get the path to the image
    var avatarPath = path.join(this.avatarCache, username, ".png");
    
    var downloadAvatar = function () {
      request
      .get('http://marekkraus.sk/irc4osu/getUserAvatar.php?username=' + username)
      .on('end', function () {
        callback(avatarPath);
      })
      .pipe(fs.createWriteStream(avatarPath));
    };

    fs.stat(avatarPath, (err, stat) => {
      if (err) return downloadAvatar();
      
      // Get current time
      now = new Date().getTime();

      // Get change time + 1 day
      endTime = new Date(stat.ctime).getTime() + (1 * 24 * 60 * 60 * 1000);

      // Check if it's been longer than a day
      if (now > endTime)
        return downloadAvatar();

      callback(avatarPath);
    });
  },

  // Gets or creates the settings from storage
  getSettings: function (callback) {
    storage.has('irc4osu-settings', (error, hasKey) => {
      if (error) throw error;

      if (hasKey) {
        storage.get('irc4osu-settings', (error, settings) => {
          if (error) throw error;

          // Check if settings has all keys
          if (Object.keys(settings).length !== this.settingsArray.length)
            return this.updateSettings({
              notifications: true,
              nightMode: false,
              sounds: true,
              highlights: ""
            }, callback);

          if (callback) callback(settings);
        });
      } else {
        this.updateSettings({
          notifications: true,
          nightMode: false,
          sounds: true,
          highlights: ""
        }, callback);
      }
    });
  },

  // Saves new settings to storage
  updateSettings: function (settings, callback) {
    storage.set("irc4osu-settings", settings, (error) => {
      if (error) throw error;

      if (callback) callback(settings);
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
      request({ url: 'https://marekkraus.sk/irc4osu/getUserBasic.php?username=' + credentials.username, json: true }, function (error, response, body) {
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

  // Clears the login storage and shows the login window
  logout: function () {
    this.irc.disconnect(() => {
      storage.remove('irc4osu-login', function (error) {
        if (error) throw error;

        // Show login window
        //$("#login-modal").fadeIn(150);

        // TODO: This shows a white page
        window.location.reload();
      });
    });
  },

  // Show a notification
  notify: function (title, message, icon, callback) {

    // Flash frame
    ipcRenderer.send("flashFrame", true);

    let obj = {
      "title": title,
      "message": message,
      "wait": true
    };

    if (typeof icon === "string") obj.icon = icon;

    notifier.notify(obj, (error, result, metadata) => {
      if (error) return;

      if (typeof callback === "function" && result === "activate") callback();
    });
  },

  checkAndNotify: function (args) {

    // Only notify if you didn't send the message
    if (this.username !== args.nick) {

      // Check settings for options
      this.getSettings(settings => {

        // Notification
        if (settings.notifications)
          this.getAvatar(args.nick, avatarPath => {
            this.notify(args.nick, args.text, avatarPath, () => {
              ipcRenderer.send("show");
              this.changeTab(args.nick);
            });
          });

        // Sounds
        if (settings.sounds) {
          let notify = new Audio(this.notificationSound);
          notify.currentTime = 0;
          notify.volume = 0.5;
          notify.play();
        }
      });
    }

  },

  // Sets night mode
  nightMode: function (bool) {
    if (bool)
      $("body").addClass("night");
    else
      $("body").removeClass("night");
  }
}

module.exports = client;
