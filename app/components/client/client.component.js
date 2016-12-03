angular = window.angular;

angular
.module('irc4osu')
.component('client', {
  templateUrl: './components/client/client.template.html',
  controller: function clientController() {
    this.channels = [
      { name: '#english' },
      { name: '#german' },
      { name: '#osu' }
    ];

    this.addTab = function () {
      this.channels.push({name: '#announce'});
    }
  }
});