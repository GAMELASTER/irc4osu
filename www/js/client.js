/*var irc = require('irc');

var client = new irc.Client('irc.ppy.sh', '', {
    password: "",
    autoConnect: false
});

infoMessage("info", "Connecting to server...");
client.connect(0);

client.addListener("registered", function(message) {
  infoMessage("success", "Connected successfully!");
  joinChannel("#english");
});

function joinChannel(name)
{
  infoMessage("info", "Attempting to join channel...")
  client.join(name, function(nick, message) {
    infoMessage("success", "Joined " + name + "!");
  });
}

client.addListener('join', function(channel, nick, message) {
  
});

client.addListener('error', function(message) {
  console.log('error: ', message);
});




client.addListener('message', function (from, to, message) {
  userMessage(from, to, message);
});*/

var username = "";

var ipcRenderer = require('electron').ipcRenderer;

function joinChannel(channel)
{
  $("#channelDialog").fadeOut();
  chatAreas[channel] = "";
  selectedChannel = channel;
  ipcRenderer.send("joinChannel", { channel });
  infoMessage(channel, "info", "Attempting to join channel...");
  updateChannelTabs();
  //todo
  //scrollTabIndex = Object.keys(chatAreas).length - 1;
  /*$("#addChannel").before("<li onClick='switchChannel(\""+channel+"\")' id='channel_"+channel.replace("#","hash")+"'>"+channel+"</li>\
    <li onClick='closeChannel(\""+channel+"\")' id='channelclose_"+channel.replace("#","hash")+"' class='closetab'>X</li>");*/
}

function closeChannel(channel, index) {
  //todo: auto select another channel
  delete chatAreas[channel];
  ipcRenderer.send("closeChannel", { channel });
  selectedChannel = "";
  updateChatArea();
  /*$("#channel_"+channel.replace("#","hash")).remove();
  $("#channelclose_"+channel.replace("#","hash")).remove();*/
  updateChannelTabs();
}

$("#textInput").keyup(function(e) {
  if (e.keyCode == 13) {
    sendMessage();
  }
});

function sendMessage() {
  var message = $("#textInput").val();
  ipcRenderer.send("sendMessage", { channel: selectedChannel, message: message });
  userMessage(username, selectedChannel, message);
  $("#textInput").val("");
}

ipcRenderer.on("onMessage", (event, arg) => {
  userMessage(arg.from, arg.to, arg.message);
});

ipcRenderer.on('onAction', function (event, arg) {
  userAction(arg.from, arg.to, arg.text, arg.message);
});

ipcRenderer.on("onJoinedChannel", (event, arg) => {
  infoMessage(arg.channel, "success", "Joined " + arg.channel + "!");
});

ipcRenderer.on("userInfo", (event, arg) => {
  console.log(arg);
  username = arg.username;
  $("#avatar").attr("src", arg.avatar);
  $("#nickname").text(username);
});

function showChannelsDialog()
{
  ipcRenderer.send("listChannels");
}

ipcRenderer.on("channelList", (event, arg) => {
  $("#channelsList").empty();
  arg.channel_list.sort(function(a, b) {
    //console.log(a, b);
    var x = a.name.substring(1), y = b.name.substring(1);
    
    return x < y ? -1 : x > y ? 1 : 0;
  });
  for(var i in arg.channel_list) {
    var channel = arg.channel_list[i];
    $("#channelsList").append("<li><a href='javascript:joinChannel(\""+channel.name+"\");'><b>"+channel.name+"</b> - "+channel.topic+" ("+channel.users+" users online)</a></li>");
  }
  $("#channelDialog").fadeIn();
});