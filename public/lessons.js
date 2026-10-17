// Lesson page: the "In this note" contents (from the lesson's headings) and
// the reading time. Other Course Notes pages have neither element.
(function () {
  "use strict";

  var body = document.getElementById("lessonBody");
  if (!body) return;

  var WORDS_PER_MINUTE = 200;

  function slug(text, used) {
    var base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
    var id = base, n = 2;
    while (used[id]) id = base + "-" + n++;
    used[id] = true;
    return id;
  }

  var headings = body.querySelectorAll("h2");
  if (headings.length) {
    var list = document.getElementById("noteToc");
    var used = {};
    Array.prototype.forEach.call(headings, function (h) {
      if (!h.id) h.id = slug(h.textContent, used);
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      list.appendChild(li);
    });
    document.getElementById("noteTocNav").classList.remove("hidden");
  }

  // Math has already been rendered by KaTeX, so count only the prose.
  var words = 0;
  Array.prototype.forEach.call(body.querySelectorAll("p, li, h2, h3"), function (el) {
    var clone = el.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll(".katex"), function (k) { k.remove(); });
    words += clone.textContent.split(/\s+/).filter(Boolean).length;
  });
  var minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

  function showReadTime() {
    document.getElementById("readTime").textContent = t("lessons.readTime", { n: minutes });
  }
  showReadTime();
  document.addEventListener("i18nchange", showReadTime);
})();
