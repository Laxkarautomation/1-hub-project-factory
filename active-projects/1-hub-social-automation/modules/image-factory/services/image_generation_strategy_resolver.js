function cleanText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text = "", words = []) {
  const value = cleanText(text);
  return words.some(word => value.includes(cleanText(word)));
}

function detectVisualIntent(scene = {}) {
  const text = [
    scene.narration,
    scene.image_prompt || scene.prompt
  ].filter(Boolean).join(" ");

  const intents = [];

  if (hasAny(text, ["documentary", "realistic", "evidence", "case", "records", "details", "facts"])) {
    intents.push("documentary_realism");
  }

  if (hasAny(text, ["dark", "mystery", "haunted", "eerie", "shadow", "fog", "secret", "hidden", "moonlight"])) {
    intents.push("dark_mystery");
  }

  if (hasAny(text, ["village", "gaon", "rural", "temple", "lane", "road"])) {
    intents.push("rural_environment");
  }

  if (hasAny(text, ["crash", "accident", "aircraft", "rescue", "survival", "damaged", "broken"])) {
    intents.push("disaster_survival");
  }

  if (hasAny(text, ["face", "portrait", "person", "villagers", "survivors", "people", "faces"])) {
    intents.push("human_subjects");
  }

  if (!intents.length) intents.push("generic_cinematic");

  return intents;
}

function providerRankForIntent(intent = "") {
  const map = {
    documentary_realism: ["google", "cloudflare", "fal", "pollinations"],
    dark_mystery: ["cloudflare", "google", "fal", "pollinations"],
    rural_environment: ["google", "cloudflare", "pollinations", "fal"],
    disaster_survival: ["google", "fal", "cloudflare", "pollinations"],
    human_subjects: ["fal", "google", "cloudflare", "pollinations"],
    generic_cinematic: ["cloudflare", "google", "pollinations", "fal"]
  };

  return map[intent] || map.generic_cinematic;
}

function mergeProviderRanks(intents = []) {
  const scores = {};

  intents.forEach(intent => {
    const rank = providerRankForIntent(intent);
    rank.forEach((provider, index) => {
      const points = Math.max(1, 4 - index);
      scores[provider] = (scores[provider] || 0) + points;
    });
  });

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([provider, score], index) => ({
      provider,
      priority: index + 1,
      strategy_score: score
    }));
}

function buildSceneStrategy(scene = {}) {
  const intents = detectVisualIntent(scene);
  const rankedProviders = mergeProviderRanks(intents);
  const primaryProvider = rankedProviders[0]?.provider || "cloudflare";

  return {
    scene: scene.scene,
    visual_intents: intents,
    primary_provider: primaryProvider,
    fallback_providers: rankedProviders.slice(1).map(x => x.provider),
    ranked_providers: rankedProviders,
    strategy_reason: "selected_by_visual_intent_and_provider_fit",
    prompt: scene.image_prompt || scene.prompt || "",
    narration: scene.narration || ""
  };
}

function buildImageGenerationStrategyReport(script = {}) {
  const scenes = script.scenes || [];
  const strategies = scenes.map(buildSceneStrategy);

  const providerCounts = strategies.reduce((acc, item) => {
    acc[item.primary_provider] = (acc[item.primary_provider] || 0) + 1;
    return acc;
  }, {});

  const dominantProvider = Object.entries(providerCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "cloudflare";

  return {
    generated_at: new Date().toISOString(),
    script_id: script.script_id || script.scriptId,
    summary: {
      total_scenes: strategies.length,
      dominant_provider: dominantProvider,
      primary_provider_counts: providerCounts,
      status: "image_generation_strategy_resolved"
    },
    strategies
  };
}

module.exports = {
  detectVisualIntent,
  providerRankForIntent,
  mergeProviderRanks,
  buildSceneStrategy,
  buildImageGenerationStrategyReport
};
