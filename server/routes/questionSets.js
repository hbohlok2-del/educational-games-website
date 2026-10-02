const express = require("express");
const { listQuestionSets, getQuestionSet, saveQuestionSet, deleteQuestionSet } = require("../content/questionSets");

const router = express.Router();

function handleDbError(res, err) {
  console.error("question-sets db error:", err.message);
  res.status(503).json({ ok: false, error: "unavailable" });
}

router.get("/", async (req, res) => {
  try {
    const sets = await listQuestionSets();
    res.json({ ok: true, sets });
  } catch (err) {
    handleDbError(res, err);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const set = await getQuestionSet(req.params.id);
    if (!set) return res.status(404).json({ ok: false, error: "not-found" });
    res.json({ ok: true, set });
  } catch (err) {
    handleDbError(res, err);
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, mechanic, theme, questions } = req.body || {};
    const saved = await saveQuestionSet({ title, mechanic, theme, questions });
    if (!saved) return res.status(400).json({ ok: false, error: "no-questions" });
    res.json({ ok: true, set: saved });
  } catch (err) {
    handleDbError(res, err);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await deleteQuestionSet(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    handleDbError(res, err);
  }
});

module.exports = router;
