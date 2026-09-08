function buildQuestion(raw) {
  if (!raw || typeof raw !== "object") return null;
  const prompt = String(raw.prompt || "").trim();
  if (!prompt) return null;
  const type = raw.type === "multiple-choice" ? "multiple-choice" : "short-answer";

  if (type === "multiple-choice") {
    const choices = Array.isArray(raw.choices)
      ? raw.choices.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const answerIndex = Number(raw.answer);
    if (choices.length < 2 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
      return null;
    }
    return {
      prompt, type, choices,
      checkAnswer(input) { return Number(input) === answerIndex; },
    };
  }

  const answerRaw = String(raw.answer == null ? "" : raw.answer).trim();
  if (!answerRaw) return null;
  const answerNorm = answerRaw.toLowerCase();
  const answerNum = Number(answerRaw);
  return {
    prompt, type, choices: null,
    checkAnswer(input) {
      const val = String(input == null ? "" : input).trim();
      if (!val) return false;
      if (Number.isFinite(answerNum)) {
        const v = Number(val);
        if (Number.isFinite(v)) return v === answerNum;
      }
      return val.toLowerCase() === answerNorm;
    },
  };
}

function buildQuestions(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(buildQuestion).filter(Boolean);
}

module.exports = { buildQuestion, buildQuestions };
