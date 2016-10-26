const {shell} = require('electron');
const app = require('electron').remote.app;
const {ipcRenderer} = require('electron');
const notifier = require('node-notifier');
const request = require('request');
const fs = require('fs');
const path = require('path');

var channelsInfo = null;

var settings = null;

var initialized = false;

var tabsList = [];
var selectedTab = null;
var credentials = null;

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
  var container = $(this).parent().parent().parent();
  if(container.data("close") == true)
    container.fadeOut(1000);
});

function openPage(url) {
  shell.openExternal(url);
}

$("#login-form").submit(function(e) {
  e.preventDefault();
  ipcRenderer.send("logIn", {
    username: $("input[name='username']").val(),
    password: $("input[name='password']").val(),
  });
});

ipcRenderer.on("changeLoginFormState", (event, args) => {
  if(args.state == "loading") {
    $("input[name='username']").prop("disabled", true).val(args.credentials.username);
    $("input[name='password']").prop("disabled", true).val(args.credentials.password);
    $("#login-form button").prop("disabled", true);
  }
  else if(args.state == "error") {
    if(args.reason == "credentials") {
      $("input[name='username']").addClass("error");
      $("input[name='password']").addClass("error");
    }
    else alert(args.message);
    $("input[name='username']").prop("disabled", false);
    $("input[name='password']").prop("disabled", false);
    $("#login-form button").prop("disabled", false);
  }
  else if(args.state == "restore") {
    $("input[name='username']").prop("disabled", false);
    $("input[name='password']").prop("disabled", false);
    $("#login-form button").prop("disabled", false);
  }
  else if(args.state == "hide") {
    initialized = true;
    credentials = args.credentials;
    settings = args.settings;
    $("#user-name").text(args.credentials.username);
    $("#avatar").prop("src", "https://a.ppy.sh/"+args.credentials.userID+"_"+Date.now()+".jpg");
    $("#login-modal").fadeOut(1000);
    {
      $("#nightModeCheckbox").prop("checked", settings.nightMode);
      $("#notificationsCheckbox").prop("checked", settings.notifications);
      setNigthMode(settings.nightMode);      
    }
  }
});

function getChannelNameID(channel) {
  return channel.replace("#","hash_");
}

function createChat(name) {
 tabsList[name] = {
    name: name,
    autoScroll: true,
    isChannel: name[0] == "#" ? true : false
  }
  //$(".chat-container").css("display", "none");
  var channelId = getChannelNameID(name);
  $("#chat-area").prepend(`<div onmousewheel='onChatMouseWheel(event, "${name}");' id='${channelId}-container' class="chat-container"></div>`);
  console.log("created");
  var element = $(`<div data-channel="${name}" onClick="changeSelectedTab(this);" class="tab default active"><span onClick="closeTab(this);" class="close">X</span><span>${name}</span></div>`).appendTo($("#tab-slider"));
  changeSelectedTab(element);
  //selectedTab = name;
}

function addMessage(channel, options) {
  var channelId = getChannelNameID(channel);
  var date = new Date();
  var html = "<span class='time-tag'>["+pad(date.getHours(), 2)+":"+pad(date.getMinutes(), 2)+"]</span> ";
  html += `<a class="user-tag normal-user" href="#">${options.nick}</a>`;
  if(options.type == "message") html += ": ";
  else html += " ";
  html += processMessage(options, options.text);
  html += "<br>";
  $(`#${channelId}-container`).append(html);
  if(tabsList[channel].autoScroll) $(`#${channelId}-container`).scrollTop($(`#${channelId}-container`)[0].scrollHeight);
}

function getUserAvatar(username, callback) {
  var avatarPath = app.getPath('userData') + path.sep + "avatarCache" + path.sep + username + ".png";
  var downloadAvatar = function() {
    request
    .get('http://marekkraus.sk/irc4osu/getUserAvatar.php?username=' + username)
    .on('end', function() {
      callback(avatarPath);
    })
    .pipe(fs.createWriteStream(avatarPath));
  };
  fs.stat(avatarPath, (err, stat) => {
    if(err) return downloadAvatar();
    now = new Date().getTime();
    endTime = new Date(stat.ctime).getTime() + (1 * 24 * 60 * 60 * 1000);
    if (now > endTime)
      return downloadAvatar();
    callback(avatarPath);
  });
}

function processMessage(options, message) {
  message = message.replace(/\[(http(?:.*?))\ (.*)\]/, "<a href='javascript:openPage(\"$1\")'>$2</a>")
    //.replace(/((?:http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*))/gi, "<a href='javascript:openLink(\"$1\")'>$1</a>")
  ;

  if(message.indexOf(credentials.username) != -1)
  {
    if(settings.notifications)
    {
      getUserAvatar(options.nick, (avatarPath) => {
        notifier.notify({
          'icon': avatarPath,
          'title': `${options.nick} mention you in ${options.to}`,
          'message': options.text
        });
      });
    }
    message = message.replace(credentials.username, `<span class="mention-tag">${credentials.username}</span>`);
  }
  return message;
}

