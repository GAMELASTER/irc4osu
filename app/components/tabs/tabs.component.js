angular = window.angular;

angular
.module('irc4osu')
.component('tabs', {
  templateUrl: './components/tabs/tabs.template.html',
  controller: function tabsController() {
    this.message = "these are the tabs!";
  }
});