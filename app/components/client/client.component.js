angular = window.angular;

angular
.module('irc4osu')
.component('helloIrc', {
  template: '<h1>{{$ctrl.message}}</h1>',
  controller: function helloIrcController() {
    this.message = "Lets get ready to irc some osu!";
  }
});