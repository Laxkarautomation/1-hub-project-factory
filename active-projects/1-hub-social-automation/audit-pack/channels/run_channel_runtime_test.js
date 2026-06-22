const { resolveChannelRuntime } = require("./channel_runtime_resolver");

console.log(
  JSON.stringify(
    {
      activeRuntime: resolveChannelRuntime(),
      explicitRuntime: resolveChannelRuntime("unraaz")
    },
    null,
    2
  )
);
