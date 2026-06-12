const {
  validateTelegramProvider,
  checkTelegramConnection
} = require("./providers/telegram/telegram_real_publisher");

async function main() {
  const providerId =
    process.argv.find((arg) => arg.startsWith("--provider="))?.split("=")[1] ||
    "telegram_bot_api";

  const live = process.argv.includes("--live");

  const validation = await validateTelegramProvider(providerId);
  const connection = await checkTelegramConnection(providerId, {
    safeMode: !live
  });

  console.log(JSON.stringify({
    success: validation.success && connection.success,
    validation,
    connection
  }, null, 2));

  process.exit(validation.success && connection.success ? 0 : 1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error.message,
    stack: error.stack
  }, null, 2));
  process.exit(1);
});
