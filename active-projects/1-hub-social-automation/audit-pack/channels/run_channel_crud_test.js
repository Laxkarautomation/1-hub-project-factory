const {
  createChannel,
  loadChannels
} = require("./channel_store");

const {
  setActiveChannel,
  getActiveChannelId
} = require("./active_channel_selector");

createChannel({
  channelId: "unraaz",
  name: "UNRAAZ",
  status: "active",
  platforms: ["youtube"]
});

setActiveChannel("unraaz");

console.log(
  JSON.stringify(
    {
      channels: loadChannels().channels,
      active: getActiveChannelId()
    },
    null,
    2
  )
);
