const { loadProviderConfig } = require("./runtime/provider_config_store");
const { loadProviderKeys } = require("./runtime/provider_key_store");
const { selectActiveProvider } = require("./runtime/active_provider_selector");
const { selectActiveKey } = require("./runtime/active_key_selector");
const { rotateProviderKey } = require("./runtime/key_rotation_engine");

function print(title, data) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(data, null, 2));
}

function main() {
  print("Provider Config Store", loadProviderConfig());
  print("Provider Key Store", loadProviderKeys());

  print("Select Script Provider", selectActiveProvider("script"));
  print("Select Image Provider", selectActiveProvider("image"));
  print("Select Audio Provider", selectActiveProvider("audio"));
  print("Select Video Provider", selectActiveProvider("video"));

  print("Select Gemini Key", selectActiveKey("gemini"));
  print("Rotate Gemini Key", rotateProviderKey("gemini"));
  print("Rotate Template Keyless Provider", rotateProviderKey("template"));
}

main();
