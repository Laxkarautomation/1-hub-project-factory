const cloudflare = require("./connectors/audio/cloudflare_tts_provider");
const openai = require("./connectors/audio/openai_tts_provider");
const elevenlabs = require("./connectors/audio/elevenlabs_provider");

async function testProvider(name, provider) {
  const result = await provider.run({
    text: "This is a test audio generation request."
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
  await testProvider("Cloudflare TTS", cloudflare);
  await testProvider("OpenAI TTS", openai);
  await testProvider("ElevenLabs", elevenlabs);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
