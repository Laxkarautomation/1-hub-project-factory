const fs = require("fs");
const outputRouter = require("./channel_output_router");

const paths = outputRouter.getAllOutputPaths("router_test_script");

Object.entries(paths).forEach(([key, value]) => {
  if (key !== "channelId") {
    fs.mkdirSync(value, { recursive: true });
  }
});

console.log(JSON.stringify({
  success: true,
  phase: "10.3-channel-output-routing-layer",
  router: paths,
}, null, 2));
