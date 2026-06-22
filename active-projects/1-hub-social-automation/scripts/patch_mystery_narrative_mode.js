const fs = require("fs");

const file = "modules/intelligence/core/research_narrative_engine.js";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
`  if (/loan fraud|bank fraud|scam|money|transaction|risk|finance/.test(text)) return "risk_breakdown";
  if (/case|crime|investigation|murder|missing|evidence|statement/.test(text)) return "investigation_documentary";`,
`  if (/haunted|ghost|paranormal|dybbuk|scarecrow|castle|doll|house|horror/.test(text)) return "horror_mystery";
  if (/murder|death|killer|unabomber|missing|case|crime|investigation|evidence|statement/.test(text)) return "investigation_documentary";
  if (/loan fraud|bank fraud|scam|money|transaction|risk|finance/.test(text)) return "risk_breakdown";`
);

code = code.replace(
`    story_documentary: [
      { beat: "setup", purpose: "background", line: cleanTopic + " ki shuruaat ek normal context se hoti hai." },
      { beat: "conflict", purpose: "hidden problem", line: "Phir ek hidden gap kahani ko serious bana deta hai." },
      { beat: "evidence", purpose: "key detail", line: "Ek key detail poori story ka angle change karti hai." },
      { beat: "turn", purpose: "reveal", line: "Jab details connect hoti hain, kahani ka real direction saamne aata hai." },
      { beat: "takeaway", purpose: "lesson", line: "Kabhi kabhi chhoti detail hi poori story ka answer hoti hai." }
    ]`,
`    horror_mystery: [
      { beat: "setup", purpose: "haunted opening", line: cleanTopic + " ki kahani ek ajeeb aur disturbing detail se shuru hoti hai." },
      { beat: "conflict", purpose: "fear build", line: "Log ise normal kahani samajh rahe the, lekin ek pattern baar baar repeat ho raha tha." },
      { beat: "evidence", purpose: "strange clue", line: "Ek chhoti si jagah, object ya witness detail poori mystery ko serious bana deti hai." },
      { beat: "turn", purpose: "dark reveal", line: "Jab purani details connect hoti hain, kahani ka haunted angle aur strong ho jaata hai." },
      { beat: "takeaway", purpose: "open ending", line: "Aisi stories me sabse scary cheez bhoot nahi, woh unanswered detail hoti hai jo end tak clear nahi hoti." }
    ],
    story_documentary: [
      { beat: "setup", purpose: "background", line: cleanTopic + " ki shuruaat ek normal context se hoti hai." },
      { beat: "conflict", purpose: "hidden problem", line: "Phir ek hidden gap kahani ko serious bana deta hai." },
      { beat: "evidence", purpose: "key detail", line: "Ek key detail poori story ka angle change karti hai." },
      { beat: "turn", purpose: "reveal", line: "Jab details connect hoti hain, kahani ka real direction saamne aata hai." },
      { beat: "takeaway", purpose: "lesson", line: "Kabhi kabhi chhoti detail hi poori story ka answer hoti hai." }
    ]`
);

code = code.replace(
`  if (mode === "risk_breakdown") {
    return "Is case ka lesson simple hai: financial decision me risk signal ko kabhi ignore nahi karna chahiye.";
  }`,
`  if (mode === "risk_breakdown") {
    return "Is case ka lesson simple hai: financial decision me risk signal ko kabhi ignore nahi karna chahiye.";
  }

  if (mode === "horror_mystery") {
    return "Aisi stories me asli डर us unanswered detail me hota hai jo end tak explain nahi hoti.";
  }`
);

fs.writeFileSync(file, code);
console.log("✅ Patched mystery narrative mode");
