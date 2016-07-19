function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

var startTime = Date.now();

setInterval(function() {
  let elapsedTime = new Date(Date.now() - startTime - 36e5); //36e5 because one hour...
  let hours = pad(elapsedTime.getHours(), 2);
  let minutes = pad(elapsedTime.getMinutes(),2);
  let seconds = pad(elapsedTime.getSeconds(),2);
  $("#online-time-text").text(`${hours}:${minutes}:${seconds}`);
}, 1100);