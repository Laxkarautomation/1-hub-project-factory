const fs = require("fs");

const filePath = "modules/intelligence/core/script_generator_from_brief.js";

let code = fs.readFileSync(filePath, "utf8");

code = code.replace(
`function cleanText(value = "") {
  return String(value || "").trim();
}`,
`function cleanText(value = "") {
  return String(value || "").trim();
}

function cleanTopicLabel(value = "") {
  return cleanText(value)
    .replace(/_/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function stripTemplateLanguage(scene = "", topic = "") {
  let text = cleanTopicLabel(scene);
  const cleanTopic = cleanTopicLabel(topic);

  if (cleanTopic && text.toLowerCase().startsWith(cleanTopic.toLowerCase())) {
    text = text.slice(cleanTopic.length).trim();
  }

  return text
    .replace(/opening context based on story/gi, "shuruaat me sab kuch normal lagta hai")
    .replace(/connection with/gi, "iska connection")
    .replace(/escalation or key development/gi, "phir ek important development saamne aata hai")
    .replace(/twist, reveal, or important insight/gi, "lekin asli twist tab saamne aata hai")
    .replace(/audience takeaway/gi, "is kahani ka sabse bada lesson")
    .replace(/main context/gi, "main story")
    .replace(/\\s+/g, " ")
    .trim();
}

function sentence(value = "") {
  const text = cleanText(value);
  if (!text) return "";
  return /[.!?…]$/.test(text) ? text : \`\${text}.\`;
}`
);

code = code.replace(
`function buildLineFromScene(scene, role, brief) {
  const topic = cleanText(brief.topic);
  const cleanScene = cleanText(scene);

  if (role === "intro") {
    return cleanScene
      ? \`\${cleanScene}. Yahin se \${topic} ki story shuru hoti hai.\`
      : \`\${topic} ki shuruaat simple lagti hai, lekin context dheere dheere serious hota hai.\`;
  }

  if (role === "escalation") {
    return cleanScene
      ? \`\${cleanScene}. Isi point par story me tension aur curiosity dono badhne lagte hain.\`
      : \`\${topic} me ek ke baad ek details saamne aati hain, aur situation clear hone ke bajay aur confusing banne lagti hai.\`;
  }

  if (role === "turn") {
    return cleanScene
      ? \`\${cleanScene}. Ye detail poori story ka direction badal deti hai.\`
      : \`Phir ek detail saamne aati hai jo \${topic} ka angle badal deti hai.\`;
  }

  if (role === "twist") {
    return cleanScene
      ? \`\${cleanScene}. Yahin par samajh aata hai ki asli baat shuruaat se hi chhupi hui thi.\`
      : \`\${topic} ka twist tab samne aata hai jab chhupi hui detail connect hone lagti hai.\`;
  }

  return cleanScene || \`\${topic} ka important takeaway audience ke saamne aata hai.\`;
}`,
`function buildLineFromScene(scene, role, brief) {
  const topic = cleanTopicLabel(brief.topic);
  const cleanScene = stripTemplateLanguage(scene, topic);

  if (role === "intro") {
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
  }

  return cleanScene
    ? sentence(cleanScene)
    : \`\${topic} ka important takeaway audience ke saamne aata hai.\`;
}`
);

fs.writeFileSync(filePath, code);

console.log("✅ Phase 24.8 narration polishing patch applied");
console.log("Updated:", filePath);
