const { listPacks, ROOT } = require("../registry/content_pack_store");

console.log(JSON.stringify({
  success: true,
  phase: "22.1-content-pack-registry",
  storage: ROOT,
  totalPacks: listPacks().length,
  publishable: listPacks({ status: "publishable" }).length,
  scheduled: listPacks({ status: "scheduled" }).length
}, null, 2));
