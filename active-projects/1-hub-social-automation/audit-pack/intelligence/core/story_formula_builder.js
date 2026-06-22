function buildStoryFormulas(videos = []) {
  const formulas = [];

  for (const video of videos.slice(0,100)) {
    const title = (video.title || "").toLowerCase();

    if (title.includes("real")) {
      formulas.push("REAL INCIDENT → BUILDUP → TWIST → LESSON");
    }

    if (title.includes("crime")) {
      formulas.push("CRIME → INVESTIGATION → REVEAL");
    }

    if (
      title.includes("haunted") ||
      title.includes("horror")
    ) {
      formulas.push("NORMAL EVENT → FEAR → PARANORMAL TWIST");
    }

    if (
      title.includes("mystery") ||
      title.includes("unsolved")
    ) {
      formulas.push("QUESTION → CLUES → UNKNOWN ENDING");
    }
  }

  const counts = {};

  for (const formula of formulas) {
    counts[formula] = (counts[formula] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([formula,count]) => ({
      formula,
      count
    }))
    .sort((a,b) => b.count - a.count);
}

module.exports = {
  buildStoryFormulas
};
