function extractHooks(title = "") {
  const hooks = [];
  const text = title.toLowerCase();

  if (title.includes("?")) hooks.push("question_hook");
  if (/\d+/.test(title)) hooks.push("number_hook");
  if (/secret|hidden|unknown/.test(text)) hooks.push("secret_hook");
  if (/dark|horror|terrifying|scary|dangerous|death/.test(text)) hooks.push("fear_hook");
  if (/mystery|mysterious|unsolved|missing|strange/.test(text)) hooks.push("mystery_hook");
  if (/real|true|truth/.test(text)) hooks.push("truth_hook");

  return hooks;
}

function buildHookSummary(videos = []) {
  const counts = {};

  for (const video of videos) {
    for (const hook of video.hooks || []) {
      counts[hook] = (counts[hook] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([hook, count]) => ({ hook, count }))
    .sort((a, b) => b.count - a.count);
}

module.exports = { extractHooks, buildHookSummary };
