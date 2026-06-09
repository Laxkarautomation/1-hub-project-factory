function pickTop(items = [], count = 5) {
  return items.slice(0, count);
}

function buildRecommendedTopics({ patterns = [], gaps = [], formulas = [] }) {
  const topPatterns = pickTop(patterns, 3).map(item => item.pattern);
  const topGaps = pickTop(gaps, 5).map(item => item.topic);
  const topFormula = formulas[0]?.formula || "REAL INCIDENT → BUILDUP → TWIST → LESSON";

  return topGaps.map((gap, index) => ({
    rank: index + 1,
    topic: gap,
    reason: `Matches patterns: ${topPatterns.join(", ")}`,
    suggested_formula: topFormula
  }));
}

function buildHookSuggestions(patterns = []) {
  const names = patterns.map(item => item.pattern);

  const hooks = [];

  if (names.includes("real_story")) {
    hooks.push("Ye kahani sach hai, lekin iska twist kisi film se kam nahi...");
  }

  if (names.includes("horror")) {
    hooks.push("Raat ke andhere me jo hua, uska jawab aaj tak nahi mila...");
  }

  if (names.includes("true_crime")) {
    hooks.push("Ek normal din, ek galat decision, aur phir sab kuch badal gaya...");
  }

  if (names.includes("mystery")) {
    hooks.push("Saboot mile, gawah mile, lekin sach aaj bhi adhoora hai...");
  }

  return hooks.slice(0, 6);
}

function buildTitleSuggestions(topics = []) {
  return topics.map(item => ({
    topic: item.topic,
    titles: [
      `${item.topic}: ek sachchi kahani jise log bhool gaye`,
      `${item.topic} ka woh raaz jo aaj bhi clear nahi hua`,
      `${item.topic}: real incident, shocking twist`
    ]
  }));
}

module.exports = {
  buildRecommendedTopics,
  buildHookSuggestions,
  buildTitleSuggestions
};
