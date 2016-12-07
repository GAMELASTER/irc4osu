angular = window.angular;

angular
.module('irc4osu')
.component('message', {
  templateUrl: './components/message/message.template.html',
  bindings: {
    message: '='
  },
  controller: function messageController() {

  }
});