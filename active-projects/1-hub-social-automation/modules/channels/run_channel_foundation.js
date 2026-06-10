const { loadChannelRegistry } = require("./channel_registry");
const { getActiveChannelId } = require("./active_channel_selector");
const { loadActiveChannelConfig } = require("./channel_config_loader");

function runChannelFoundation() {
  const registry = loadChannelRegistry();
  const activeChannel = getActiveChannelId();
  const activeConfig = loadActiveChannelConfig();

  const report = {
    success: true,
    phase: "10.0-channel-management-foundation",
    registry: {
      success: registry.success,
      totalChannels: registry.totalChannels || 0,
      activeChannels: registry.activeChannels || 0
    },
    activeChannel,
    activeConfig
  };

  console.log(JSON.stringify(report, null, 2));
}

runChannelFoundation();
