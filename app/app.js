
let irc4osu = angular.module('irc4osu', []);

irc4osu.controller('testController', ($scope) => {
  $scope.message = "Hello angular! Let's get ready to irc4osu!";
});