(function () {
  "use strict";

  var socketRace = io("/team-race");
  var socketBuzzer = io("/team-buzzer");
  var qId = 0;
  var selectedMechanic = "race";
  var selectedTheme = "rope";
  var loadedSetId = null;

  var THEME_IDS_BY_MECHANIC = {
    race: [
      { id: "rope", icon: "🪢", key: "teacher.themes.rope" },
      { id: "rocket", icon: "🚀", key: "teacher.themes.rocket" },
    ],
    buzzer: [
      { id: "spotlight", icon: "🔔", key: "teacher.themes.spotlight" },
    ],
  };

  function $(id) { return document.getElementById(id); }
  var questionList = $("questionList");
  var rowTpl = $("questionRowTpl");

  function renderThemePick() {
    var wrap = $("themePick");
    wrap.innerHTML = "";
    THEME_IDS_BY_MECHANIC[selectedMechanic].forEach(function (theme, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "theme-btn" + (i === 0 ? " active" : "");
      b.setAttribute("data-theme-id", theme.id);
      b.innerHTML = theme.icon + "<span>" + t(theme.key) + "</span>";
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(wrap.querySelectorAll(".theme-btn"), function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        selectedTheme = theme.id;
      });
      wrap.appendChild(b);
    });
    selectedTheme = THEME_IDS_BY_MECHANIC[selectedMechanic][0].id;
  }
  renderThemePick();

  Array.prototype.forEach.call($("mechanicPick").querySelectorAll(".theme-btn"), function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call($("mechanicPick").querySelectorAll(".theme-btn"), function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      selectedMechanic = b.getAttribute("data-mechanic");
      renderThemePick();
    });
  });

  var TEMPLATES = [
    { key: "teacher.templates.fraction", text: "$\\frac{a}{b}$", selStart: 7, selEnd: 8 },
    { key: "teacher.templates.exponent", text: "$x^{n}$", selStart: 1, selEnd: 2 },
    { key: "teacher.templates.squareRoot", text: "$\\sqrt{x}$", selStart: 7, selEnd: 8 },
    { key: "teacher.templates.chemistry", text: "$\\ce{H2O}$", selStart: 5, selEnd: 8 },
  ];

  function insertTemplate(ta, tpl) {
    var start = ta.selectionStart, end = ta.selectionEnd;
    var before = ta.value.slice(0, start), after = ta.value.slice(end);
    ta.value = before + tpl.text + after;
    var newStart = start + tpl.selStart, newEnd = start + tpl.selEnd;
    ta.focus();
    ta.setSelectionRange(newStart, newEnd);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function renumber() {
    Array.prototype.forEach.call(questionList.querySelectorAll(".q-row"), function (row, i) {
      row.querySelector(".q-num").textContent = t("teacher.q.numbered", { n: i + 1 });
    });
  }

  function addQuestionRow() {
    qId++;
    var id = qId;
    var frag = rowTpl.content.cloneNode(true);
    var row = frag.querySelector(".q-row");
    row.dataset.id = id;
    questionList.appendChild(frag);
    var rowEl = questionList.lastElementChild;
    Array.prototype.forEach.call(rowEl.querySelectorAll('input[name="type"]'), function (r) {
      r.name = "type-" + id;
    });
    applyStaticI18n(rowEl);
    renumber();

    var toolbar = rowEl.querySelector(".toolbar");
    var promptInput = rowEl.querySelector(".prompt-input");
    var preview = rowEl.querySelector(".preview");

    TEMPLATES.forEach(function (tpl) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "tb-btn"; b.textContent = t(tpl.key);
      b.addEventListener("click", function () { insertTemplate(promptInput, tpl); });
      toolbar.appendChild(b);
    });

    var previewTimer = null;
    function schedulePreview() {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(function () {
        preview.textContent = promptInput.value || t("teacher.q.previewPlaceholder");
        renderMathIn(preview);
      }, 150);
    }
    promptInput.addEventListener("input", schedulePreview);

    var typeRadios = rowEl.querySelectorAll('.type-row input[type="radio"]');
    var shortFields = rowEl.querySelector(".short-answer-fields");
    var mcFields = rowEl.querySelector(".mc-fields");
    var choicesWrap = rowEl.querySelector(".choices");
    var choiceCount = 0;

    function addChoice() {
      choiceCount++;
      var wrap = document.createElement("div");
      wrap.className = "choice-row";
      wrap.innerHTML =
        '<input type="radio" name="correct-' + id + '" class="choice-correct">' +
        '<input class="choice-text text-input" placeholder="' + t("teacher.q.choiceTextPlaceholder") + '">' +
        '<button type="button" class="remove-choice">&times;</button>';
      wrap.querySelector(".remove-choice").addEventListener("click", function () { wrap.remove(); });
      choicesWrap.appendChild(wrap);
    }
    rowEl.querySelector(".add-choice").addEventListener("click", addChoice);
    addChoice();
    addChoice();

    Array.prototype.forEach.call(typeRadios, function (r) {
      r.addEventListener("change", function () {
        var isMc = rowEl.querySelector('.type-row input[type="radio"]:checked').value === "multiple-choice";
        shortFields.classList.toggle("hidden", isMc);
        mcFields.classList.toggle("hidden", !isMc);
      });
    });

    rowEl.querySelector(".remove-q").addEventListener("click", function () {
      rowEl.remove();
      renumber();
    });

    return rowEl;
  }

  $("addQuestion").addEventListener("click", addQuestionRow);
  addQuestionRow();

  function collectQuestions() {
    var out = [];
    var errors = [];
    Array.prototype.forEach.call(questionList.querySelectorAll(".q-row"), function (row, i) {
      var prompt = row.querySelector(".prompt-input").value.trim();
      var n = i + 1;
      var type = row.querySelector('.type-row input[type="radio"]:checked').value;
      if (!prompt) { errors.push(t("teacher.err.questionNeedsText", { n: n })); return; }
      if (type === "multiple-choice") {
        var choices = [];
        var correctIdx = -1;
        Array.prototype.forEach.call(row.querySelectorAll(".choice-row"), function (cr) {
          var text = cr.querySelector(".choice-text").value.trim();
          if (!text) return;
          if (cr.querySelector(".choice-correct").checked) correctIdx = choices.length;
          choices.push(text);
        });
        if (choices.length < 2) { errors.push(t("teacher.err.questionNeedsChoices", { n: n })); return; }
        if (correctIdx === -1) { errors.push(t("teacher.err.questionNeedsCorrectChoice", { n: n })); return; }
        out.push({ prompt: prompt, type: "multiple-choice", choices: choices, answer: correctIdx });
      } else {
        var answer = row.querySelector(".answer-input").value.trim();
        if (!answer) { errors.push(t("teacher.err.questionNeedsAnswer", { n: n })); return; }
        out.push({ prompt: prompt, type: "short-answer", answer: answer });
      }
    });
    return { out: out, errors: errors };
  }

  function updateBuzzerHint() {
    $("buzzerHint").classList.toggle("hidden", selectedMechanic !== "buzzer");
  }

  wireCopyButton($("copyCode"), function () { return $("doneCode").textContent; });

  $("createGo").addEventListener("click", function () {
    var errEl = $("createErr");
    errEl.textContent = "";
    var title = $("titleInput").value.trim();
    var res = collectQuestions();
    if (res.errors.length) { errEl.textContent = res.errors[0]; return; }
    if (!res.out.length) { errEl.textContent = t("teacher.err.needOneQuestion"); return; }

    $("createGo").disabled = true;
    var socket = selectedMechanic === "buzzer" ? socketBuzzer : socketRace;
    socket.emit("create-room", { title: title, theme: selectedTheme, questions: res.out }, function (ack) {
      $("createGo").disabled = false;
      if (!ack || !ack.ok) { errEl.textContent = (ack && ack.error) ? tError(ack.error) : t("teacher.err.createFailed"); return; }
      $("doneCode").textContent = ack.room.code;
      var joinBase = location.origin + "/games/" + (selectedMechanic === "buzzer" ? "team-buzzer" : "team-race") + "/";
      $("doneLede").textContent = t("teacher.done.lede", { link: joinBase });
      $("openStudentView").href = joinBase + "?code=" + ack.room.code;
      updateBuzzerHint();
      $("formView").classList.add("hidden");
      $("doneView").classList.remove("hidden");
    });
  });

  $("createAnother").addEventListener("click", function () {
    location.reload();
  });

  // ---------------- Saved-quiz library ----------------
  function updateSaveButtonLabel() {
    $("saveQuiz").textContent = t(loadedSetId ? "teacher.library.updateButton" : "teacher.library.saveButton");
  }

  function loadSet(set) {
    loadedSetId = set.id;
    updateSaveButtonLabel();
    $("titleInput").value = set.title || "";

    var mechBtn = $("mechanicPick").querySelector('[data-mechanic="' + set.mechanic + '"]');
    if (mechBtn) mechBtn.click();

    var themeBtn = $("themePick").querySelector('[data-theme-id="' + set.theme + '"]');
    if (themeBtn) themeBtn.click();

    questionList.innerHTML = "";
    (set.questions || []).forEach(function (q) {
      var rowEl = addQuestionRow();
      var promptInput = rowEl.querySelector(".prompt-input");
      promptInput.value = q.prompt || "";
      promptInput.dispatchEvent(new Event("input", { bubbles: true }));

      var typeRadio = rowEl.querySelector('.type-row input[value="' + q.type + '"]');
      if (typeRadio) {
        typeRadio.checked = true;
        typeRadio.dispatchEvent(new Event("change", { bubbles: true }));
      }

      if (q.type === "multiple-choice") {
        var choicesWrap = rowEl.querySelector(".choices");
        choicesWrap.innerHTML = "";
        var addBtn = rowEl.querySelector(".add-choice");
        (q.choices || []).forEach(function () { addBtn.click(); });
        var choiceRows = choicesWrap.querySelectorAll(".choice-row");
        (q.choices || []).forEach(function (choiceText, idx) {
          var cr = choiceRows[idx];
          if (!cr) return;
          cr.querySelector(".choice-text").value = choiceText;
          if (idx === q.answer) cr.querySelector(".choice-correct").checked = true;
        });
      } else {
        rowEl.querySelector(".answer-input").value = q.answer || "";
      }
    });

    $("libraryPanel").classList.add("hidden");
  }

  function renderLibraryList(sets) {
    var list = $("libraryList");
    list.innerHTML = "";
    if (!sets.length) {
      var empty = document.createElement("p");
      empty.className = "lede";
      empty.textContent = t("teacher.library.empty");
      list.appendChild(empty);
      return;
    }
    sets.forEach(function (set) {
      var row = document.createElement("div");
      row.className = "library-row";

      var info = document.createElement("div");
      info.className = "library-info";
      var title = document.createElement("span");
      title.className = "library-title";
      title.textContent = set.title;
      var meta = document.createElement("span");
      meta.className = "library-meta";
      meta.textContent = t(set.questionCount === 1 ? "teacher.library.questionSingular" : "teacher.library.questionPlural", { n: set.questionCount });
      info.appendChild(title);
      info.appendChild(meta);

      var actions = document.createElement("div");
      actions.className = "library-actions";
      var loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "btn small";
      loadBtn.textContent = t("teacher.library.load");
      loadBtn.addEventListener("click", function () {
        fetch("/api/question-sets/" + set.id)
          .then(function (r) { return r.json(); })
          .then(function (data) { if (data.ok) loadSet(data.set); });
      });
      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "remove-q";
      delBtn.title = t("teacher.library.delete");
      delBtn.textContent = "×";
      delBtn.addEventListener("click", function () {
        fetch("/api/question-sets/" + set.id, { method: "DELETE" }).then(openLibrary);
      });
      actions.appendChild(loadBtn);
      actions.appendChild(delBtn);

      row.appendChild(info);
      row.appendChild(actions);
      list.appendChild(row);
    });
  }

  function openLibrary() {
    $("libraryPanel").classList.remove("hidden");
    $("libraryList").textContent = "";
    fetch("/api/question-sets")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) { $("libraryList").textContent = t("teacher.library.unavailable"); return; }
        renderLibraryList(data.sets);
      })
      .catch(function () { $("libraryList").textContent = t("teacher.library.unavailable"); });
  }

  $("openLibrary").addEventListener("click", openLibrary);
  $("closeLibrary").addEventListener("click", function () { $("libraryPanel").classList.add("hidden"); });

  $("saveQuiz").addEventListener("click", function () {
    var errEl = $("createErr");
    var res = collectQuestions();
    if (res.errors.length) { errEl.textContent = res.errors[0]; return; }
    if (!res.out.length) { errEl.textContent = t("teacher.err.needOneQuestion"); return; }
    errEl.textContent = "";

    var isUpdate = !!loadedSetId;
    var url = isUpdate ? "/api/question-sets/" + loadedSetId : "/api/question-sets";

    fetch(url, {
      method: isUpdate ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: $("titleInput").value.trim(), mechanic: selectedMechanic, theme: selectedTheme, questions: res.out }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) { errEl.textContent = t("teacher.library.unavailable"); return; }
        if (!isUpdate) loadedSetId = data.set.id;
        var btn = $("saveQuiz");
        btn.textContent = t(isUpdate ? "teacher.library.updated" : "teacher.library.saved");
        setTimeout(updateSaveButtonLabel, 1500);
      })
      .catch(function () { errEl.textContent = t("teacher.library.unavailable"); });
  });

  document.addEventListener("i18nchange", function () {
    renumber();
    renderThemePick();
    updateSaveButtonLabel();
  });
})();
