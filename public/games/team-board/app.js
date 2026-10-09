(function () {
  "use strict";

  var NS = "games.teamBoard.";
  var TEAMS = ["A", "B", "C", "D"];
  var EMOJI = { A: "🔴", B: "🔵", C: "🟢", D: "🟣" };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var socket = io("/team-board");

  var S = {
    view: "landing",
    code: null,
    role: null,
    pendingRole: null,
    pendingCode: null,
    room: null,
    judge: null,
    lastSeenRound: null,
    finished: false,
    lastOpenedAt: undefined,
    timer: null,
    countdown: null,
  };

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function isTeam() { return TEAMS.indexOf(S.role) !== -1; }
  function teamName(team) { return t(NS + "teams." + team); }
  function teamLabel(team) { return EMOJI[team] + " " + teamName(team); }
  function joinedCount(room) { return TEAMS.filter(function (x) { return room.teams[x].joined; }).length; }

  function showView(name) {
    S.view = name;
    qsa("#app > section[data-view]").forEach(function (sec) {
      sec.classList.toggle("hidden", sec.getAttribute("data-view") !== name);
    });
  }

  function notice(msg) {
    var n = $("notice");
    if (!msg) { n.style.display = "none"; n.textContent = ""; return; }
    n.style.display = "block"; n.textContent = msg;
  }

  socket.on("connect_error", function () {
    notice(t(NS + "notice.connectError"));
  });

  wireCopyButton($("copyLobbyCode"), function () { return $("lobbyCode").textContent; });

  // ---------------- Room state application ----------------
  function applyRoomUpdate(room) {
    var firstSeen = S.lastSeenRound === null;
    if (!firstSeen && room.round !== S.lastSeenRound) { S.finished = false; S.lastOpenedAt = undefined; }
    S.lastSeenRound = room.round;
    S.room = room;
    if (S.view === "lobby") renderLobby();
    var enteringMatch = room.status === "active" && (S.view === "lobby" || S.view === "end");
    if (S.view === "match" || enteringMatch) {
      if (S.view !== "match") showView("match");
      renderMatch();
    }
    if (room.status === "finished" && !S.finished) {
      S.finished = true;
      showEnd(room);
    }
  }

  socket.on("room-update", applyRoomUpdate);
  socket.on("judge-queue", function (queue) {
    S.judge = queue;
    if (S.view === "match") renderJudge();
  });

  // ---------------- Navigation ----------------
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var act = el.getAttribute("data-action");
    if (act === "go-landing") { leaveRoom(); showView("landing"); }
    if (act === "go-join") { $("joinCodeInput").value = ""; $("joinErr").textContent = ""; S.pendingRole = null; showView("joinEntry"); }
    if (act === "go-display") { $("joinCodeInput").value = ""; $("joinErr").textContent = ""; S.pendingRole = "display"; showView("joinEntry"); }
  });

  function stopTimers() {
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    if (S.countdown) { clearInterval(S.countdown); S.countdown = null; }
  }

  function leaveRoom() {
    stopTimers();
    if (socket.connected) socket.disconnect();
    socket.connect();
    S.code = null; S.role = null; S.room = null; S.judge = null; S.lastSeenRound = null; S.finished = false;
  }

  $("joinCodeGo").addEventListener("click", function () {
    var code = $("joinCodeInput").value.trim().toUpperCase();
    var errorEl = $("joinErr");
    if (code.length !== 4) { errorEl.textContent = t(NS + "err.enterCode"); return; }
    socket.emit("peek-room", { code: code }, function (ack) {
      if (!ack.ok) { errorEl.textContent = tError(ack.error); return; }
      S.pendingCode = code;
      if (S.pendingRole === "display") {
        joinAs(code, null);
        return;
      }
      $("joinRoleCode").textContent = code;
      $("joinRoleTitle").textContent = ack.room.title || t(NS + "defaultTitle");
      renderTeamPick(ack.room);
      $("joinRoleErr").textContent = "";
      showView("joinRoleSelect");
    });
  });

  function joinAs(code, team) {
    socket.emit("join-room", { code: code, team: team }, function (ack) {
      var errEl = S.view === "joinRoleSelect" ? $("joinRoleErr") : $("joinErr");
      if (!ack.ok) { errEl.textContent = tError(ack.error); return; }
      S.role = team;
      S.code = code;
      showView("lobby");
      applyRoomUpdate(ack.room);
    });
  }
  // Free seats only. Once a game has started, only its own teams can rejoin.
  function renderTeamPick(room) {
    var wrap = $("teamPick");
    wrap.innerHTML = "";
    TEAMS.forEach(function (team) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "team-btn " + team.toLowerCase();
      b.textContent = t(NS + "join.joinTeam", { team: teamLabel(team) });
      b.disabled = room.teams[team].joined || (room.status !== "waiting" && room.playing.indexOf(team) === -1);
      b.addEventListener("click", function () { joinAs(S.pendingCode, team); });
      wrap.appendChild(b);
    });
  }
  $("joinAsDisplay").addEventListener("click", function () { joinAs(S.pendingCode, null); });

  $("lobbyStart").addEventListener("click", function () {
    if ($("lobbyStart").disabled) return;
    socket.emit("start-match");
  });
  $("endRematch").addEventListener("click", function () {
    socket.emit("rematch");
  });

  // ---------------- Lobby ----------------
  function renderLobby() {
    var d = S.room; if (!d) return;
    $("lobbyTitle").textContent = (d.title || t(NS + "defaultTitle")) + " · " +
      t(NS + (d.questionCount === 1 ? "lobby.questionSingular" : "lobby.questionPlural"), { n: d.questionCount });
    $("lobbyCode").textContent = d.code;
    $("lobbyRules").textContent = t(NS + "lobby.timeLimit", { n: d.timeLimit }) + " " +
      t(NS + (d.penalty ? "lobby.penaltyOn" : "lobby.penaltyOff"));
    var roster = $("lobbyRoster"); roster.innerHTML = "";
    TEAMS.forEach(function (team) {
      var joined = d.teams[team].joined;
      var row = document.createElement("div");
      row.className = "roster-row" + (joined ? " ready" : "");
      var dot = document.createElement("span"); dot.className = "dot " + team.toLowerCase();
      var name = document.createElement("span"); name.className = "name"; name.textContent = teamName(team);
      var status = document.createElement("span"); status.className = "status";
      status.textContent = t(NS + (joined ? "lobby.ready" : "lobby.open"));
      row.appendChild(dot); row.appendChild(name); row.appendChild(status);
      roster.appendChild(row);
    });
    var count = joinedCount(d);
    var startBtn = $("lobbyStart");
    startBtn.disabled = count < 2 || d.status !== "waiting";
    startBtn.textContent = d.status === "active" ? t(NS + "lobby.matchStarting") :
      count < 2 ? t(NS + "lobby.needTwoTeams") : t(NS + "lobby.startGame", { n: count });
  }

  // ---------------- Match ----------------
  function renderMatch() {
    var room = S.room;
    $("matchTitleLabel").textContent = room.title || "";
    renderScoreboard(room);
    $("controlLabel").textContent = t(NS + "match.teamPicks", { team: teamLabel(room.control) });
    $("controlLabel").className = "control-label " + room.control.toLowerCase();

    var onBoard = room.phase === "board";
    $("boardView").classList.toggle("hidden", !onBoard);
    $("questionView").classList.toggle("hidden", onBoard);
    if (onBoard) renderBoard(room); else renderQuestion(room);
    renderJudge();
  }

  function renderScoreboard(room) {
    var board = $("scoreboard");
    board.innerHTML = "";
    board.style.gridTemplateColumns = "repeat(" + room.playing.length + ", minmax(0, 1fr))";
    room.playing.forEach(function (team) {
      var chip = document.createElement("div");
      chip.className = "score-chip " + team.toLowerCase() + (room.control === team ? " in-control" : "");
      var lab = document.createElement("span"); lab.className = "lab"; lab.textContent = teamLabel(team);
      var val = document.createElement("span"); val.className = "val"; val.textContent = room.scores[team];
      chip.appendChild(lab); chip.appendChild(val);
      board.appendChild(chip);
    });
  }

  function canPick(room) {
    if (room.phase !== "board" || Date.now() < room.matchStartAt) return false;
    return S.role === null || S.role === room.control;
  }

  function renderBoard(room) {
    var hint = $("pickHint");
    if (S.countdown) { clearInterval(S.countdown); S.countdown = null; }
    if (Date.now() < room.matchStartAt) {
      // Re-render when the start countdown ends so squares become clickable.
      S.countdown = setInterval(function () {
        var left = room.matchStartAt - Date.now();
        if (left <= 0) { clearInterval(S.countdown); S.countdown = null; renderMatch(); return; }
        hint.textContent = t(NS + "match.getReady") + " " + Math.ceil(left / 1000);
      }, 200);
      hint.textContent = t(NS + "match.getReady");
    } else if (S.role === null) {
      hint.textContent = t(NS + "match.hostPickHint");
    } else {
      hint.textContent = t(NS + (S.role === room.control ? "match.yourPick" : "match.waitPick"));
    }

    var board = $("board");
    board.innerHTML = "";
    board.style.gridTemplateColumns = "repeat(" + room.categories.length + ", minmax(0, 1fr))";
    var clickable = canPick(room);
    room.categories.forEach(function (name, cat) {
      var col = document.createElement("div");
      col.className = "board-col";
      var head = document.createElement("div");
      head.className = "board-head";
      head.textContent = name;
      col.appendChild(head);
      renderMathIn(head);
      room.cells.filter(function (c) { return c.cat === cat; }).forEach(function (cell) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "board-cell" + (cell.used ? " used" : "") + (cell.wonBy ? " won-" + cell.wonBy.toLowerCase() : "");
        b.textContent = cell.used ? "" : cell.points;
        b.disabled = cell.used || !clickable;
        b.setAttribute("aria-label", name + " " + cell.points);
        b.addEventListener("click", function () { socket.emit("pick-cell", { cell: cell.id }); });
        col.appendChild(b);
      });
      board.appendChild(col);
    });
  }

  function attemptLabel(a) {
    if (!a.answered) return t(NS + "match.notAnswered");
    if (a.result === true) return t(NS + "match.correct");
    if (a.result === false) return t(NS + "match.wrong");
    if (a.result === "skipped") return t(NS + "match.notJudged");
    return S.room.phase === "judging" ? t(NS + "match.judging") : t(NS + "match.answered");
  }

  function renderQuestion(room) {
    var q = room.question;
    var fresh = S.lastOpenedAt !== room.openedAt;
    if (fresh) {
      S.lastOpenedAt = room.openedAt;
      $("textAnswerInput").value = "";
      $("questionText").textContent = q.prompt;
      renderMathIn($("questionText"));
      $("questionMeta").textContent = q.category + " · " + q.points;
      renderMathIn($("questionMeta"));
      if (q.type === "multiple-choice") buildChoices(q.choices || []);
    }

    var attempts = $("attempts");
    attempts.innerHTML = "";
    attempts.style.gridTemplateColumns = "repeat(" + Math.min(room.playing.length, 2) + ", minmax(0, 1fr))";
    room.playing.forEach(function (team) {
      var a = room.attempts[team];
      var box = document.createElement("div");
      box.className = "attempt " + team.toLowerCase();
      var name = document.createElement("span"); name.textContent = teamName(team);
      var status = document.createElement("span");
      status.textContent = attemptLabel(a) + (room.phase === "reveal" && a.input ? " (" + a.input + ")" : "");
      box.appendChild(name); box.appendChild(status);
      attempts.appendChild(box);
    });

    // Timer bar runs only while answers are open.
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    if (room.phase === "question") {
      var tick = function () {
        var pct = Math.max(0, 100 - ((Date.now() - room.openedAt) / room.windowMs) * 100);
        $("timerBar").style.width = pct + "%";
      };
      tick();
      S.timer = setInterval(tick, 100);
    } else {
      $("timerBar").style.width = "0%";
    }

    var banner = $("resultBanner");
    if (room.phase === "reveal") {
      banner.classList.remove("hidden");
      banner.classList.toggle("wrong-team", !room.cellWinner);
      var head = room.cellWinner
        ? t(NS + "match.teamWins", { team: teamLabel(room.cellWinner), points: q.points })
        : t(NS + "match.nobody");
      banner.textContent = head + "  " + t(NS + "match.answerWas", { answer: room.answerText });
      renderMathIn(banner);
    } else {
      banner.classList.add("hidden");
    }

    $("teamPlay").classList.toggle("hidden", !isTeam());
    if (isTeam()) {
      $("teamTag").textContent = teamLabel(S.role);
      var mine = room.attempts[S.role];
      var open = room.phase === "question" && !mine.answered;
      var mc = q.type === "multiple-choice";
      $("textArea").classList.toggle("hidden", mc);
      $("mcArea").classList.toggle("hidden", !mc);
      $("textAnswerInput").disabled = !open;
      $("textAnswerGo").disabled = !open;
      qsa(".mc-choice", $("mcChoices")).forEach(function (b) { b.disabled = !open; });
      var status = "";
      if (mine.answered && mine.result === null) status = t(NS + (q.type === "open" ? "match.waitingHost" : "match.answered"));
      else if (mine.result === true) status = t(NS + "match.correct");
      else if (mine.result === false) status = t(NS + "match.wrong");
      $("teamStatus").textContent = status;
    }
  }

  function buildChoices(choices) {
    var wrap = $("mcChoices");
    wrap.innerHTML = "";
    choices.forEach(function (text, idx) {
      var b = document.createElement("button");
      b.className = "mc-choice";
      b.textContent = text;
      b.addEventListener("click", function () { submitAnswer(String(idx)); });
      wrap.appendChild(b);
    });
    renderMathIn(wrap);
  }

  function submitAnswer(mcInput) {
    var room = S.room;
    if (!room || room.phase !== "question" || !isTeam()) return;
    var input = typeof mcInput === "string" ? mcInput : $("textAnswerInput").value.trim();
    if (!input) return;
    socket.emit("answer", { cell: room.currentCell, input: input });
  }

  $("textAnswerGo").addEventListener("click", function () { submitAnswer(); });
  $("textAnswerInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") submitAnswer();
  });

  // ---------------- Host judging (Big Screen only) ----------------
  function renderJudge() {
    var panel = $("judgePanel");
    var q = S.judge;
    var next = q && q.pending && q.pending[0];
    var show = S.role === null && S.room && S.room.phase === "judging" && next;
    panel.classList.toggle("hidden", !show);
    if (!show) return;
    $("judgeExpected").textContent = t(NS + "judge.expected", { answer: q.expected });
    renderMathIn($("judgeExpected"));
    $("judgeSaid").textContent = t(NS + "judge.teamSaid", { team: teamName(next.team) }) + " " + next.input;
    panel.dataset.team = next.team;
  }

  function sendJudgement(correct) {
    var team = $("judgePanel").dataset.team;
    if (team) socket.emit("judge", { team: team, correct: correct });
  }
  $("judgeRight").addEventListener("click", function () { sendJudgement(true); });
  $("judgeWrong").addEventListener("click", function () { sendJudgement(false); });

  // ---------------- End screen ----------------
  function showEnd(room) {
    showView("end");
    stopTimers();
    refreshEndText(room);
    if (!reduceMotion && room.winner) launchConfetti(room.winner);
  }

  function refreshEndText(room) {
    var winner = room.winner;
    $("endTrophy").textContent = winner ? "🏆" : "🤝";
    $("endHeadline").textContent = winner ? t(NS + "end.teamWins", { team: teamLabel(winner) }) : t(NS + "end.draw");
    var recap = $("recap");
    recap.innerHTML = "";
    recap.style.gridTemplateColumns = "repeat(" + Math.min(room.playing.length, 2) + ", minmax(0, 1fr))";
    room.playing.forEach(function (team) {
      var card = document.createElement("div");
      card.className = "card " + team.toLowerCase();
      var title = document.createElement("div");
      title.className = "field-label recap-title";
      title.textContent = teamName(team);
      card.appendChild(title);
      [["end.points", room.scores[team]], ["display.correct", room.stats[team].correct], ["display.wrong", room.stats[team].wrong]].forEach(function (row) {
        var k = document.createElement("div"); k.className = "k";
        var label = document.createElement("span"); label.textContent = t(NS + row[0]);
        var value = document.createElement("span"); value.textContent = row[1];
        k.appendChild(label); k.appendChild(value); card.appendChild(k);
      });
      recap.appendChild(card);
    });
  }

  function launchConfetti(winner) {
    var canvas = $("confetti"); canvas.classList.remove("hidden");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    var ctx = canvas.getContext("2d");
    var color = { A: "#E63946", B: "#2E86FF", C: "#2BB673", D: "#9B59B6" }[winner];
    var particles = [];
    for (var i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
        vy: 2 + Math.random() * 3, vx: -1 + Math.random() * 2,
        size: 4 + Math.random() * 5, rot: Math.random() * 360,
        c: Math.random() < 0.5 ? color : "#FFC145",
      });
    }
    var start = Date.now();
    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) {
        p.y += p.vy; p.x += p.vx; p.rot += 6;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.c; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (Date.now() - start < 2200) requestAnimationFrame(frame);
      else canvas.classList.add("hidden");
    }
    frame();
  }

  document.addEventListener("i18nchange", function () {
    if (S.view === "lobby") renderLobby();
    if (S.view === "match") { S.lastOpenedAt = undefined; renderMatch(); }
    if (S.view === "end" && S.room) refreshEndText(S.room);
  });

  // ---------------- Init ----------------
  var params = new URLSearchParams(location.search);
  var prefillCode = (params.get("code") || "").toUpperCase();
  if (prefillCode.length === 4) {
    if (params.get("role") === "display") S.pendingRole = "display";
    $("joinCodeInput").value = prefillCode;
    showView("joinEntry");
    $("joinCodeGo").click();
  } else {
    showView("landing");
  }
})();
