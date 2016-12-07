const app = angular.module('irc4osu');
const ircModule = require('irc');

app.controller('loginController', function($scope, channels, close) {
  
  $scope.ircClient = null;

  $scope.login = function (username, password) {

    // Start the client
    $scope.ircClient = new ircModule.Client("irc.ppy.sh", username, {
      password: password,
      channels: channels,
      autoConnect: false
    });

    $scope.ircClient.on('error', (error) => {
      switch (error.command) {

      // Wrong password
      case "err_passwdmismatch":
        console.error('Invalid credentials!');
        break;
      }
    });

    // Listeners
    $scope.ircClient.connect(0, () => {
      console.log("connected");
      close($scope.ircClient)
    });
  };

});