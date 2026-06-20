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

const VOICE_PROFILES = {
  mystery_storyteller: {
    id: "mystery_storyteller",
    providerPreference: ["edge_tts", "cloudflare_tts"],
    voiceGender: "male",
    language: "hi-IN",
    pace: "slow_medium",
    speedMultiplier: 0.94,
    pitchShift: -2,
    energy: "medium_low",
    emotionBase: "suspense",
    useCase: "dark mystery, haunted, suspense storytelling"
  },
  dark_documentary: {
    id: "dark_documentary",
    providerPreference: ["edge_tts", "cloudflare_tts"],
    voiceGender: "male",
    language: "hi-IN",
    pace: "medium",
    speedMultiplier: 0.98,
    pitchShift: -1,
    energy: "medium",
    emotionBase: "serious",
    useCase: "documentary, factual narration, real incident"
  },
  scam_explainer: {
    id: "scam_explainer",
    providerPreference: ["edge_tts", "cloudflare_tts"],
    voiceGender: "male",
    language: "hi-IN",
    pace: "medium_fast",
    speedMultiplier: 1.04,
    pitchShift: 0,
    energy: "medium_high",
    emotionBase: "alert",
    useCase: "fraud, scam, money lessons"
  },
  survival_narrator: {
    id: "survival_narrator",
    providerPreference: ["edge_tts", "cloudflare_tts"],
    voiceGender: "male",
    language: "hi-IN",
    pace: "medium",
    speedMultiplier: 0.97,
    pitchShift: -1,
    energy: "medium_high",
    emotionBase: "tension",
    useCase: "accident, disaster, survival"
  },
  neutral_narrator: {
    id: "neutral_narrator",
    providerPreference: ["edge_tts", "cloudflare_tts"],
    voiceGender: "male",
    language: "hi-IN",
    pace: "medium",
    speedMultiplier: 1,
    pitchShift: 0,
    energy: "medium",
    emotionBase: "neutral",
    useCase: "generic narration"
  }
};

function detectVoiceIntent(script = {}) {
  const text = [
    script.title,
    script.caption,
    ...(script.scenes || []).map(scene => scene.narration)
  ].filter(Boolean).join(" ");

  const intents = [];

  if (hasAny(text, ["haunted", "darr", "darte", "mystery", "raaz", "hidden", "secret", "moonlight", "andhera"])) {
    intents.push("mystery");
  }

  if (hasAny(text, ["facts", "details", "case", "records", "documentary", "incident", "available"])) {
    intents.push("documentary");
  }

  if (hasAny(text, ["scam", "fraud", "money", "loan", "bank", "financial", "paise"])) {
    intents.push("scam_money");
  }

  if (hasAny(text, ["accident", "crash", "survival", "rescue", "bachne", "disaster"])) {
    intents.push("survival");
  }

  if (!intents.length) intents.push("generic");

  return intents;
}

function resolveVoiceProfile(script = {}) {
  const intents = detectVoiceIntent(script);

  let profileId = "neutral_narrator";

  if (intents.includes("mystery")) profileId = "mystery_storyteller";
  else if (intents.includes("survival")) profileId = "survival_narrator";
  else if (intents.includes("scam_money")) profileId = "scam_explainer";
  else if (intents.includes("documentary")) profileId = "dark_documentary";

  const profile = VOICE_PROFILES[profileId] || VOICE_PROFILES.neutral_narrator;

  return {
    script_id: script.script_id || script.scriptId,
    title: script.title || "",
    detected_intents: intents,
    selected_profile: profileId,
    profile,
    status: "voice_profile_resolved"
  };
}

function buildVoiceProfileReport(scripts = []) {
  const profiles = scripts.map(resolveVoiceProfile);

  const profileCounts = profiles.reduce((acc, item) => {
    acc[item.selected_profile] = (acc[item.selected_profile] || 0) + 1;
    return acc;
  }, {});

  return {
    generated_at: new Date().toISOString(),
    total_scripts: profiles.length,
    profile_counts: profileCounts,
    status: "voice_profiles_resolved",
    profiles
  };
}

module.exports = {
  VOICE_PROFILES,
  detectVoiceIntent,
  resolveVoiceProfile,
  buildVoiceProfileReport
};
