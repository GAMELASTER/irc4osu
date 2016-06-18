var autoScroll = true;
var selectedChannel = "";
var chatAreas = [];
chatAreas[""] = "";
var scrollTabIndex = 0;

/*chatAreas["#english"] = "just.. hello! c:";
chatAreas["#polski"] = "just.. hello! c:";
chatAreas["#russia"] = "just.. hello! c:";
chatAreas["#afgan"] = "just.. hello! c:";
chatAreas["#tybet"] = "just.. hello! c:";
chatAreas["#tokjo"] = "just.. hello! c:";
chatAreas["#bratislava"] = "just.. hello! c:";
chatAreas["#ministry"] = "just.. hello! c:";
chatAreas["#bordel"] = "just.. hello! c:";
chatAreas["#avatar"] = "just.. hello! c:";*/

$('#chatArea').bind('mousewheel', function(e){
  if(e.originalEvent.wheelDelta / 120 > 0) {
    autoScroll = false;
  }
  else{
    if($("#chatArea").scrollTop() + $("#chatArea").innerHeight() >= $("#chatArea")[0].scrollHeight) {
      autoScroll = true;
    }
  }
});

function updateChannelTabs()
{
  var channelTabWidth = $("#header").width() - $("#userInfoArea").width() - 20;
  $("#channels").width(channelTabWidth);
  var maximumChannels = Math.floor((channelTabWidth - 115) / 130);
  $("#channels").empty();
  $("#channels").append("<li onClick='channelsMoveLeft();' class='cleft'>&laquo;</li>");
  var allTabs = Object.keys(chatAreas).length;
  if(scrollTabIndex > allTabs - maximumChannels)
  {
    scrollTabIndex = (allTabs - maximumChannels) > 0 ? (allTabs - maximumChannels) : 0;
  }
  /*for(var i = 0; i < maximumChannels; i++)
  {
    $("#channels").append('<li><a href="">#english</a></li>\
    <li class="closetab"><a href="">X</a></li>');
  }*/
  /*for(var i = scrollTabIndex * maximumChannels; i < (scrollTabIndex + 1) * maximumChannels; i++)
  {
    $("#channels").append('<li><a href="">'+chatAreas+'</a></li>\
    <li class="closetab"><a href="">X</a></li>');
  }*/
  var i = 0;
  for(var channelName in chatAreas)
  {
    if(channelName == "") continue;
    //console.log((scrollTabIndex * maximumChannels) +" < "+i +"&& "+i + " < " + ((scrollTabIndex + 1) * maximumChannels));
    //if(scrollTabIndex * maximumChannels <= i && i < (scrollTabIndex + 1) * maximumChannels)
    if(scrollTabIndex <= i && i < (scrollTabIndex + maximumChannels))
    {
      /*$("#channels").append('<li><a href="">'+channelName+'</a></li>\
      <li class="closetab"><a href="">X</a></li>');*/
      $("#channels").append("<li "+(channelName == selectedChannel ? "class='selected'" : "")+" onClick='switchChannel(\""+channelName+"\")' id='channel_"+channelName.replace("#","hash")+"'>"+channelName+"</li>\
    <li onClick='closeChannel(\""+channelName+"\","+i+")' id='channelclose_"+channelName.replace("#","hash")+"' class='closetab'>X</li>");
    }
    i++;
  }
  $("#channels").append("<li id='addChannel' onClick='showChannelsDialog();' class='cadd'>+</li>");
  $("#channels").append("<li onClick='channelsMoveRight();' class='cright'>&raquo;</li>");
}

$( window ).resize(function() {
  updateChannelTabs();
});

$(window).load(function(){
  updateChannelTabs();
});

function channelsMoveLeft() {
  console.log("ahoj");
  if(scrollTabIndex != 0)
    scrollTabIndex--;
  updateChannelTabs();
}

function channelsMoveRight() {
  console.log("ahoj");
  //if(scrollTabIndex != 0)
    scrollTabIndex++;
  updateChannelTabs();
}

function infoMessage(to, type, message)
{
  chatAreas[to] += "<span class='"+type+"message'>"+message+"</span><br>";
  updateChatArea();
}

function updateChatArea()
{
  if(autoScroll) $("#chatArea").scrollTop($("#chatArea")[0].scrollHeight);
  $("#chatArea").html(chatAreas[selectedChannel]);
}

function userMessage(from, to, message)
{
  var date = new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
  chatAreas[to] += "<span class='chatprefix'>["+date+"]</span> <span onmouseover='onSignMouseOver(event,\""+from+"\");' onmouseout='onSignMouseOut(\""+from+"\");' style='color: gold; font-weight:bold;'>"+from+"</span>: <span class='chattext'>"+message+"</span><br>";
  updateChatArea();
}

function userAction(from, to, text, message)
{
  var date = new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
  chatAreas[to] += "<span class='chatprefix'>["+date+"]</span> <span onmouseover='onSignMouseOver(event,\""+from+"\");' onmouseout='onSignMouseOut(\""+from+"\");' style='color: gold; font-weight:bold;'>"+from+"</span> <span class='chattext'>"+text+"</span><br>";
  updateChatArea();
}

function switchChannel(channel)
{
  selectedChannel = channel;
  updateChatArea();
  updateChannelTabs();
}
//$(this).data('timeout')
var hoverTimeout;

function onSignMouseOver(e,nick)
{
  /*$("#statussign, img").attr("src", "./images/loading.gif");*/
  $("#statussign").css({
   left:  e.pageX,
   top:   e.pageY
  });
  hoverTimeout = setTimeout(function() {
      $("#statussign img").attr("src","http://185.91.116.205/irc4osu/getStatusBar.php?nick=" + nick);
      $("#statussign").fadeIn();
  }, 1000);
}
function onSignMouseOut(nick) {
  clearTimeout(hoverTimeout);
  $("#statussign").fadeOut();
}