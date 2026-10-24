const BOARD_POINTS = [100, 200, 300, 400, 500];
const BOARD_TIME_LIMITS = [15, 30, 45, 60, 90, 120]; // seconds per question
const DEFAULT_TIME_LIMIT = 30;
const TEAM_COUNTS = [2, 3, 4];
// Rally: the secret word sets the number of stations, one letter each.
const RALLY_MIN_STATIONS = 3;
const RALLY_MAX_STATIONS = 12;
const RALLY_MAX_PER_STATION = 5;
const RALLY_MINUTES = [10, 15, 20, 30];
const RALLY_DEFAULT_MINUTES = 20;
// Escape Room: the vault code sets the rooms, one digit each.
const ESCAPE_MIN_ROOMS = 2;
const ESCAPE_MAX_ROOMS = 8;
const ESCAPE_MAX_PER_ROOM = 5;
const PUZZLE_TYPES = ["expression", "order", "match", "graph"];
const ESCAPE_TYPES = ["short-answer", "multiple-choice"].concat(PUZZLE_TYPES);
const MathExpr = require("../../public/shared/mathExpr");

// Game settings, shared by live rooms and saved quizzes. Unknown keys are
// dropped; an unlisted time falls back to the default. The team count is
// kept only when it is 2, 3 or 4, so a quiz saved before the choice existed
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

// Escape Room settings: team count, time limit, the vault code (digits only,
// one room per digit) and an optional name and story line per room.
function cleanEscapeSettings(settings) {
  const s = settings || {};
  const teams = Number(s.teams);
  const minutes = Number(s.minutes);
  const code = String(s.code || "").replace(/\D/g, "").slice(0, ESCAPE_MAX_ROOMS);
  const rawRooms = Array.isArray(s.rooms) ? s.rooms : [];
  const rooms = Array.from(code).map((_, i) => {
    const r = rawRooms[i] || {};
    return { name: String(r.name == null ? "" : r.name).trim().slice(0, 40), story: String(r.story == null ? "" : r.story).trim().slice(0, 240) };
  });
  const cleaned = { minutes: RALLY_MINUTES.includes(minutes) ? minutes : RALLY_DEFAULT_MINUTES, code, rooms };
  if (TEAM_COUNTS.includes(teams)) cleaned.teams = teams;
  return cleaned;
}

// A random order of 0..n-1 that is never the identity, so a puzzle is never
// already solved when it appears.
function shuffledOrder(n) {
  const order = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return order;
  do {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (order.every((v, i) => v === i));
  return order;
}

function cleanList(list, max, len) {
  return Array.isArray(list) ? list.map((v) => String(v == null ? "" : v).trim().slice(0, len)).filter(Boolean).slice(0, max) : [];
}

function parseIndexList(input, n) {
  const parts = String(input == null ? "" : input).split(",").map((v) => Number(v));
  return parts.length === n && parts.every((v) => Number.isInteger(v) && v >= 0 && v < n) ? parts : null;
}

// The interactive puzzle types, escape rooms only. Each keeps what the
// device may see in `view`; the answer stays in checkAnswer.
function buildPuzzle(raw, type, prompt) {
  if (type === "expression") {
    const answer = String(raw.answer == null ? "" : raw.answer).trim().slice(0, 200);
    const parsed = MathExpr.parse(answer);
    if (!parsed.ok) return null;
    return { prompt, type, choices: null, answerText: answer, view: {}, checkAnswer: (input) => MathExpr.equivalent(String(input || ""), parsed) };
  }
  if (type === "order") {
    const items = cleanList(raw.items, 6, 120);
    if (items.length < 3) return null;
    const order = shuffledOrder(items.length); // shown position -> original index
    return {
      prompt, type, choices: null, answerText: items.join(" → "),
      view: { items: order.map((i) => items[i]) },
      checkAnswer(input) {
        const picked = parseIndexList(input, items.length);
        return !!picked && picked.every((pos, k) => order[pos] === k);
      },
    };
  }
  if (type === "match") {
    const pairs = (Array.isArray(raw.pairs) ? raw.pairs : [])
      .map((p) => ({ left: String((p && p.left) || "").trim().slice(0, 120), right: String((p && p.right) || "").trim().slice(0, 120) }))
      .filter((p) => p.left && p.right).slice(0, 5);
    if (pairs.length < 2) return null;
    const order = shuffledOrder(pairs.length); // right column: shown position -> pair index
    return {
      prompt, type, choices: null, answerText: pairs.map((p) => p.left + " = " + p.right).join("; "),
      view: { left: pairs.map((p) => p.left), right: order.map((i) => pairs[i].right) },
      checkAnswer(input) {
        const picked = parseIndexList(input, pairs.length);
        return !!picked && new Set(picked).size === pairs.length && picked.every((pos, i) => order[pos] === i);
      },
    };
  }
  if (type === "graph") {
    const fn = String(raw.fn == null ? "" : raw.fn).trim().slice(0, 200);
    const parsed = MathExpr.parse(fn);
    let xmin = Number(raw.xmin), xmax = Number(raw.xmax);
    if (!Number.isFinite(xmin)) xmin = -5;
    if (!Number.isFinite(xmax)) xmax = 5;
    const targets = String(raw.answer == null ? "" : raw.answer).split(/[,;]/).map((v) => Number(v.trim())).filter((v) => Number.isFinite(v));
    if (!parsed.ok || xmax <= xmin || !targets.length || targets.some((v) => v < xmin || v > xmax)) return null;
    const tol = Number(raw.tolerance) > 0 ? Math.min(Number(raw.tolerance), (xmax - xmin) / 4) : (xmax - xmin) / 40;
    return {
      prompt, type, choices: null, answerText: targets.join(", "),
      view: { fn, xmin, xmax, slope: raw.slope !== false },
      checkAnswer(input) {
        const v = Number(input);
        return Number.isFinite(v) && targets.some((x) => Math.abs(v - x) <= tol);
      },
    };
  }
  return null;
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
  if (opts.escape && PUZZLE_TYPES.includes(raw.type)) {
    const puzzle = buildPuzzle(raw, raw.type, prompt);
    if (!puzzle) return null;
    return withEscapeFields(puzzle, raw);
  }
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
  if (opts.escape) {
    // A whole-number answer is opened with padlock dials, one per digit.
    const n = Number(question.answerText);
    question.view = type === "short-answer" && Number.isInteger(n) && Math.abs(n) < 1e7 ? { lock: { digits: String(Math.abs(n)).length } } : {};
    withEscapeFields(question, raw);
  }
  return question;
}

function withEscapeFields(question, raw) {
  const room = Number(raw.room);
  question.room = Number.isInteger(room) && room >= 0 && room < ESCAPE_MAX_ROOMS ? room : 0;
  question.hint = String(raw.hint || "").trim().slice(0, 200);
  return question;
}

function buildQuestions(rawList, opts) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((raw) => buildQuestion(raw, opts)).filter(Boolean);
}

module.exports = {
  buildQuestion, buildQuestions, cleanBoardSettings, cleanRallySettings, cleanEscapeSettings,
  BOARD_POINTS, BOARD_TIME_LIMITS, DEFAULT_TIME_LIMIT, TEAM_COUNTS,
  RALLY_MIN_STATIONS, RALLY_MAX_STATIONS, RALLY_MAX_PER_STATION, RALLY_MINUTES, RALLY_DEFAULT_MINUTES,
  ESCAPE_MIN_ROOMS, ESCAPE_MAX_ROOMS, ESCAPE_MAX_PER_ROOM, ESCAPE_TYPES,
};
