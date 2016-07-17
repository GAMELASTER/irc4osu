$("#splitter").mousedown(function() {
  var mouseMove = function(event) {
    $(".right-side").width(window.innerWidth - event.clientX - 7);
  }

  var mouseUp = function() {
    window.removeEventListener("mousemove", mouseMove);
    window.removeEventListener("mouseup", mouseUp);
  }

  window.addEventListener("mousemove", mouseMove);
  window.addEventListener("mouseup", mouseUp);
})