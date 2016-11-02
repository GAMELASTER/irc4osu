
// Electron includes
const {
  shell,
  ipcRenderer
} = require('electron');
const app = require('electron').remote.app;

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

const modalAnimationDuration = 150;

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
    container.fadeOut(modalAnimationDuration);
});

$(".modal-container .modal-header a").click(function() {
  var container = $(this).parent().parent().parent();
  if(container.data("close") == true)
    container.fadeOut(modalAnimationDuration);
});

function openPage(url) {
  shell.openExternal(url);
}

function openUser(nick) {
  shell.openExternal("https://osu.ppy.sh/u/" + nick);
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
    $("#login-modal").fadeOut(modalAnimationDuration);
    {
      $("#nightModeCheckbox").prop("checked", settings.nightMode);
      $("#notificationsCheckbox").prop("checked", settings.notifications);
      setNigthMode(settings.nightMode);      
    }
  }
});

ipcRenderer.on("showNotification", (event, options) => {
  notifier.notify(options);
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

  // Build date
  var date = new Date();
  var hours = ("0" + date.getHours()).slice(-2);
  var minutes = ("0" + date.getMinutes()).slice(-2);

  // Build html message
  var html = `<span class='time-tag'>[${hours}:${minutes}]</span>`;
  html += `<a onMouseOver="nickMouseOver(event, '${options.nick}')" onMouseOut="nickMouseOut(event, '${options.nick}')" href="javascript:openUser('${options.nick}')" class="user-tag normal-user" href="#">${options.nick}</a>`;
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

  // Search for all links in a message
  var pattern = /\[(http.*?) (.*?\]?)\]/g;
  var match = pattern.exec(message);

  // Replace each match with a functional link
  while (match) {
      message = message.replace(match[0], `<a href='javascript:openPage("${match[1]}")' title='${match[1]}' class='link'>${match[2]}</a>`);
      match = pattern.exec(message);
  }

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
  if(text.indexOf("/pm") == 0 || text.indexOf("/msg") == 0) {
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
  $("#select-channel-modal").fadeIn(modalAnimationDuration);
  $("#channels-filter").val("");
  for(var i in channelsInfo) {
    var channelInfo = channelsInfo[i];
    if(channelInfo.name in tabsList) continue;
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
    if(channelInfo.name in tabsList) continue;
    if(channelInfo.name.indexOf($("#channels-filter").val()) == -1) continue;
    $("#channels-list").append(`<div onClick="joinChannel('${channelInfo.name}');" class="channel-row">
            <h1>${channelInfo.name}</h1>
            <p>${channelInfo.topic}<span class="active-users">${channelInfo.users} users</span></p>
          </div>`);
  }
});

function joinChannel(name) {
  $("#select-channel-modal").fadeOut(modalAnimationDuration);
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
  var friendName = $("#friend-name").val();
  if(friendName in tabsList) return alert("Users chat is already opened!");
  $("#select-channel-modal").fadeOut(modalAnimationDuration);  
  createChat(friendName);
  $("#friend-name").val("");
});

function logOut() {
  ipcRenderer.send("logOut");
}

function Settings() {
  $("#settings-modal").fadeIn(modalAnimationDuration);
}

function About() {
  $("#about-modal").fadeIn(modalAnimationDuration);
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

var userSignTimer = [];

function nickMouseOut(event, nick) {
  $("#user-sign").fadeOut(modalAnimationDuration);
  clearTimeout(userSignTimer[nick]);
  delete userSignTimer[nick];
}

function nickMouseOver(event, nick) {
  $("#user-sign").css({
   left:  event.pageX,
   top:   event.pageY
  });
  userSignTimer[nick] = setTimeout(function() {
    $("#user-sign img").attr("src", `http://marekkraus.sk/irc4osu/getStatusBar.php?nick=${nick}`);
    $("#user-sign").fadeIn(modalAnimationDuration);
  }, 2000);
}
