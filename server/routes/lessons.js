const express = require("express");
const lessons = require("../content/lessons");

const router = express.Router();

function renderPage(res, status, view, locals) {
  res.status(status).render(view, locals, (err, innerHtml) => {
    if (err) {
      res.status(500).send("Something went wrong rendering this page.");
      return;
    }
    res.render("layout", { ...locals, body: innerHtml }, (layoutErr, page) => {
      if (layoutErr) {
        res.status(500).send("Something went wrong rendering this page.");
        return;
      }
      res.send(page);
    });
  });
}

router.get("/", (req, res) => {
  const subjects = lessons.listSubjects();
  renderPage(res, 200, "lessons/index", { title: "Course Notes", subjects });
});

router.get("/:subject", (req, res) => {
  const { subject } = req.params;
  const list = lessons.listLessons(subject);
  if (!list) {
    renderPage(res, 404, "lessons/not-found", { title: "Not found" });
    return;
  }
  renderPage(res, 200, "lessons/subject", { title: subject, subject, lessons: list });
});

router.get("/:subject/:slug", (req, res) => {
  const { subject, slug } = req.params;
  const lesson = lessons.getLesson(subject, slug);
  if (!lesson) {
    renderPage(res, 404, "lessons/not-found", { title: "Not found" });
    return;
  }
  renderPage(res, 200, "lessons/lesson", { title: lesson.title, subject, lesson });
});

module.exports = router;
