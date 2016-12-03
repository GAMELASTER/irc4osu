angular = window.angular;

angular
.module('irc4osu')
.component('menu', {
  templateUrl: './components/menu/menu.template.html',
  controller: function menuController() {
    this.message = "this is the menu!";
  }
});