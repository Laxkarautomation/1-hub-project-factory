const provisioner = require("./channel_storage_provisioner");

const result = provisioner.ensureChannelStorage();

const success = result.created.every((item) => item.exists === true);

console.log(JSON.stringify({
  success,
  phase: "10.4-channel-storage-provisioning-layer",
  channelId: result.channelId,
  created: result.created,
}, null, 2));

if (!success) {
  process.exit(1);
}
