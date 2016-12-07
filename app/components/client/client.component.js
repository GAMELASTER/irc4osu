angular = window.angular;

const irc = require('irc');

angular
.module('irc4osu')
.component('client', {
  templateUrl: './components/client/client.template.html',
  controller: function clientController($scope) {

    // Holds all the open channels
    this.channels = ["#osu", "#english"];

    this.messages = {};

    // Holds the currently opened channel
    this.activeChannel = "#osu";

    // Holds the user's name
    this.username = "";

    // Holds the user's password
    this.password = "";

    // True if Connected
    this.connected = false;

    // Holds the irc client
    this.irc = null;

    // Initializes the client
    this.init = function (username, password) {

      console.log("Connecting with username " + username + " and password " + password);

      // Start the client
      this.irc = new irc.Client("irc.ppy.sh", username, {
        password: password,
        channels: this.channels,
        autoConnect: false
      });

      this.irc.connect(0, () => this.onConnected());
      this.irc.on('message#', (nick, to, text, msg) => {this.onChannelMessage(nick, to, text, msg)});
    };

    this.onConnected = function () {
      this.connected = true;
      $scope.$apply();
      console.log("Connected!");
    };

    this.onChannelMessage = function (nick, to, text, msg) {

      // Create message array if it doesn't exist
      if (!this.messages[to]) this.messages[to] = [];

      // Push to messages
      this.messages[to].push({
        nick: nick,
        text: text
      });

      $scope.$apply();
      
      //console.log(`[${to}] ${nick}: ${text}`);
    };

    // Joins a channel
    this.joinChannel = function (channel) {
      this.irc.join(channel, () => {
        $scope.$apply();
      });
    };

    this.changeActiveChannel = function (channel) {
      this.activeChannel = channel;
    };
  }
});