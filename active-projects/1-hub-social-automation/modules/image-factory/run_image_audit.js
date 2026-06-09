const fs = require("fs");
const path = require("path");
const { auditImageStatus } = require("./services/audit_image_status");

const scriptId = process.argv[2];

if (!scriptId) {
  console.error("Usage: node modules/image-factory/run_image_audit.js research_script_001");
  process.exit(1);
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const script = manifest.find(item => item.script_id === scriptId);

if (!script) {
  console.error("Script not found:", scriptId);
  process.exit(1);
}

const audit = auditImageStatus(script);

const outputPath = path.join(
  process.cwd(),
  "modules/image-factory/output",
  `${scriptId}_image_status.json`
);

fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2));

console.log(`Image audit saved: ${outputPath}`);
console.table(audit.map(x => ({
  scene: x.scene,
  status: x.status,
  size: x.size_bytes
})));
