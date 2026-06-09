const cloudflare = require("./connectors/image/cloudflare_provider");
const google = require("./connectors/image/google_provider");
const fal = require("./connectors/image/fal_provider");

async function testProvider(name, provider) {
  const result = await provider.run({
    prompt: "Create a simple vertical social media test image."
  });

  console.log(`\n=== ${name} ===`);
  console.log(JSON.stringify(result, null, 2));

  if (
    result.success === false &&
    result.status === "provider_unavailable"
  ) {
    console.log(`✅ ${name} empty-key safe mode working`);
  }
}

async function main() {
  await testProvider("Cloudflare", cloudflare);
  await testProvider("Google", google);
  await testProvider("FAL", fal);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
