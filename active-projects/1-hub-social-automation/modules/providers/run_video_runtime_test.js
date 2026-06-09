const fal = require("./connectors/video/fal_video_provider");
const runway = require("./connectors/video/runway_provider");
const remotion = require("./connectors/video/remotion_provider");

async function testProvider(name, provider) {
  const result = await provider.run({
    script: "Test short video"
  });

  console.log(`\n=== ${name} ===`);
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  await testProvider("FAL Video", fal);
  await testProvider("Runway", runway);
  await testProvider("Remotion", remotion);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
