(function () {
  "use strict";

  var NS = "games.teamBoard.";
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
  function isTeam() { return S.role === "A" || S.role === "B"; }
  function teamName(team) { return t(NS + (team === "A" ? "lobby.redTeam" : "lobby.blueTeam")); }

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
      $("joinAsA").disabled = ack.room.teamA.joined;
      $("joinAsB").disabled = ack.room.teamB.joined;
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
  $("joinAsA").addEventListener("click", function () { joinAs(S.pendingCode, "A"); });
  $("joinAsB").addEventListener("click", function () { joinAs(S.pendingCode, "B"); });
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
    $("lobbyRules").textContent = t(NS + (d.penalty ? "lobby.penaltyOn" : "lobby.penaltyOff"));
    var roster = $("lobbyRoster"); roster.innerHTML = "";
    [["A", d.teamA], ["B", d.teamB]].forEach(function (pair) {
      var row = document.createElement("div");
      row.className = "roster-row" + (pair[1].joined ? " ready" : "");
      var dot = document.createElement("span"); dot.className = "dot " + pair[0].toLowerCase();
      var name = document.createElement("span"); name.className = "name"; name.textContent = teamName(pair[0]);
      var status = document.createElement("span"); status.className = "status";
      status.textContent = t(NS + (pair[1].joined ? "lobby.ready" : "lobby.waiting"));
      row.appendChild(dot); row.appendChild(name); row.appendChild(status);
      roster.appendChild(row);
    });
    var bothReady = d.teamA.joined && d.teamB.joined;
    var startBtn = $("lobbyStart");
    startBtn.disabled = !bothReady || d.status === "active";
    startBtn.textContent = d.status === "active" ? t(NS + "lobby.matchStarting") :
      t(NS + (bothReady ? "lobby.startGame" : "lobby.waitingBothTeams"));
  }

  // ---------------- Match ----------------
  function renderMatch() {
    var room = S.room;
    $("matchTitleLabel").textContent = room.title || "";
    $("scoreA").textContent = room.scores.A;
    $("scoreB").textContent = room.scores.B;
    var controlText = t(NS + (room.control === "A" ? "match.redPicks" : "match.bluePicks"));
    $("controlLabel").textContent = controlText;
    $("controlLabel").className = "control-label " + room.control.toLowerCase();

    var onBoard = room.phase === "board";
    $("boardView").classList.toggle("hidden", !onBoard);
    $("questionView").classList.toggle("hidden", onBoard);
    if (onBoard) renderBoard(room); else renderQuestion(room);
    renderJudge();
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

    ["A", "B"].forEach(function (team) {
      var el = $("attempt" + team);
      el.textContent = attemptLabel(room.attempts[team]);
      if (room.phase === "reveal" && room.attempts[team].input) el.textContent += " (" + room.attempts[team].input + ")";
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
        ? t(NS + (room.cellWinner === "A" ? "match.redWins" : "match.blueWins"), { points: q.points })
        : t(NS + "match.nobody");
      banner.textContent = head + "  " + t(NS + "match.answerWas", { answer: room.answerText });
      renderMathIn(banner);
    } else {
      banner.classList.add("hidden");
    }

    $("teamPlay").classList.toggle("hidden", !isTeam());
    if (isTeam()) {
      $("teamTag").textContent = t(NS + (S.role === "A" ? "match.teamTagRed" : "match.teamTagBlue"));
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
    var winner = room.winner;
    $("endTrophy").textContent = winner ? "🏆" : "🤝";
    $("endHeadline").textContent = t(NS + (winner === "A" ? "end.redWins" : winner === "B" ? "end.blueWins" : "end.draw"));
    ["A", "B"].forEach(function (team) {
      $("end" + team + "Score").textContent = room.scores[team];
      $("end" + team + "Correct").textContent = room.stats[team].correct;
      $("end" + team + "Wrong").textContent = room.stats[team].wrong;
    });
    if (!reduceMotion && winner) launchConfetti(winner);
  }

  function launchConfetti(winner) {
    var canvas = $("confetti"); canvas.classList.remove("hidden");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    var ctx = canvas.getContext("2d");
    var color = winner === "A" ? "#E63946" : "#2E86FF";
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
