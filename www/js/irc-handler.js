ipcRenderer.on("onJoiningChannel", (event, args) => {
  createChat(args.channel);
  addSystemMessage(args.channel, "info", "Attempting to join channel...");
});

ipcRenderer.on("onJoinedChannel", (event, args) => { 
  addSystemMessage(args.channel, "success", `Joined ${args.channel}!`);
});

ipcRenderer.on("onMessage", (event, args) => {
  if(args.to == credentials.username) {
    args.to = args.nick;
    notifier.notify({
      'title': `${args.nick}`,
      'message': args.text
    });
  }
  addMessage(args.to, args);
});

ipcRenderer.on("onChannelList", (event, args) => {
  if(channelsInfo == null) channelsInfo = [];
  args.channel_list.sort(function(a, b) {
    var x = a.name.substring(1), y = b.name.substring(1);
    return x < y ? -1 : x > y ? 1 : 0;
  });
  for(var i in args.channel_list)
  {
    var channelInfo = args.channel_list[i];
    channelsInfo[channelInfo.name] = channelInfo;
  }
  $("#online-users").text(channelsInfo[selectedTab].users);
});