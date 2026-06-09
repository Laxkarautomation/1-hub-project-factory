const gemini = require("./connectors/script/gemini_provider");

async function main() {
  const result = await gemini.run({
    prompt: "Write one short test line for 1 Hub Social Automation."
  });

  console.log(JSON.stringify(result, null, 2));

  if (
    result.success === false &&
    result.status === "provider_unavailable"
  ) {
    console.log("\n✅ Gemini empty-key safe mode working");
    process.exit(0);
  }

  if (result.success === true) {
    console.log("\n✅ Gemini runtime provider working with configured key");
    process.exit(0);
  }

  console.log("\n⚠️ Gemini runtime returned non-success status");
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
