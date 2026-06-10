const { executeWithAdminFallback } = require("./providers/admin_fallback_executor");

async function main() {
  const result = await executeWithAdminFallback(
    "llm",
    {
      mock: async ({ provider, payload }) => {
        return {
          success: true,
          provider: provider.name,
          text: `Mock LLM response for: ${payload.prompt || "empty prompt"}`
        };
      }
    },
    {
      prompt: "Admin provider fallback test"
    }
  );

  console.log(JSON.stringify({
    success: result.success,
    phase: "11-admin-fallback-executor-test",
    result
  }, null, 2));

  if (!result.success) process.exitCode = 1;
}

main().catch((error) => {
  console.log(JSON.stringify({
    success: false,
    error: error.message
  }, null, 2));

  process.exitCode = 1;
});
