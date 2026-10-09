const BOARD_POINTS = [100, 200, 300, 400, 500];

// opts.board keeps each question's category and point value and allows the
// "open" type (a free response the host judges on the Big Screen). Race and
// buzzer games call this without opts, so open questions are dropped there.
// answerText is for the board's reveal step only; games never send it before
// a question closes.
function buildQuestion(raw, opts = {}) {
  if (!raw || typeof raw !== "object") return null;
  const prompt = String(raw.prompt || "").trim();
  if (!prompt) return null;
  if (raw.type === "open" && !opts.board) return null;
  const type = raw.type === "multiple-choice" ? "multiple-choice" : raw.type === "open" ? "open" : "short-answer";

  let question;
  if (type === "multiple-choice") {
    const choices = Array.isArray(raw.choices)
      ? raw.choices.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const answerIndex = Number(raw.answer);
    if (choices.length < 2 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
      return null;
    }
    question = {
      prompt, type, choices,
      answerText: choices[answerIndex],
      checkAnswer(input) { return Number(input) === answerIndex; },
    };
  } else {
    const answerRaw = String(raw.answer == null ? "" : raw.answer).trim();
    if (!answerRaw) return null;
    const answerNorm = answerRaw.toLowerCase();
    const answerNum = Number(answerRaw);
    question = {
      prompt, type, choices: null,
      answerText: answerRaw,
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

  if (opts.board) {
    question.category = String(raw.category || "").trim().slice(0, 40) || "General";
    const points = Number(raw.points);
    question.points = BOARD_POINTS.includes(points) ? points : BOARD_POINTS[0];
  }
  return question;
}

function buildQuestions(rawList, opts) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((raw) => buildQuestion(raw, opts)).filter(Boolean);
}

module.exports = { buildQuestion, buildQuestions, BOARD_POINTS };
