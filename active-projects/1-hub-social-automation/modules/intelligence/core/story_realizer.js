function clean(value = "") {
  return String(value || "").trim();
}

function topicTitle(topic = "") {
  return clean(topic).replace(/_/g, " ").replace(/\s+/g, " ");
}

function realizeStory(context = {}) {
  const topic = topicTitle(context.topic || "story");
  const location = clean(context.location_context || "ek jagah");
  const tension = clean(context.central_tension || "ek ajeeb problem");
  const detail = clean(context.trigger_detail || "ek chhoti detail");
  const evidence = clean(context.evidence_object || "ek purana record");
  const escalation1 = clean(context.escalation_stage_1 || "pehli detail ignore ho gayi");
  const escalation2 = clean(context.escalation_stage_2 || "dusri detail ne doubt badha diya");
  const escalation3 = clean(context.escalation_stage_3 || "teesri detail ne asli angle khol diya");
  const twist = clean(context.twist_source || "ek purana connection");
  const atmosphere = clean(context.atmosphere || "serious");

  return {
    hook: `${topic} me ek aisi baat chhupi thi jise pehle kisi ne seriously nahi liya...`,
    setup: `Shuruaat ${location} se hoti hai, jahan sab kuch normal lag raha tha. Lekin mahaul me ek ${atmosphere} feeling dheere dheere banne lagi.`,
    conflict: `Phir ${tension} ka angle saamne aaya. ${escalation1}. Logon ko laga ye bas ek normal baat hai, lekin details match nahi ho rahi thi.`,
    clue: `Isi beech ${detail} se judi ek chhoti si information mili. Uske baad ${evidence} par sabki nazar gayi.`,
    escalation: `${escalation2}. Phir ${escalation3}. Yahin se kahani simple incident se serious mystery banne lagi.`,
    twist: `Jab ye sab details connect hui, to ${twist} se ek unexpected link nikla. Yahin se poori kahani ka asli angle saamne aaya.`,
    lesson: `${topic} hume ye yaad dilata hai ki kabhi kabhi sabse chhoti detail hi sabse bada sach chhupa kar rakhti hai.`
  };
}

module.exports = {
  realizeStory
};
