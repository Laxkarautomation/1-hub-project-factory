const {
  getAdminConfig,
  setRuntimeValue,
  setActiveProvider,
  addProvider,
  resetConfig
} = require("./admin_config_manager");

function print(data) {
  console.log(JSON.stringify(data, null, 2));
}

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const [key, ...rest] = item.split("=");
    args[key] = rest.join("=");
  }
  return args;
}

function main() {
  const command = process.argv[2] || "view";
  const args = parseArgs(process.argv.slice(3));

  try {
    if (command === "view") {
      print(getAdminConfig());
      return;
    }

    if (command === "reset") {
      print(resetConfig());
      return;
    }

    if (command === "set-runtime") {
      if (!args.key || typeof args.value === "undefined") {
        throw new Error("Usage: node modules/admin/run_admin_config.js set-runtime key=timeoutMs value=30000");
      }

      print(setRuntimeValue(args.key, args.value));
      return;
    }

    if (command === "set-provider") {
      if (!args.service || !args.provider) {
        throw new Error("Usage: node modules/admin/run_admin_config.js set-provider service=llm provider=mock");
      }

      print(setActiveProvider(args.service, args.provider));
      return;
    }

    if (command === "add-provider") {
      if (!args.service || !args.provider) {
        throw new Error("Usage: node modules/admin/run_admin_config.js add-provider service=llm provider=gemini type=free apiKeyRef=HUB_GEMINI_KEY model=gemini-xxxx endpoint=https://...");
      }

      print(
        addProvider(args.service, args.provider, {
          enabled: args.enabled !== "false",
          type: args.type,
          apiKeyRef: args.apiKeyRef,
          model: args.model,
          endpoint: args.endpoint,
          dailyLimit: args.dailyLimit
        })
      );
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    print({
      success: false,
      error: error.message
    });
    process.exitCode = 1;
  }
}

main();
