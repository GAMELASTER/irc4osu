angular = window.angular;

angular
.module('irc4osu')
.component('tab', {
  templateUrl: './components/tab/tab.template.html',
  bindings: {
    tab: '='
  },
  controller: function tabsController() {

  }
});