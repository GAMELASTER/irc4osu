
// External
require('angular-translate');

// Module
let irc4osu = angular.module('irc4osu', ['pascalprecht.translate']);

// Locales
let locales = ["en", "de"];

// Language configuration
irc4osu.config(['$translateProvider', function ($translateProvider) {

  locales.forEach(locale => {
    $translateProvider.translations(locale, require(`../locales/irc4osu-${locale}.json`));
  });
 
  $translateProvider.preferredLanguage('en');
}]);

// Components
require('./components/client/client.component.js');
require('./components/menu/menu.component.js');
require('./components/tab/tab.component.js');
require('./components/message/message.component.js');