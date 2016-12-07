var app = angular.module('irc4osu');

app.controller('loginController', ['$scope', 'close', function($scope, close) {

  $scope.close = function (result) {
 	  close(result);
  };

}]);