function addSystemMessage(channel, type, message) {
  var channelId = getChannelNameID(channel);
  $(`#${channelId}-container`).append(`<span class="${type}-tag">${message}</span><br>`);
  if(tabsList[channel].autoScroll) $(`#${channelId}-container`).scrollTop($(`#${channelId}-container`)[0].scrollHeight);  
}

function sendMessage() {
  var text = $("#text-input").val();
  if(text == "") return;
  if(text.indexOf("/pm") == 0) {
    var datas = text.split(" ");
    if(datas[1] in tabsList)
      changeSelectedTab(datas[1]);
    else createChat(datas[1]);
    text = datas.slice(2, datas.length).join(" ");
  }
  ipcRenderer.send("sendMessage", { channel: selectedTab, from: credentials.username, message: text });
  $("#text-input").val("");
}

$("#send-button").click(function() {
  sendMessage();
});

$("#text-input").keyup(function(e) {
  if (e.keyCode == 13) {
    sendMessage();
  }
});

function openChannelsDialog() {
  $("#select-channel-modal .channel-row").remove();
  $("#select-channel-modal").fadeIn(1000);
  $("#channels-filter").val("");
  for(var i in channelsInfo) {
    var channelInfo = channelsInfo[i];
    $("#channels-list").append(`<div onClick="joinChannel('${channelInfo.name}');" class="channel-row">
            <h1>${channelInfo.name}</h1>
            <p>${channelInfo.topic}<span class="active-users">${channelInfo.users} users</span></p>
          </div>`);
  }
}

$("#channels-filter").keyup(function() {
  $("#select-channel-modal .channel-row").remove();
  for(var i in channelsInfo) {
    var channelInfo = channelsInfo[i];
    if(channelInfo.name.indexOf($("#channels-filter").val()) == -1) continue;
    $("#channels-list").append(`<div onClick="joinChannel('${channelInfo.name}');" class="channel-row">
            <h1>${channelInfo.name}</h1>
            <p>${channelInfo.topic}<span class="active-users">${channelInfo.users} users</span></p>
          </div>`);
  }
});

function joinChannel(name) {
  $("#select-channel-modal").fadeOut(1000);
  ipcRenderer.send("joinChannel", {channel: name});
}

function changeSelectedTab(element) {
  var tab = $(element);
  var name = tab.data("channel");
  $("#tab-slider .tab").removeClass("active");
  tab.addClass("active");
  $(".chat-container").css("display", "none");
  var channelId = getChannelNameID(name);
  $(`#${channelId}-container`).css("display", "block");
  selectedTab = name;
  if(channelsInfo != null && channelsInfo[selectedTab] != null) $("#online-users").text(channelsInfo[selectedTab].users);
}

function swipeLeft() {
  $("#tab-slider").animate({scrollLeft: $("#tab-slider").scrollLeft() - 100}, 200);
}

function swipeRight() {
  $("#tab-slider").animate({scrollLeft: $("#tab-slider").scrollLeft() + 100}, 200);
}

function closeTab(element) {
  var tab = $(element).parent();
  var channel = tab.data("channel");
  if(tabsList[channel].isChannel) {
    ipcRenderer.send("partChannel", { channel });
  }
  tab.remove();
  var channelId = getChannelNameID(channel);
  $(`#${channelId}-container`).remove();
  delete tabsList[channel];
}

function onChatMouseWheel(e, channel) {
  var channelId = getChannelNameID(channel); 
  if(e.wheelDelta / 120 > 0) {
      tabsList[channel].autoScroll = false;
  }
  else {
    if($(`#${channelId}-container`).scrollTop() + $(`#${channelId}-container`).innerHeight() >= $(`#${channelId}-container`)[0].scrollHeight) {
      tabsList[channel].autoScroll = true;
    }
  }
}

$("#open-friend").click(function() {
  $("#select-channel-modal").fadeOut(1000);  
  createChat($("#friend-name").val());
});

function logOut() {
  ipcRenderer.send("logOut");
}

function Settings() {
  $("#settings-modal").fadeIn(1000);
}

function About() {
  $("#about-modal").fadeIn(1000);
}

$("#nightModeCheckbox").change(function() {
  settings.nightMode = !settings.nightMode;
  setNigthMode(settings.nightMode);
  ipcRenderer.send("saveSettings", settings);
});

$("#notificationsCheckbox").change(function() {
  settings.notifications = !settings.notifications;
  ipcRenderer.send("saveSettings", settings);
});

if(initialized == false)
{
  initialized = true;
  ipcRenderer.send("init");  
}