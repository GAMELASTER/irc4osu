const {shell} = require('electron');
const {ipcRenderer} = require('electron');

var channelsInfo = {};

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
  changeLoginFormState(args);
});

function changeLoginFormState(args) {
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
    credentials = args.credentials;
    $("#user-name").text(args.credentials.username);
    $("#avatar").prop("src", "https://a.ppy.sh/"+args.credentials.userID+"_"+Date.now()+".jpg");
    $("#login-modal").fadeOut(1000);
  }
}

function getChannelNameID(channel) {
  return channel.replace("#","hash_");
}

function createChat(name) {
  $(".chat-container").css("display", "none");
  var channelId = getChannelNameID(name);
  $("#chat-area").prepend(`<div id='${channelId}-container' class="chat-container"></div>`);
  $("#tab-slider").append(`<div data-channel="${name}" onClick="changeSelectedTab(this);" class="tab default active"><span class="close">X</span><span>${name}</span></div>`);
  selectedTab = name;
}

function addMessage(channel, options) {
  var channelId = getChannelNameID(channel);
  var date = new Date();
  var html = "<span class='time-tag'>["+pad(date.getHours(), 2)+":"+pad(date.getMinutes(), 2)+"]</span> ";
  html += `<a class="user-tag normal-user" href="#">${options.from}</a>`;
  html += ": ";
  html += options.message;
  html += "<br>";
  $(`#${channelId}-container`).append(html);
}

function addSystemMessage(channel, type, message) {
  var channelId = getChannelNameID(channel);
  $(`#${channelId}-container`).append(`<span class="${type}-tag">${message}</span><br>`);
}

$("#send-button").click(function() {
  addMessage(selectedTab, {
    from: credentials.username,
    message: $("#text-input").val()
  });
  ipcRenderer.send("sendMessage", { channel: selectedTab, message: $("#text-input").val() });
  $("#text-input").val("");
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
  $("#online-users").text(channelsInfo[selectedTab].users);
}

function swipeLeft() {
  $("#tab-slider").animate({scrollLeft: $("#tab-slider").scrollLeft() - 100}, 200);
}

function swipeRight() {
  $("#tab-slider").animate({scrollLeft: $("#tab-slider").scrollLeft() + 100}, 200);
}