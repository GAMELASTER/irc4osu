angular = window.angular;

angular
.module('irc4osu')
.component('client', {
  templateUrl: './components/client/client.template.html',
  controller: function clientController() {
    this.message = "Lets get ready to irc some osu!";
  }
});