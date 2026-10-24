(function () {
  "use strict";

  var socketRace = io("/team-race");
  var socketBuzzer = io("/team-buzzer");
  var socketBoard = io("/team-board");
  var socketRally = io("/team-rally");
  var socketEscape = io("/team-escape");
  var SOCKETS = { race: socketRace, buzzer: socketBuzzer, board: socketBoard, rally: socketRally, escape: socketEscape };
  var GAME_PATHS = { race: "team-race", buzzer: "team-buzzer", board: "team-board", rally: "team-rally", escape: "team-escape" };
  var RALLY_MAX_PER_STATION = 5;
  var ESCAPE_MAX_PER_ROOM = 5;
  // Escape-only puzzle types, with the fields block each one shows.
  var PUZZLE_FIELDS = { order: ".order-fields", match: ".match-fields", graph: ".graph-fields" };
  var qId = 0;
  var selectedMechanic = "race";
  var selectedTheme = "rope";
  var loadedSetId = null;

  // Theme tile icons: inline SVG drawn in the current text color.
  function svgIcon(paths) {
    return '<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' + paths + "</svg>";
  }
  var ICONS = {
    rope: svgIcon('<path d="M3 17c4-3 7 3 11 0s7-3 11 0"/><circle cx="4" cy="17" r="2" fill="currentColor"/><circle cx="28" cy="17" r="2" fill="currentColor"/>'),
    rocket: svgIcon('<path d="M16 3c5 4 6 10 4 17h-8c-2-7-1-13 4-17Z"/><circle cx="16" cy="12" r="2.5"/><path d="M12 20l-4 4 4 1M20 20l4 4-4 1M14 25l2 4 2-4"/>'),
    spotlight: svgIcon('<path d="M11 4h10l-2 8h-6Z"/><path d="M13 12l-7 15h20l-7-15"/>'),
    classic: svgIcon('<rect x="4" y="5" width="24" height="22" rx="2"/><path d="M12 5v22M20 5v22M4 12.3h24M4 19.6h24" stroke-width="2"/>'),
    island: svgIcon('<path d="M3 24c4-2 8-2 13 0s9 2 13 0"/><path d="M8 21c1-5 4-8 8-8s7 3 8 8"/><path d="M16 13V5l6 3-6 3"/>'),
    lab: svgIcon('<path d="M12 4h8M13 4v8L6 25a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3l-7-13V4"/><path d="M9 20h14"/>'),
  };

  var THEME_IDS_BY_MECHANIC = {
    race: [
      { id: "rope", icon: ICONS.rope, key: "teacher.themes.rope" },
      { id: "rocket", icon: ICONS.rocket, key: "teacher.themes.rocket" },
    ],
    buzzer: [
      { id: "spotlight", icon: ICONS.spotlight, key: "teacher.themes.spotlight" },
    ],
    board: [
      { id: "classic", icon: ICONS.classic, key: "teacher.themes.classic" },
    ],
    rally: [
      { id: "island", icon: ICONS.island, key: "teacher.themes.island" },
    ],
    escape: [
      { id: "lab", icon: ICONS.lab, key: "teacher.themes.lab" },
    ],
  };

  function $(id) { return document.getElementById(id); }
  var questionList = $("questionList");
  var rowTpl = $("questionRowTpl");

  function showForm() {
    $("chooseView").classList.add("hidden");
    $("formView").classList.remove("hidden");
  }
  $("chooseCustom").addEventListener("click", showForm);
  if (location.hash === "#write") showForm();

  // ---------------- Teacher passcode ----------------
  // Kept for this browser tab only. Every saved-quiz request that exposes
  // answers or changes the library sends it; the server rejects it if wrong.
  var PASSCODE_KEY = "teacherPasscode";
  var passcodeState = "hint"; // "hint" | "ok" | "bad"
  var passcodeError = null;

  function storedPasscode() {
    try { return sessionStorage.getItem(PASSCODE_KEY) || ""; } catch (e) { return ""; }
  }
  function storePasscode(value) {
    try {
      if (value) sessionStorage.setItem(PASSCODE_KEY, value);
      else sessionStorage.removeItem(PASSCODE_KEY);
    } catch (e) { /* storage unavailable: the typed value is still used */ }
  }
  function currentPasscode() {
    return storedPasscode() || $("passcodeInput").value.trim();
  }
  function teacherHeaders(extra) {
    var h = extra || {};
    h["X-Teacher-Passcode"] = currentPasscode();
    return h;
  }

  function setPasscodeState(state, errorCode) {
    passcodeState = state;
    passcodeError = errorCode || null;
    renderPasscodeStatus();
  }

  function renderPasscodeStatus() {
    var el = $("passcodeStatus");
    el.classList.toggle("ok", passcodeState === "ok");
    el.classList.toggle("bad", passcodeState === "bad");
    if (passcodeState === "ok") el.textContent = t("teacher.passcode.ok");
    else if (passcodeState === "bad") el.textContent = tError(passcodeError || "bad-passcode", t("teacher.library.unavailable"));
    else el.textContent = t("teacher.passcode.hint");
  }

  // A protected route answering bad-passcode / passcode-not-configured means
  // the stored passcode is missing or wrong: forget it and say so.
  function handleAuthFailure(data) {
    if (data && (data.error === "bad-passcode" || data.error === "passcode-not-configured")) {
      storePasscode("");
      setPasscodeState("bad", data.error);
      return true;
    }
    return false;
  }

  $("passcodeGo").addEventListener("click", function () {
    var value = $("passcodeInput").value.trim();
    if (!value) return;
    $("passcodeGo").disabled = true;
    fetch("/api/question-sets/check-passcode", { method: "POST", headers: { "X-Teacher-Passcode": value } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        $("passcodeGo").disabled = false;
        if (data.ok) {
          storePasscode(value);
          $("passcodeInput").value = "";
          setPasscodeState("ok");
        } else if (!handleAuthFailure(data)) {
          setPasscodeState("bad", data.error);
        }
      })
      .catch(function () {
        $("passcodeGo").disabled = false;
        setPasscodeState("bad", "unavailable");
      });
  });
  $("passcodeInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("passcodeGo").click();
  });
  if (storedPasscode()) setPasscodeState("ok"); else renderPasscodeStatus();

  // Keeps the current theme when it belongs to the selected game type (a
  // language switch re-renders the buttons), otherwise picks the first.
  function renderThemePick() {
    var wrap = $("themePick");
    var themes = THEME_IDS_BY_MECHANIC[selectedMechanic];
    if (!themes.some(function (theme) { return theme.id === selectedTheme; })) selectedTheme = themes[0].id;
    wrap.innerHTML = "";
    themes.forEach(function (theme) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "theme-btn" + (theme.id === selectedTheme ? " active" : "");
      b.setAttribute("data-theme-id", theme.id);
      b.innerHTML = theme.icon + "<span>" + t(theme.key) + "</span>";
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(wrap.querySelectorAll(".theme-btn"), function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        selectedTheme = theme.id;
        applyTeamCount();
      });
      wrap.appendChild(b);
    });
  }

  // 2 to 4 teams: Quiz Board, Rally and Rocket Race. The rope has two ends and the
  // buzzer is head-to-head, so those stay at 2.
  function teamCountApplies() {
    return selectedMechanic === "board" || selectedMechanic === "rally" || selectedMechanic === "escape" || (selectedMechanic === "race" && selectedTheme === "rocket");
  }
  function applyTeamCount() {
    $("teamCountSetting").classList.toggle("hidden", !teamCountApplies());
  }
  renderThemePick();

  Array.prototype.forEach.call($("mechanicPick").querySelectorAll(".theme-btn"), function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call($("mechanicPick").querySelectorAll(".theme-btn"), function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      selectedMechanic = b.getAttribute("data-mechanic");
      renderThemePick();
      applyMechanic();
    });
  });

  // Board games add category + points to every question and allow open
  // answers judged by the host; other games hide those fields.
  function applyMechanicToRow(rowEl) {
    var board = selectedMechanic === "board";
    rowEl.querySelector(".board-fields").classList.toggle("hidden", !board);
    var escape = selectedMechanic === "escape";
    rowEl.querySelector(".rally-fields").classList.toggle("hidden", selectedMechanic !== "rally");
    rowEl.querySelector(".escape-fields").classList.toggle("hidden", !escape);
    fillStationOptions(rowEl);
    fillRoomOptions(rowEl);
    rowEl.querySelector(".open-type").classList.toggle("hidden", !board);
    Array.prototype.forEach.call(rowEl.querySelectorAll(".escape-type"), function (label) { label.classList.toggle("hidden", !escape); });
    var openRadio = rowEl.querySelector('.type-row input[value="open"]');
    var escapeChecked = rowEl.querySelector(".escape-type input:checked");
    if ((!board && openRadio.checked) || (!escape && escapeChecked)) {
      var shortRadio = rowEl.querySelector('.type-row input[value="short-answer"]');
      shortRadio.checked = true;
      shortRadio.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function applyMechanic() {
    $("boardSettings").classList.toggle("hidden", selectedMechanic !== "board");
    $("rallySettings").classList.toggle("hidden", selectedMechanic !== "rally");
    $("escapeSettings").classList.toggle("hidden", selectedMechanic !== "escape");
    applyTeamCount();
    Array.prototype.forEach.call(questionList.querySelectorAll(".q-row"), applyMechanicToRow);
  }

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
        '<input class="choice-text text-input" dir="auto" placeholder="' + t("teacher.q.choiceTextPlaceholder") + '">' +
        '<button type="button" class="remove-choice">&times;</button>';
      wrap.querySelector(".remove-choice").addEventListener("click", function () { wrap.remove(); });
      choicesWrap.appendChild(wrap);
    }
    rowEl.querySelector(".mc-fields .add-choice").addEventListener("click", addChoice);
    addChoice();
    addChoice();

    // Match pairs (escape rooms): a left and a right item per row.
    var pairsWrap = rowEl.querySelector(".pairs");
    function addPair() {
      var wrap = document.createElement("div");
      wrap.className = "pair-row";
      wrap.innerHTML =
        '<input class="pair-left text-input" dir="auto" placeholder="' + t("teacher.q.pairLeft") + '">' +
        '<span class="eq">=</span>' +
        '<input class="pair-right text-input" dir="auto" placeholder="' + t("teacher.q.pairRight") + '">' +
        '<button type="button" class="remove-choice">&times;</button>';
      wrap.querySelector(".remove-choice").addEventListener("click", function () { wrap.remove(); });
      pairsWrap.appendChild(wrap);
      return wrap;
    }
    rowEl.querySelector(".add-pair").addEventListener("click", addPair);
    addPair(); addPair(); addPair();
    rowEl.addPair = addPair;

    var answerLabel = rowEl.querySelector(".answer-label");
    Array.prototype.forEach.call(typeRadios, function (r) {
      r.addEventListener("change", function () {
        var type = rowEl.querySelector('.type-row input[type="radio"]:checked').value;
        var isMc = type === "multiple-choice";
        shortFields.classList.toggle("hidden", isMc || !!PUZZLE_FIELDS[type]);
        mcFields.classList.toggle("hidden", !isMc);
        Object.keys(PUZZLE_FIELDS).forEach(function (k) { rowEl.querySelector(PUZZLE_FIELDS[k]).classList.toggle("hidden", type !== k); });
        var key = type === "open" ? "teacher.q.expectedAnswer" : type === "expression" ? "teacher.q.correctExpression" : "teacher.q.correctAnswer";
        answerLabel.setAttribute("data-i18n", key);
        answerLabel.textContent = t(key);
      });
    });

    rowEl.querySelector(".remove-q").addEventListener("click", function () {
      rowEl.remove();
      renumber();
    });

    applyMechanicToRow(rowEl);
    return rowEl;
  }

  $("addQuestion").addEventListener("click", addQuestionRow);
  addQuestionRow();

  function collectQuestions() {
    var out = [];
    var errors = [];
    var board = selectedMechanic === "board";
    Array.prototype.forEach.call(questionList.querySelectorAll(".q-row"), function (row, i) {
      var prompt = row.querySelector(".prompt-input").value.trim();
      var n = i + 1;
      var type = row.querySelector('.type-row input[type="radio"]:checked').value;
      if (!prompt) { errors.push(t("teacher.err.questionNeedsText", { n: n })); return; }
      var extra = {};
      if (board) {
        var category = row.querySelector(".category-input").value.trim();
        if (!category) { errors.push(t("teacher.err.questionNeedsCategory", { n: n })); return; }
        extra = { category: category, points: Number(row.querySelector(".points-input").value) };
      }
      if (selectedMechanic === "rally") {
        extra = { station: Number(row.querySelector(".station-input").value), hint: row.querySelector(".hint-input").value.trim() };
      }
      if (selectedMechanic === "escape") {
        extra = { room: Number(row.querySelector(".room-input").value), hint: row.querySelector(".escape-hint-input").value.trim() };
        if (PUZZLE_FIELDS[type]) {
          var puzzle = collectPuzzle(row, type, n);
          if (puzzle.error) { errors.push(puzzle.error); return; }
          out.push(Object.assign({ prompt: prompt, type: type }, puzzle.fields, extra));
          return;
        }
      }
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
        out.push(Object.assign({ prompt: prompt, type: "multiple-choice", choices: choices, answer: correctIdx }, extra));
      } else {
        var answer = row.querySelector(".answer-input").value.trim();
        if (!answer) { errors.push(t("teacher.err.questionNeedsAnswer", { n: n })); return; }
        if (type === "expression" && !window.MathExpr.parse(answer).ok) { errors.push(t("teacher.err.expressionInvalid", { n: n })); return; }
        out.push(Object.assign({ prompt: prompt, type: type === "open" || type === "expression" ? type : "short-answer", answer: answer }, extra));
      }
    });
    if (selectedMechanic === "rally") errors = errors.concat(rallyErrors(out));
    if (selectedMechanic === "escape") errors = errors.concat(escapeErrors(out));
    return { out: out, errors: errors };
  }

  // The fields of an order, match or graph puzzle, or the first problem found.
  function collectPuzzle(row, type, n) {
    if (type === "order") {
      var items = row.querySelector(".order-input").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      if (items.length < 3 || items.length > 6) return { error: t("teacher.err.orderNeedsSteps", { n: n }) };
      return { fields: { items: items } };
    }
    if (type === "match") {
      var pairs = [], incomplete = false;
      Array.prototype.forEach.call(row.querySelectorAll(".pair-row"), function (pr) {
        var left = pr.querySelector(".pair-left").value.trim(), right = pr.querySelector(".pair-right").value.trim();
        if (!left && !right) return;
        if (!left || !right) incomplete = true;
        pairs.push({ left: left, right: right });
      });
      if (incomplete || pairs.length < 2 || pairs.length > 5) return { error: t("teacher.err.matchNeedsPairs", { n: n }) };
      return { fields: { pairs: pairs } };
    }
    var fn = row.querySelector(".graph-fn").value.trim();
    if (!window.MathExpr.parse(fn).ok) return { error: t("teacher.err.graphNeedsFunction", { n: n }) };
    var xmin = Number(row.querySelector(".graph-xmin").value), xmax = Number(row.querySelector(".graph-xmax").value);
    var answers = row.querySelector(".graph-answer").value.split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean).map(Number);
    if (!(xmax > xmin) || !answers.length || answers.some(function (v) { return !isFinite(v) || v < xmin || v > xmax; })) {
      return { error: t("teacher.err.graphAnswer", { n: n }) };
    }
    return { fields: { fn: fn, answer: answers.join(", "), xmin: xmin, xmax: xmax, slope: row.querySelector(".graph-slope").checked } };
  }

  // ---------------- Escape Room: vault code and rooms ----------------
  function escapeCode() {
    return $("escapeCode").value.replace(/\D/g, "").slice(0, 8);
  }

  function escapeErrors(questions) {
    var code = escapeCode();
    if (code.length < 2) return [t("teacher.err.escapeCode")];
    var counts = Array.from(code).map(function () { return 0; });
    questions.forEach(function (q) { if (q.room < counts.length) counts[q.room] += 1; });
    for (var i = 0; i < counts.length; i++) {
      if (counts[i] === 0) return [t("teacher.err.roomEmpty", { n: i + 1 })];
      if (counts[i] > ESCAPE_MAX_PER_ROOM) return [t("teacher.err.roomFull", { n: i + 1 })];
    }
    return [];
  }

  // One room per digit: the room pickers and the name/story rows follow the code.
  function fillRoomOptions(rowEl) {
    var select = rowEl.querySelector(".room-input");
    var count = escapeCode().length;
    var keep = select.value;
    select.innerHTML = "";
    for (var i = 0; i < count; i++) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = t("teacher.q.roomOption", { n: i + 1 });
      select.appendChild(opt);
    }
    if (keep && Number(keep) < count) select.value = keep;
  }

  function escapeRoomsValue() {
    return Array.prototype.map.call($("escapeRooms").querySelectorAll(".escape-room-row"), function (row) {
      return { name: row.querySelector(".name-input").value.trim(), story: row.querySelector(".story-input").value.trim() };
    });
  }

  function renderEscapeRooms(values) {
    var code = Array.from(escapeCode());
    $("escapeInfo").textContent = code.length >= 2 ? t("teacher.escape.roomsInfo", { n: code.length }) : t("teacher.escape.codeHelp");
    var old = values || escapeRoomsValue();
    var wrap = $("escapeRooms");
    wrap.innerHTML = "";
    code.forEach(function (digit, i) {
      var row = document.createElement("div");
      row.className = "escape-room-row";
      var tile = document.createElement("b"); tile.textContent = i + 1;
      var name = document.createElement("input");
      name.className = "name-input text-input"; name.maxLength = 40; name.dir = "auto";
      name.placeholder = t("teacher.escape.namePlaceholder", { n: i + 1 });
      name.value = (old[i] && old[i].name) || "";
      var story = document.createElement("input");
      story.className = "story-input text-input"; story.maxLength = 240; story.dir = "auto";
      story.placeholder = t("teacher.escape.storyPlaceholder");
      story.value = (old[i] && old[i].story) || "";
      row.appendChild(tile); row.appendChild(name); row.appendChild(story);
      wrap.appendChild(row);
    });
    Array.prototype.forEach.call(questionList.querySelectorAll(".q-row"), fillRoomOptions);
  }
  $("escapeCode").addEventListener("input", function () { renderEscapeRooms(); });

  // ---------------- Rally: secret word and stations ----------------
  // Letters only (any alphabet), upper-cased, as the server keeps them.
  function rallyWord() {
    return Array.from($("rallyWord").value.toLocaleUpperCase()).filter(function (ch) { return /\p{L}/u.test(ch); }).join("").slice(0, 12);
  }

  function rallyErrors(questions) {
    var word = Array.from(rallyWord());
    if (word.length < 3) return [t("teacher.err.rallyWord")];
    var counts = word.map(function () { return 0; });
    questions.forEach(function (q) { if (q.station < counts.length) counts[q.station] += 1; });
    for (var i = 0; i < counts.length; i++) {
      if (counts[i] === 0) return [t("teacher.err.stationEmpty", { n: i + 1, letter: word[i] })];
      if (counts[i] > RALLY_MAX_PER_STATION) return [t("teacher.err.stationFull", { n: i + 1, letter: word[i] })];
    }
    return [];
  }

  // One station per letter: the station pickers and clue boxes follow the word.
  function fillStationOptions(rowEl) {
    var select = rowEl.querySelector(".station-input");
    var word = Array.from(rallyWord());
    var keep = select.value;
    select.innerHTML = "";
    word.forEach(function (letter, i) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = t("teacher.q.stationOption", { n: i + 1, letter: letter });
      select.appendChild(opt);
    });
    if (keep && Number(keep) < word.length) select.value = keep;
  }

  function renderRallyStations() {
    var word = Array.from(rallyWord());
    $("rallyInfo").textContent = word.length >= 3 ? t("teacher.rally.stationsInfo", { n: word.length }) : t("teacher.rally.wordHelp");
    var wrap = $("rallyClues");
    var old = Array.prototype.map.call(wrap.querySelectorAll(".clue-input"), function (el) { return el.value; });
    wrap.innerHTML = "";
    word.forEach(function (letter, i) {
      var row = document.createElement("div");
      row.className = "rally-clue";
      var tile = document.createElement("b"); tile.textContent = letter;
      var input = document.createElement("input");
      input.className = "clue-input text-input"; input.maxLength = 140; input.dir = "auto";
      input.placeholder = t("teacher.rally.cluePlaceholder", { n: i + 1 });
      input.value = old[i] || "";
      row.appendChild(tile); row.appendChild(input);
      wrap.appendChild(row);
    });
    Array.prototype.forEach.call(questionList.querySelectorAll(".q-row"), fillStationOptions);
  }
  $("rallyWord").addEventListener("input", renderRallyStations);

  function updateBuzzerHint() {
    $("buzzerHint").classList.toggle("hidden", selectedMechanic !== "buzzer");
    $("rallyHint").classList.toggle("hidden", selectedMechanic !== "rally");
    $("escapeHint").classList.toggle("hidden", selectedMechanic !== "escape");
    $("boardHint").classList.toggle("hidden", selectedMechanic !== "board");
  }

  function renderTimeOptions() {
    Array.prototype.forEach.call($("timeLimitInput").options, function (opt) {
      opt.textContent = t("teacher.board.seconds", { n: opt.value });
    });
  }
  renderTimeOptions();

  function renderTeamCountOptions() {
    Array.prototype.forEach.call($("teamCountInput").options, function (opt) {
      opt.textContent = t("teacher.board.teamCount", { n: opt.value });
    });
  }
  renderTeamCountOptions();

  function renderMinuteOptions() {
    [$("rallyMinutes"), $("escapeMinutes")].forEach(function (select) {
      Array.prototype.forEach.call(select.options, function (opt) {
        opt.textContent = t("teacher.rally.minutesOption", { n: opt.value });
      });
    });
  }
  renderMinuteOptions();

  // The team count goes with Create Room only; saved quizzes leave it out and
  // ask for it on the Play page each time they are played.
  function currentSettings(forSave) {
    var settings = roomSettings();
    if (forSave) delete settings.teams;
    return settings;
  }

  function roomSettings() {
    if (selectedMechanic === "rally") {
      var rally = { word: rallyWord(), minutes: Number($("rallyMinutes").value), teams: Number($("teamCountInput").value) };
      rally.clues = Array.prototype.map.call($("rallyClues").querySelectorAll(".clue-input"), function (el) { return el.value.trim(); });
      return rally;
    }
    if (selectedMechanic === "escape") {
      return { code: escapeCode(), minutes: Number($("escapeMinutes").value), teams: Number($("teamCountInput").value), rooms: escapeRoomsValue() };
    }
    var settings = { penalty: $("penaltyInput").checked, timeLimit: Number($("timeLimitInput").value) };
    if (teamCountApplies()) settings.teams = Number($("teamCountInput").value);
    return settings;
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
    var socket = SOCKETS[selectedMechanic];
    socket.emit("create-room", { title: title, theme: selectedTheme, questions: res.out, settings: currentSettings() }, function (ack) {
      $("createGo").disabled = false;
      if (!ack || !ack.ok) { errEl.textContent = (ack && ack.error) ? tError(ack.error) : t("teacher.err.createFailed"); return; }
      $("doneCode").textContent = ack.room.code;
      var joinBase = location.origin + "/games/" + GAME_PATHS[selectedMechanic] + "/";
      $("doneLede").textContent = t("teacher.done.lede", { link: joinBase });
      $("openStudentView").href = joinBase + "?code=" + ack.room.code;
      updateBuzzerHint();
      $("formView").classList.add("hidden");
      $("doneView").classList.remove("hidden");
    });
  });

  $("createAnother").addEventListener("click", function () {
    location.hash = "write";
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
    $("penaltyInput").checked = !!(set.settings && set.settings.penalty);
    $("timeLimitInput").value = String((set.settings && set.settings.timeLimit) || 30);
    // Board quizzes saved before the choice existed had 4 seats.
    $("teamCountInput").value = String((set.settings && set.settings.teams) || (set.mechanic === "board" ? 4 : 2));
    if (set.mechanic === "rally") {
      $("rallyWord").value = (set.settings && set.settings.word) || "";
      $("rallyMinutes").value = String((set.settings && set.settings.minutes) || 20);
      renderRallyStations();
      Array.prototype.forEach.call($("rallyClues").querySelectorAll(".clue-input"), function (el, i) { el.value = (set.settings.clues || [])[i] || ""; });
    }
    if (set.mechanic === "escape") {
      $("escapeCode").value = (set.settings && set.settings.code) || "";
      $("escapeMinutes").value = String((set.settings && set.settings.minutes) || 20);
      renderEscapeRooms((set.settings && set.settings.rooms) || []);
    }

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
      if (q.category) rowEl.querySelector(".category-input").value = q.category;
      if (set.mechanic === "rally") {
        rowEl.querySelector(".station-input").value = String(q.station || 0);
        rowEl.querySelector(".hint-input").value = q.hint || "";
      }
      if (set.mechanic === "escape") {
        rowEl.querySelector(".room-input").value = String(q.room || 0);
        rowEl.querySelector(".escape-hint-input").value = q.hint || "";
        if (q.type === "order") rowEl.querySelector(".order-input").value = (q.items || []).join("\n");
        if (q.type === "match") {
          rowEl.querySelector(".pairs").innerHTML = "";
          (q.pairs || []).forEach(function (pair) {
            var pr = rowEl.addPair();
            pr.querySelector(".pair-left").value = pair.left || "";
            pr.querySelector(".pair-right").value = pair.right || "";
          });
        }
        if (q.type === "graph") {
          rowEl.querySelector(".graph-fn").value = q.fn || "";
          rowEl.querySelector(".graph-answer").value = q.answer || "";
          rowEl.querySelector(".graph-xmin").value = q.xmin != null ? q.xmin : -5;
          rowEl.querySelector(".graph-xmax").value = q.xmax != null ? q.xmax : 5;
          rowEl.querySelector(".graph-slope").checked = q.slope !== false;
        }
      }
      if (q.points) rowEl.querySelector(".points-input").value = String(q.points);

      if (q.type === "multiple-choice") {
        var choicesWrap = rowEl.querySelector(".choices");
        choicesWrap.innerHTML = "";
        var addBtn = rowEl.querySelector(".mc-fields .add-choice");
        (q.choices || []).forEach(function () { addBtn.click(); });
        var choiceRows = choicesWrap.querySelectorAll(".choice-row");
        (q.choices || []).forEach(function (choiceText, idx) {
          var cr = choiceRows[idx];
          if (!cr) return;
          cr.querySelector(".choice-text").value = choiceText;
          if (idx === q.answer) cr.querySelector(".choice-correct").checked = true;
        });
      } else if (!PUZZLE_FIELDS[q.type]) {
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
      empty.className = "hint";
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
      title.setAttribute("dir", "auto");
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
      loadBtn.className = "btn-primary";
      loadBtn.textContent = t("teacher.library.load");
      loadBtn.addEventListener("click", function () {
        fetch("/api/question-sets/" + set.id, { headers: teacherHeaders() })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.ok) { loadSet(data.set); return; }
            if (!handleAuthFailure(data)) $("createErr").textContent = tError(data.error, t("teacher.library.unavailable"));
          })
          .catch(function () { $("createErr").textContent = t("teacher.library.unavailable"); });
      });
      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "remove-q";
      delBtn.title = t("teacher.library.delete");
      delBtn.textContent = "×";
      delBtn.addEventListener("click", function () {
        fetch("/api/question-sets/" + set.id, { method: "DELETE", headers: teacherHeaders() })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.ok) { openLibrary(); return; }
            if (!handleAuthFailure(data)) $("createErr").textContent = tError(data.error, t("teacher.library.unavailable"));
          })
          .catch(function () { $("createErr").textContent = t("teacher.library.unavailable"); });
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
      headers: teacherHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ title: $("titleInput").value.trim(), mechanic: selectedMechanic, theme: selectedTheme, questions: res.out, settings: currentSettings(true) }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) {
          if (!handleAuthFailure(data)) errEl.textContent = tError(data.error, t("teacher.library.unavailable"));
          return;
        }
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
    renderPasscodeStatus();
    renderTimeOptions();
    renderTeamCountOptions();
    renderMinuteOptions();
    applyTeamCount();
    renderRallyStations();
    renderEscapeRooms();
  });
})();
