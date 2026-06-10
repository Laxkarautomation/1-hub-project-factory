const fs = require("fs");

const file = "run_pipeline.js";
let code = fs.readFileSync(file, "utf8");

if (code.includes("runAdminRuntimePreflight")) {
  console.log("Admin preflight hook already exists. No changes made.");
  process.exit(0);
}

const requireLine = `const { runAdminRuntimePreflight } = require("./modules/pipeline/preflight/admin_runtime_preflight");\n`;

code = requireLine + code;

const hook = `
function runPhase11AdminPreflightGate() {
  const preflight = runAdminRuntimePreflight();

  console.log(JSON.stringify({
    phase: "11-admin-runtime-pipeline-preflight",
    success: preflight.success,
    activeChannelId: preflight.activeChannelId,
    errors: preflight.errors,
    warnings: preflight.warnings
  }, null, 2));

  if (!preflight.success) {
    throw new Error("Admin runtime preflight failed. Fix admin/channel/provider config before pipeline run.");
  }

  return preflight;
}

runPhase11AdminPreflightGate();

`;

const asyncMainMatch = code.match(/async function main\s*\(/);
const functionMainMatch = code.match(/function main\s*\(/);

if (asyncMainMatch || functionMainMatch) {
  const index = asyncMainMatch ? asyncMainMatch.index : functionMainMatch.index;
  code = code.slice(0, index) + hook + code.slice(index);
} else {
  code = code + "\n" + hook;
}

fs.writeFileSync(file, code);
console.log("Admin preflight hook added to run_pipeline.js");
