(function () {
  "use strict";

  var socket = io("/team-race");
  var qId = 0;

  function $(id) { return document.getElementById(id); }
  var questionList = $("questionList");
  var rowTpl = $("questionRowTpl");

  var TEMPLATES = [
    { label: "Fraction", text: "$\\frac{a}{b}$", selStart: 7, selEnd: 8 },
    { label: "Exponent", text: "$x^{n}$", selStart: 1, selEnd: 2 },
    { label: "Square root", text: "$\\sqrt{x}$", selStart: 7, selEnd: 8 },
    { label: "Chemistry", text: "$\\ce{H2O}$", selStart: 5, selEnd: 8 },
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
      row.querySelector(".q-num").textContent = "Question " + (i + 1);
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
    renumber();

    var toolbar = rowEl.querySelector(".toolbar");
    var promptInput = rowEl.querySelector(".prompt-input");
    var preview = rowEl.querySelector(".preview");

    TEMPLATES.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "tb-btn"; b.textContent = t.label;
      b.addEventListener("click", function () { insertTemplate(promptInput, t); });
      toolbar.appendChild(b);
    });

    var previewTimer = null;
    function schedulePreview() {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(function () {
        preview.textContent = promptInput.value || "Preview will appear here";
        renderMathIn(preview);
      }, 150);
    }
    promptInput.addEventListener("input", schedulePreview);

    var typeRadios = rowEl.querySelectorAll('input[name="type"]');
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
        '<input class="choice-text text-input" placeholder="Choice text">' +
        '<button type="button" class="remove-choice">&times;</button>';
      wrap.querySelector(".remove-choice").addEventListener("click", function () { wrap.remove(); });
      choicesWrap.appendChild(wrap);
    }
    rowEl.querySelector(".add-choice").addEventListener("click", addChoice);
    addChoice();
    addChoice();

    Array.prototype.forEach.call(typeRadios, function (r) {
      r.addEventListener("change", function () {
        var isMc = rowEl.querySelector('input[name="type"]:checked').value === "multiple-choice";
        shortFields.classList.toggle("hidden", isMc);
        mcFields.classList.toggle("hidden", !isMc);
      });
    });

    rowEl.querySelector(".remove-q").addEventListener("click", function () {
      rowEl.remove();
      renumber();
    });
  }

  $("addQuestion").addEventListener("click", addQuestionRow);
  addQuestionRow();

  function collectQuestions() {
    var out = [];
    var errors = [];
    Array.prototype.forEach.call(questionList.querySelectorAll(".q-row"), function (row, i) {
      var prompt = row.querySelector(".prompt-input").value.trim();
      var type = row.querySelector('input[name="type"]:checked').value;
      if (!prompt) { errors.push("Question " + (i + 1) + " needs text."); return; }
      if (type === "multiple-choice") {
        var choices = [];
        var correctIdx = -1;
        Array.prototype.forEach.call(row.querySelectorAll(".choice-row"), function (cr) {
          var text = cr.querySelector(".choice-text").value.trim();
          if (!text) return;
          if (cr.querySelector(".choice-correct").checked) correctIdx = choices.length;
          choices.push(text);
        });
        if (choices.length < 2) { errors.push("Question " + (i + 1) + " needs at least 2 choices."); return; }
        if (correctIdx === -1) { errors.push("Question " + (i + 1) + ": mark which choice is correct."); return; }
        out.push({ prompt: prompt, type: "multiple-choice", choices: choices, answer: correctIdx });
      } else {
        var answer = row.querySelector(".answer-input").value.trim();
        if (!answer) { errors.push("Question " + (i + 1) + " needs a correct answer."); return; }
        out.push({ prompt: prompt, type: "short-answer", answer: answer });
      }
    });
    return { out: out, errors: errors };
  }

  $("createGo").addEventListener("click", function () {
    var errEl = $("createErr");
    errEl.textContent = "";
    var title = $("titleInput").value.trim();
    var res = collectQuestions();
    if (!res.out.length) { errEl.textContent = "Add at least one complete question."; return; }
    if (res.errors.length) { errEl.textContent = res.errors[0]; return; }

    $("createGo").disabled = true;
    socket.emit("create-room", { title: title, questions: res.out }, function (ack) {
      $("createGo").disabled = false;
      if (!ack || !ack.ok) { errEl.textContent = (ack && ack.error) || "Couldn't create the room."; return; }
      $("doneCode").textContent = ack.room.code;
      var joinBase = location.origin + "/games/team-race/";
      $("doneLink").textContent = joinBase;
      $("openStudentView").href = joinBase + "?code=" + ack.room.code;
      $("formView").classList.add("hidden");
      $("doneView").classList.remove("hidden");
    });
  });

  $("createAnother").addEventListener("click", function () {
    location.reload();
  });
})();
