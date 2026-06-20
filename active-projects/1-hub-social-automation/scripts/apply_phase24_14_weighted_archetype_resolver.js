const fs = require("fs");

const filePath = "modules/intelligence/core/topic_archetype_library.js";
let code = fs.readFileSync(filePath, "utf8");

const oldBlock = `function scoreArchetype(archetype, topic = "", channel = {}) {
  const haystack = [
    topic,
    channel.contentMode,
    ...toList(channel.contentCategories),
    ...toList(channel.contentPillars),
    ...toList(channel.topicKeywords)
  ].map(normalize).join(" ");

  return archetype.match.reduce((score, term) => {
    const normalized = normalize(term);
    if (!normalized) return score;
    return score + (haystack.includes(normalized) ? 5 : 0);
  }, 0);
}`;

const newBlock = `function scoreAgainstSource(matchTerms = [], sourceText = "", weight = 1) {
  const haystack = normalize(sourceText);

  return matchTerms.reduce((score, term) => {
    const normalized = normalize(term);
    if (!normalized) return score;
    return score + (haystack.includes(normalized) ? weight : 0);
  }, 0);
}

function scoreArchetype(archetype, topic = "", channel = {}) {
  const matchTerms = archetype.match || [];

  return [
    scoreAgainstSource(matchTerms, topic, 100),
    scoreAgainstSource(matchTerms, toList(channel.contentCategories).join(" "), 30),
    scoreAgainstSource(matchTerms, toList(channel.contentPillars).join(" "), 20),
    scoreAgainstSource(matchTerms, toList(channel.topicKeywords).join(" "), 10),
    scoreAgainstSource(matchTerms, channel.contentMode, 5)
  ].reduce((total, score) => total + score, 0);
}`;

if (!code.includes(oldBlock)) {
  throw new Error("Expected scoreArchetype block not found");
}

code = code.replace(oldBlock, newBlock);
fs.writeFileSync(filePath, code);

console.log("✅ Phase 24.14 weighted archetype resolver applied");
console.log("Updated:", filePath);
