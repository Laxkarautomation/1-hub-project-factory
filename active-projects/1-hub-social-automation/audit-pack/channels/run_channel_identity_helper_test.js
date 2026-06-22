const {
  getActiveChannelIdentity,
  buildChannelSequenceId,
} = require("./channel_identity_helper");

const identity = getActiveChannelIdentity();

console.log(JSON.stringify({
  success: true,
  phase: "10.7-channel-identity-helper",
  identity,
  samples: {
    script: buildChannelSequenceId("script", 0),
    idea: buildChannelSequenceId("idea", 0),
    content: buildChannelSequenceId("content", 0),
  },
}, null, 2));
