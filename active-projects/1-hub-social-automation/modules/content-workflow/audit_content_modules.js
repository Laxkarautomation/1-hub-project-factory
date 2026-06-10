const fs = require("fs");
const path = require("path");
const { STAGES } = require("./workflow_stage_registry");

const ROOT = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function audit() {
  const report = {
    success: true,
    phase: "13-content-workflow-engine-audit",
    root: ROOT,
    generatedAt: new Date().toISOString(),
    stages: STAGES.map(stage => {
      const found = stage.candidates.filter(exists);
      return {
        key: stage.key,
        name: stage.name,
        ready: found.length > 0,
        selectedRunner: found[0] || null,
        candidates: stage.candidates,
        found
      };
    })
  };

  report.readyStages = report.stages.filter(s => s.ready).length;
  report.totalStages = report.stages.length;
  report.workflowReady = report.readyStages === report.totalStages;

  fs.mkdirSync(path.join(ROOT, "storage/reports/content-workflow"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "storage/reports/content-workflow/phase13_audit_report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log(JSON.stringify(report, null, 2));
}

audit();
