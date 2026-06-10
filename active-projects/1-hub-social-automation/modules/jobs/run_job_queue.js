const {
  createJob,
  listJobs,
  getJob,
  cancelJob,
  queueSummary,
  resetRunningJobs
} = require("./core/job_queue_manager");

function print(data) {
  console.log(JSON.stringify(data, null, 2));
}

function parseArgs(argv) {
  const args = {};
  for (const item of argv) {
    const [key, ...rest] = item.split("=");
    args[key] = rest.join("=");
  }
  return args;
}

function main() {
  const command = process.argv[2] || "summary";
  const args = parseArgs(process.argv.slice(3));

  if (command === "summary") {
    print({
      success: true,
      summary: queueSummary()
    });
    return;
  }

  if (command === "list") {
    print({
      success: true,
      jobs: listJobs(args)
    });
    return;
  }

  if (command === "get") {
    print({
      success: true,
      job: getJob(args.id)
    });
    return;
  }

  if (command === "create") {
    const payload = args.payload ? JSON.parse(args.payload) : {};

    print({
      success: true,
      job: createJob({
        type: args.type || "system_test",
        channelId: args.channelId || null,
        providerService: args.providerService || null,
        payload,
        priority: args.priority ? Number(args.priority) : 5
      })
    });
    return;
  }

  if (command === "cancel") {
    print({
      success: true,
      job: cancelJob(args.id)
    });
    return;
  }

  if (command === "reset-running") {
    print(resetRunningJobs());
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  print({
    success: false,
    error: error.message
  });
  process.exitCode = 1;
}
