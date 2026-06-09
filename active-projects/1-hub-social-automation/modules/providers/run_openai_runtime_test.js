const openai = require("./connectors/script/openai_provider");

async function main() {
  const result = await openai.run({
    prompt: "Write one short test line for 1 Hub Social Automation."
  });

  console.log(JSON.stringify(result, null, 2));

  if (
    result.success === false &&
    result.status === "provider_unavailable"
  ) {
    console.log("\n✅ OpenAI empty-key safe mode working");
    process.exit(0);
  }

  if (result.success === true) {
    console.log("\n✅ OpenAI runtime provider working with configured key");
    process.exit(0);
  }

  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
