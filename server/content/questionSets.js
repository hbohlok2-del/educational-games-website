const crypto = require("crypto");
const { client } = require("../db");
const { buildQuestions } = require("./questions");

function requireClient() {
  if (!client) throw new Error("database unavailable");
  return client;
}

async function listQuestionSets() {
  const result = await requireClient().execute(
    "SELECT id, title, mechanic, theme, questions, created_at FROM question_sets ORDER BY created_at DESC"
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    mechanic: row.mechanic,
    theme: row.theme,
    questionCount: JSON.parse(row.questions).length,
    createdAt: row.created_at,
  }));
}

async function getQuestionSet(id) {
  const result = await requireClient().execute({
    sql: "SELECT id, title, mechanic, theme, questions, created_at FROM question_sets WHERE id = ?",
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
    createdAt: row.created_at,
  };
}

async function saveQuestionSet({ title, mechanic, theme, questions }) {
  const cleanTitle = String(title || "").trim().slice(0, 80) || "Untitled quiz";
  const cleanMechanic = mechanic === "buzzer" ? "buzzer" : "race";
  const cleanTheme = String(theme || "").trim() || "rope";
  const validated = buildQuestions(questions);
  if (validated.length < 1) return null;

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await requireClient().execute({
    sql: "INSERT INTO question_sets (id, title, mechanic, theme, questions, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, cleanTitle, cleanMechanic, cleanTheme, JSON.stringify(questions), createdAt],
  });
  return { id, title: cleanTitle, mechanic: cleanMechanic, theme: cleanTheme, questionCount: validated.length, createdAt };
}

async function deleteQuestionSet(id) {
  await requireClient().execute({ sql: "DELETE FROM question_sets WHERE id = ?", args: [id] });
}

module.exports = { listQuestionSets, getQuestionSet, saveQuestionSet, deleteQuestionSet };
