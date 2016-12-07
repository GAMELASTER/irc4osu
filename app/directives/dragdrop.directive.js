angular = window.angular;
let app = angular.module("irc4osu");

app.directive('sortable', function() {
  return {
    controller: function($scope, $attrs) {
      var listModel = null;
      $scope.$watch($attrs.sortable, function(sortable) {
        listModel = sortable;
      });
      this.move = function(fromIndex, toIndex) {
        // http://stackoverflow.com/a/7180095/1319998
        listModel.splice(toIndex, 0, listModel.splice(fromIndex, 1)[0]);
      };
    }
  };
});

app.directive('sortableItem', function($window) {
  return {
    require: '^sortable',
    link: function(scope, element, attrs, sortableController) {
      var index = null;
      scope.$watch(attrs.sortableItem, function(newIndex) {
        index = newIndex;
      });
      
      attrs.$set('draggable', true);
      
      // Wrapped in $apply so Angular reacts to changes
      var wrappedListeners = {
        // On item being dragged
        dragstart: function(e) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.dropEffect = 'move';
          e.dataTransfer.setData('application/json', index);
          element.addClass('dragging');
        },
        dragend: function(e) {
          e.stopPropagation();
          element.removeClass('dragging');
        },

        // On item being dragged over / dropped onto
        dragenter: function(e) {
          element.addClass('hover');
        },
        dragleave: function(e) {
          element.removeClass('hover');
        },
        drop: function(e) {
          e.preventDefault();
          e.stopPropagation();
          element.removeClass('hover');
          var sourceIndex = e.dataTransfer.getData('application/json');
          sortableController.move(sourceIndex, index);
        }
      };
      
      // For performance purposes, do not
      // call $apply for these
      var unwrappedListeners = {
        dragover: function(e) {
          e.preventDefault();
        }
      };
      
      angular.forEach(wrappedListeners, function(listener, event) {
        element.on(event, wrap(listener));
      });
      
      angular.forEach(unwrappedListeners, function(listener, event) {
        element.on(event, listener);
      });
      
      function wrap(fn) {
        return function(e) {
          scope.$apply(function() {
            fn(e);
          });
        };
      }
    }
  };
});