const BOARD_POINTS = [100, 200, 300, 400, 500];
const BOARD_TIME_LIMITS = [15, 30, 45, 60, 90, 120]; // seconds per question
const DEFAULT_TIME_LIMIT = 30;
const TEAM_COUNTS = [2, 4];
// Rally: the secret word sets the number of stations, one letter each.
const RALLY_MIN_STATIONS = 3;
const RALLY_MAX_STATIONS = 12;
const RALLY_MAX_PER_STATION = 5;
const RALLY_MINUTES = [10, 15, 20, 30];
const RALLY_DEFAULT_MINUTES = 20;

// Game settings, shared by live rooms and saved quizzes. Unknown keys are
// dropped; an unlisted time falls back to the default. The team count is
// kept only when it is 2 or 4, so a quiz saved before the choice existed
// leaves it out and each game applies its own default.
function cleanBoardSettings(settings) {
  const timeLimit = Number(settings && settings.timeLimit);
  const teams = Number(settings && settings.teams);
  const cleaned = {
    penalty: !!(settings && settings.penalty),
    timeLimit: BOARD_TIME_LIMITS.includes(timeLimit) ? timeLimit : DEFAULT_TIME_LIMIT,
  };
  if (TEAM_COUNTS.includes(teams)) cleaned.teams = teams;
  return cleaned;
}

// Rally settings: team count, time limit, the secret word and an optional
// clue per station. The word keeps letters only (any alphabet), upper-cased.
function cleanRallySettings(settings) {
  const s = settings || {};
  const teams = Number(s.teams);
  const minutes = Number(s.minutes);
  const word = Array.from(String(s.word || "").toLocaleUpperCase()).filter((ch) => /\p{L}/u.test(ch)).slice(0, RALLY_MAX_STATIONS).join("");
  const clues = Array.isArray(s.clues) ? s.clues.slice(0, RALLY_MAX_STATIONS).map((c) => String(c == null ? "" : c).trim().slice(0, 140)) : [];
  const cleaned = { minutes: RALLY_MINUTES.includes(minutes) ? minutes : RALLY_DEFAULT_MINUTES, word, clues };
  if (TEAM_COUNTS.includes(teams)) cleaned.teams = teams;
  return cleaned;
}

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

  if (opts.rally) {
    const station = Number(raw.station);
    question.station = Number.isInteger(station) && station >= 0 && station < RALLY_MAX_STATIONS ? station : 0;
    question.hint = String(raw.hint || "").trim().slice(0, 200);
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

module.exports = {
  buildQuestion, buildQuestions, cleanBoardSettings, cleanRallySettings,
  BOARD_POINTS, BOARD_TIME_LIMITS, DEFAULT_TIME_LIMIT, TEAM_COUNTS,
  RALLY_MIN_STATIONS, RALLY_MAX_STATIONS, RALLY_MAX_PER_STATION, RALLY_MINUTES, RALLY_DEFAULT_MINUTES,
};
