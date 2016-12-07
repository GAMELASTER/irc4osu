
// External
require('angular-translate');
require('angular-modal-service');

// Module
let irc4osu = angular.module('irc4osu', ['pascalprecht.translate', 'angularModalService']);

// Locales
let locales = ["en", "de"];

// Language configuration
irc4osu.config(['$translateProvider', function ($translateProvider) {

  locales.forEach(locale => {
    $translateProvider.translations(locale, require(`../locales/irc4osu-${locale}.json`));
  });
 
  $translateProvider.preferredLanguage('en');
}]);

// Directives
require('./directives/dragdrop.directive.js');

// Components
require('./components/client/client.component.js');
require('./components/menu/menu.component.js');
require('./components/tab/tab.component.js');
require('./components/message/message.component.js');

// Modals
require('./modals/login/login.controller.js');