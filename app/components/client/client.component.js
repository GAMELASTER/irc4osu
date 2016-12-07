angular = window.angular;

angular
.module('irc4osu')
.component('client', {
  templateUrl: './components/client/client.template.html',
  controller: function clientController($scope, ModalService) {

    // Holds all the open channels
    this.channels = [];

    // Holds a list of channels to join by default
    this.defaultChannels = ["#osu", "#english"];

    // Holds a list of messages
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
    this.init = function () {

      this.connected = true;
      angular.forEach(this.defaultChannels, val => {
        this.joinChannel(val);
      });

      this.irc.on('message#', (nick, to, text, msg) => { this.onChannelMessage(nick, to, text, msg) });
      this.irc.on('pm', (nick, text, msg) => { this.onPrivateMessage(nick, text, msg) });
    };

    this.onChannelMessage = function (nick, to, text, msg) {
      this.addMessage(to, nick, text);
      $scope.$apply();
    };

    this.onPrivateMessage = function (nick, text, msg) {
      this.addMessage(nick, nick, text);
      $scope.$apply();
    };

    // Joins a channel
    this.joinChannel = function (channel) {
      this.irc.join(channel, () => {
        this.addSystemMessage(channel, `Joined ${channel}!`);
        $scope.$apply();
      });
    };

    this.addMessage = function (target, nick, message) {
      if (!this.messages[target]) this.messages[target] = [];

      this.messages[target].push({
        nick: nick,
        text: message,
        type: "message"
      });
    };

    this.addSystemMessage = function (target, message) {
      if (!this.messages[target]) this.messages[target] = [];

      this.messages[target].push({
        text: message,
        type: "system"
      });
    };

    this.changeActiveChannel = function (channel) {
      this.activeChannel = channel;
    };

    // On startup, show login modal
    ModalService.showModal({
      templateUrl: "./modals/login/login.template.html",
      controller: "loginController",
      inputs: {
        channels: this.channels
      }
    }).then((modal) => {
      modal.close.then((client) => {
        // If we ever come in here, we successfully logged in
        this.irc = client;
        this.init();
      });
    });

  }
});