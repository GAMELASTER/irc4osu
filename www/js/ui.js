function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function setNigthMode(enable) {
  if(enable)
    $("body").addClass("night");
  else
    $("body").removeClass("night");
}

$(".modal-container").click(function(e) {
  if(e.target !== e.currentTarget) return;
  var container = $(this);
  if(container.data("close") == true)
    container.fadeOut(1000);
});

$(".modal-container .modal-header a").click(function() {
  var container = $(this).parent().parent().parent();;
  if(container.data("close") == true)
    container.fadeOut(1000);
});