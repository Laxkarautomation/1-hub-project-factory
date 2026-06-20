const fs = require("fs");

const filePath = "modules/intelligence/core/topic_archetype_library.js";
let code = fs.readFileSync(filePath, "utf8");

const replacements = [
  [
    `location: ["old fort", "ancient temple", "forgotten palace"],
    tension: ["sealed record", "missing page", "forgotten event"],
    trigger: ["old diary", "hidden room", "archaeology note"],
    evidence: ["sealed document", "carved symbol", "archive file"],
    twist: ["forgotten history", "royal secret", "buried truth"]`,
    `location: ["old fort", "ancient temple", "forgotten palace", "ruined haveli", "abandoned archive room", "buried stepwell", "old museum basement", "royal courtyard", "forgotten tunnel", "ancient library"],
    tension: ["sealed record", "missing page", "forgotten event", "erased royal note", "hidden inscription", "unexplained date mismatch", "lost witness account", "forbidden family record", "buried political secret", "broken timeline"],
    trigger: ["old diary", "hidden room", "archaeology note", "dusty map", "restored photograph", "temple wall marking", "museum register", "forgotten letter", "broken statue clue", "archival stamp"],
    evidence: ["sealed document", "carved symbol", "archive file", "old coin", "faded photograph", "royal seal", "land record", "temple inscription", "newspaper cutting", "handwritten register"],
    twist: ["forgotten history", "royal secret", "buried truth", "wrongly recorded event", "hidden heir angle", "erased betrayal", "political cover-up", "misread legend", "lost identity", "truth hidden in public"]`
  ],
  [
    `location: ["small town police station", "quiet street", "old case file room"],
    tension: ["timeline mismatch", "conflicting witness statement", "missing evidence"],
    trigger: ["phone record", "anonymous call", "last seen detail"],
    evidence: ["case file", "witness note", "forensic report"],
    twist: ["hidden suspect", "false witness", "old case connection"]`,
    `location: ["small town police station", "quiet street", "old case file room", "closed shop lane", "bus stand corner", "empty apartment corridor", "district court hallway", "railway platform", "abandoned warehouse", "hospital waiting area"],
    tension: ["timeline mismatch", "conflicting witness statement", "missing evidence", "changed statement", "unanswered phone call", "wrong location detail", "deleted message", "last-minute alibi", "silent witness", "unmatched CCTV timing"],
    trigger: ["phone record", "anonymous call", "last seen detail", "CCTV clip", "missed call log", "neighbour statement", "half-burnt note", "changed route", "old complaint copy", "late night message"],
    evidence: ["case file", "witness note", "forensic report", "CCTV timestamp", "call detail record", "vehicle entry slip", "blood-stained cloth", "police diary page", "location ping", "unsigned statement"],
    twist: ["hidden suspect", "false witness", "old case connection", "planned alibi", "family angle", "wrong victim assumption", "fake accident theory", "trusted person betrayal", "suppressed complaint", "motive revealed late"]`
  ],
  [
    `location: ["small Indian village", "empty village road", "old village house"],
    tension: ["sudden disappearance", "strange village rumour", "silent local witness"],
    trigger: ["old letter", "locked room", "late night sound"],
    evidence: ["muddy footprint", "handwritten note", "broken object"],
    twist: ["family secret", "hidden local dispute", "forgotten promise"]`,
    `location: ["small Indian village", "empty village road", "old village house", "abandoned well", "village temple courtyard", "kaccha road near fields", "closed panchayat room", "old banyan tree", "deserted school building", "lonely farm hut"],
    tension: ["sudden disappearance", "strange village rumour", "silent local witness", "forbidden local story", "night-time fear", "family silence", "land dispute pressure", "unknown visitor", "hidden village warning", "ritual-like pattern"],
    trigger: ["old letter", "locked room", "late night sound", "missing cattle clue", "temple bell at midnight", "unknown footprint", "panchayat register entry", "broken lantern", "field boundary mark", "childhood rumour"],
    evidence: ["muddy footprint", "handwritten note", "broken object", "old land paper", "village register", "red cloth piece", "rusted key", "charcoal mark", "hidden photograph", "forgotten complaint"],
    twist: ["family secret", "hidden local dispute", "forgotten promise", "land ownership truth", "fake ghost story", "old revenge", "panchayat cover-up", "relationship hidden for years", "fear used as weapon", "truth known by one elder"]`
  ],
  [
    `location: ["small office", "local market", "family business room"],
    tension: ["greed-driven decision", "hidden financial pressure", "trust mistake"],
    trigger: ["signed paper", "missed warning", "cash transaction"],
    evidence: ["bank slip", "old receipt", "written agreement"],
    twist: ["trusted person angle", "hidden debt", "wrong calculation"]`,
    `location: ["small office", "local market", "family business room", "loan desk", "shop backroom", "property dealer office", "cash counter", "bank branch waiting area", "warehouse cabin", "tea stall negotiation"],
    tension: ["greed-driven decision", "hidden financial pressure", "trust mistake", "shortcut temptation", "fake profit promise", "ignored risk", "family money pressure", "wrong advice", "overconfidence trap", "unverified deal"],
    trigger: ["signed paper", "missed warning", "cash transaction", "loan promise", "advance payment", "blank cheque", "WhatsApp screenshot", "property token receipt", "friendly guarantee", "urgent deadline"],
    evidence: ["bank slip", "old receipt", "written agreement", "cheque copy", "loan statement", "payment screenshot", "stamp paper", "ledger entry", "voice note", "signed guarantee"],
    twist: ["trusted person angle", "hidden debt", "wrong calculation", "fake partnership", "greed masked as opportunity", "one clause trap", "family member risk", "delayed loss reveal", "paperwork loophole", "small mistake became disaster"]`
  ]
];

for (const [oldText, newText] of replacements) {
  if (!code.includes(oldText)) {
    throw new Error("Expected vocabulary block not found");
  }
  code = code.replace(oldText, newText);
}

fs.writeFileSync(filePath, code);

console.log("✅ Phase 24.15 archetype variation engine applied");
console.log("Updated:", filePath);
