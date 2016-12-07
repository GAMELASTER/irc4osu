angular = window.angular;

const irc = require('irc');

angular
.module('irc4osu')
.component('client', {
  templateUrl: './components/client/client.template.html',
  controller: function clientController() {

    // Holds all the open channels
    this.channels = [
      { name: '#english' },
      { name: '#osu' }
    ];

    // Holds the currently opened channel
    this.activeChannel = "#osu";

    // Holds the user's name
    this.username = "";

    // Holds the irc client
    this.irc = null;

    // Initializes the client
    this.init = function (username, password) {
      // Start the client
      this.irc = new irc.Client("irc.ppy.sh", username, {
        password: password,
        autoConnect: false
      });

      this.irc.connect(0, () => this.onConnected());
    }

    this.onConnected = function () {
      console.log("Connected!");
    }

    // Joins a channel
    this.joinChannel = function () {
      this.channels.push({name: '#announce'});
    }
  }
});