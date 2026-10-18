const crypto = require("crypto");
const { client } = require("../db");
const { buildQuestions, cleanBoardSettings, cleanRallySettings } = require("./questions");

function requireClient() {
  if (!client) throw new Error("database unavailable");
  return client;
}

const MECHANICS = ["race", "buzzer", "board", "rally"];

function cleanMechanic(mechanic) {
  return MECHANICS.includes(mechanic) ? mechanic : "race";
}

// A rally keeps its word, clues and minutes; the other games their board
// settings (time per question, penalty). Quizzes saved before the team count
// moved to launch time may still carry teams; it pre-selects the launch choice.
function cleanSettings(mechanic, settings) {
  return mechanic === "rally" ? cleanRallySettings(settings) : cleanBoardSettings(settings);
}

// New saves leave the team count out: it is chosen each time the quiz is played.
function settingsToStore(mechanic, settings) {
  const cleaned = cleanSettings(mechanic, settings);
  delete cleaned.teams;
  return cleaned;
}

function parseSettings(text, mechanic) {
  try { return cleanSettings(mechanic, JSON.parse(text || "{}")); } catch (e) { return cleanSettings(mechanic, null); }
}

function questionOpts(mech) {
  return { board: mech === "board", rally: mech === "rally" };
}

async function listQuestionSets() {
  const result = await requireClient().execute(
    "SELECT id, title, mechanic, theme, questions, settings, created_at FROM question_sets ORDER BY created_at DESC"
  );
  return result.rows.map((row) => {
    const set = {
      id: row.id,
      title: row.title,
      mechanic: row.mechanic,
      theme: row.theme,
      questionCount: JSON.parse(row.questions).length,
      createdAt: row.created_at,
    };
    const teams = parseSettings(row.settings, row.mechanic).teams;
    if (teams) set.teams = teams;
    return set;
  });
}

async function getQuestionSet(id) {
  const result = await requireClient().execute({
    sql: "SELECT id, title, mechanic, theme, questions, settings, created_at FROM question_sets WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    title: row.title,
    mechanic: row.mechanic,
    theme: row.theme,
    questions: JSON.parse(row.questions),
    settings: parseSettings(row.settings, row.mechanic),
    createdAt: row.created_at,
  };
}

async function saveQuestionSet({ title, mechanic, theme, questions, settings }) {
  const cleanTitle = String(title || "").trim().slice(0, 80) || "Untitled quiz";
  const mech = cleanMechanic(mechanic);
  const cleanTheme = String(theme || "").trim() || "rope";
  const validated = buildQuestions(questions, questionOpts(mech));
  if (validated.length < 1) return null;
  const cleaned = settingsToStore(mech, settings);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await requireClient().execute({
    sql: "INSERT INTO question_sets (id, title, mechanic, theme, questions, settings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, cleanTitle, mech, cleanTheme, JSON.stringify(questions), JSON.stringify(cleaned), createdAt],
  });
  return { id, title: cleanTitle, mechanic: mech, theme: cleanTheme, settings: cleaned, questionCount: validated.length, createdAt };
}

async function updateQuestionSet(id, { title, mechanic, theme, questions, settings }) {
  const cleanTitle = String(title || "").trim().slice(0, 80) || "Untitled quiz";
  const mech = cleanMechanic(mechanic);
  const cleanTheme = String(theme || "").trim() || "rope";
  const validated = buildQuestions(questions, questionOpts(mech));
  if (validated.length < 1) return null;
  const cleaned = settingsToStore(mech, settings);

  const result = await requireClient().execute({
    sql: "UPDATE question_sets SET title = ?, mechanic = ?, theme = ?, questions = ?, settings = ? WHERE id = ?",
    args: [cleanTitle, mech, cleanTheme, JSON.stringify(questions), JSON.stringify(cleaned), id],
  });
  if (result.rowsAffected === 0) return null;
  return { id, title: cleanTitle, mechanic: mech, theme: cleanTheme, settings: cleaned, questionCount: validated.length };
}

async function deleteQuestionSet(id) {
  await requireClient().execute({ sql: "DELETE FROM question_sets WHERE id = ?", args: [id] });
}

module.exports = { listQuestionSets, getQuestionSet, saveQuestionSet, updateQuestionSet, deleteQuestionSet };
