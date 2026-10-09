const express = require("express");
const { listQuestionSets, getQuestionSet, saveQuestionSet, updateQuestionSet, deleteQuestionSet } = require("../content/questionSets");
const { requireTeacher } = require("../teacherAuth");

function handleDbError(res, err) {
  console.error("question-sets db error:", err.message);
  res.status(503).json({ ok: false, error: "unavailable" });
}

// launchers: { race, buzzer, board } createRoom functions from the game modules,
// so a saved quiz can become a live room without its answers ever leaving
// the server.
const GAME_TYPES = { race: "team-race", buzzer: "team-buzzer", board: "team-board" };

function createQuestionSetsRouter({ launchers }) {
  const router = express.Router();

  // Public: titles and counts only, never questions or answers.
  router.get("/", async (req, res) => {
    try {
      const sets = await listQuestionSets();
      res.json({ ok: true, sets });
    } catch (err) {
      handleDbError(res, err);
    }
  });

  // Teachers only: confirms the passcode before the dashboard uses it.
  router.post("/check-passcode", requireTeacher, (req, res) => {
    res.json({ ok: true });
  });

  // Public: start a fresh room from a saved quiz. Only the room code and
  // game type come back.
  router.post("/:id/launch", async (req, res) => {
    try {
      const set = await getQuestionSet(req.params.id);
      if (!set) return res.status(404).json({ ok: false, error: "not-found" });
      const mechanic = launchers[set.mechanic] ? set.mechanic : "race";
      const room = launchers[mechanic]({ title: set.title, theme: set.theme, questions: set.questions, settings: set.settings });
      if (!room) return res.status(400).json({ ok: false, error: "no-questions" });
      res.json({ ok: true, gameType: GAME_TYPES[mechanic], code: room.code });
    } catch (err) {
      handleDbError(res, err);
    }
  });

  // Teachers only from here on: these expose answers or change the library.
  router.get("/:id", requireTeacher, async (req, res) => {
    try {
      const set = await getQuestionSet(req.params.id);
      if (!set) return res.status(404).json({ ok: false, error: "not-found" });
      res.json({ ok: true, set });
    } catch (err) {
      handleDbError(res, err);
    }
  });

  router.post("/", requireTeacher, async (req, res) => {
    try {
      const { title, mechanic, theme, questions, settings } = req.body || {};
      const saved = await saveQuestionSet({ title, mechanic, theme, questions, settings });
      if (!saved) return res.status(400).json({ ok: false, error: "no-questions" });
      res.json({ ok: true, set: saved });
    } catch (err) {
      handleDbError(res, err);
    }
  });

  router.put("/:id", requireTeacher, async (req, res) => {
    try {
      const { title, mechanic, theme, questions, settings } = req.body || {};
      const updated = await updateQuestionSet(req.params.id, { title, mechanic, theme, questions, settings });
      if (!updated) return res.status(404).json({ ok: false, error: "not-found" });
      res.json({ ok: true, set: updated });
    } catch (err) {
      handleDbError(res, err);
    }
  });

  router.delete("/:id", requireTeacher, async (req, res) => {
    try {
      await deleteQuestionSet(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      handleDbError(res, err);
    }
  });

  return router;
}

module.exports = { createQuestionSetsRouter };
