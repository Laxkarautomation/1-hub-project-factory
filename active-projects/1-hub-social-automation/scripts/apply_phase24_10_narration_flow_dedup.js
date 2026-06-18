const fs = require("fs");

const filePath = "modules/intelligence/core/script_generator_from_brief.js";
let code = fs.readFileSync(filePath, "utf8");

code = code.replace(
`function sentence(value = "") {
  const text = cleanText(value);
  if (!text) return "";
  return /[.!?…]$/.test(text) ? text : \`\${text}.\`;
}`,
`function sentence(value = "") {
  const text = cleanText(value);
  if (!text) return "";
  return /[.!?…]$/.test(text) ? text : \`\${text}.\`;
}

function removeRepeatedTopic(text = "", topic = "") {
  const cleanTopic = cleanTopicLabel(topic);
  if (!cleanTopic) return cleanText(text);

  const escaped = cleanTopic.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
  const re = new RegExp(escaped, "gi");
  let seen = false;

  return cleanText(text).replace(re, (match) => {
    if (!seen) {
      seen = true;
      return match;
    }
    return "ye case";
  });
}

function joinFlow(primary = "", bridge = "", topic = "") {
  const first = sentence(primary);
  const second = cleanText(bridge);
  const joined = second ? \`\${first} \${second}\` : first;

  return removeRepeatedTopic(joined, topic)
    .replace(/poori direction badal deti hai\\. Ye detail poori kahani ka direction badal deti hai\\./gi, "poori kahani ka direction badal deti hai.")
    .replace(/situation serious hone lagti hai\\. Isi point par tension aur curiosity dono badhne lagte hain\\./gi, "situation serious hone lagti hai, aur curiosity badhne lagti hai.")
    .replace(/asli angle saamne aata hai\\. Yahin par samajh aata hai ki asli baat shuruaat se hi chhupi hui thi\\./gi, "asli angle saamne aata hai.")
    .replace(/\\s+/g, " ")
    .trim();
}`
);

code = code.replace(
`  if (role === "intro") {
    return cleanScene
      ? \`\${sentence(cleanScene)} Yahin se \${topic} ki kahani dheere dheere serious hone lagti hai.\`
      : \`\${topic} ki shuruaat simple lagti hai, lekin context dheere dheere serious hota hai.\`;
  }

  if (role === "escalation") {
    return cleanScene
      ? \`\${sentence(cleanScene)} Isi point par tension aur curiosity dono badhne lagte hain.\`
      : \`\${topic} me ek ke baad ek details saamne aati hain, aur situation clear hone ke bajay aur confusing banne lagti hai.\`;
  }

  if (role === "turn") {
    return cleanScene
      ? \`\${sentence(cleanScene)} Ye detail poori kahani ka direction badal deti hai.\`
      : \`Phir ek detail saamne aati hai jo \${topic} ka angle badal deti hai.\`;
  }

  if (role === "twist") {
    return cleanScene
      ? \`\${sentence(cleanScene)} Yahin par samajh aata hai ki asli baat shuruaat se hi chhupi hui thi.\`
      : \`\${topic} ka twist tab saamne aata hai jab chhupi hui detail connect hone lagti hai.\`;
  }`,
`  if (role === "intro") {
    return cleanScene
      ? joinFlow(cleanScene, "Shuruaat me kisi ko andaza nahi hota ki ye baat aage chal kar important banegi.", topic)
      : \`\${topic} ki shuruaat simple lagti hai, lekin context dheere dheere serious hota hai.\`;
  }

  if (role === "escalation") {
    return cleanScene
      ? joinFlow(cleanScene, "Ab kahani me tension aur curiosity dono badhne lagti hain.", topic)
      : \`\${topic} me ek ke baad ek details saamne aati hain, aur situation clear hone ke bajay aur confusing banne lagti hai.\`;
  }

  if (role === "turn") {
    return cleanScene
      ? joinFlow(cleanScene, "Isi clue ke baad kahani ka direction badal jata hai.", topic)
      : \`Phir ek detail saamne aati hai jo \${topic} ka angle badal deti hai.\`;
  }

  if (role === "twist") {
    return cleanScene
      ? joinFlow(cleanScene, "Jab details connect hoti hain, tab asli angle saamne aata hai.", topic)
      : \`\${topic} ka twist tab saamne aata hai jab chhupi hui detail connect hone lagti hai.\`;
  }`
);

fs.writeFileSync(filePath, code);

console.log("✅ Phase 24.10 narration flow de-dup patch applied");
console.log("Updated:", filePath);
