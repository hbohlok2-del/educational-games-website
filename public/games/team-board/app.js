(function () {
  "use strict";

  var NS = "games.teamBoard.";
  var TEAMS = ["A", "B", "C", "D"];
  // Team shapes, so a team never depends on color alone.
  var SHAPES = { A: "▲", B: "◆", C: "●", D: "■" };
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
    revealedRound: null,
  };
  var RING = 2 * Math.PI * 52; // timer ring circumference (r = 52 in the SVG)

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function isTeam() { return TEAMS.indexOf(S.role) !== -1; }
  function teamName(team) { return t(NS + "teams." + team); }
  function teamLabel(team) { return SHAPES[team] + " " + teamName(team); }
  function joinedCount(room) { return room.teamSlots.filter(function (x) { return room.teams[x].joined; }).length; }

  function showView(name) {
    S.view = name;
    document.body.setAttribute("data-screen", name); // the shared site header shows on the front door only
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
    var prev = S.room;
    S.room = room;
    if (S.view === "lobby") renderLobby();
    var enteringMatch = room.status === "active" && (S.view === "lobby" || S.view === "end");
    if (S.view === "match" || enteringMatch) {
      if (S.view !== "match") showView("match");
      renderMatch(prev && prev.round === room.round ? prev : null);
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
    S.code = null; S.role = null; S.room = null; S.judge = null; S.lastSeenRound = null; S.finished = false; S.revealedRound = null;
    document.body.removeAttribute("data-role");
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
  // Only the seats the teacher chose (2 or 4), and free ones only. Once a
  // game has started, only its own teams can rejoin.
  function renderTeamPick(room) {
    var wrap = $("teamPick");
    wrap.innerHTML = "";
    room.teamSlots.forEach(function (team) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "team-btn " + team.toLowerCase();
      b.textContent = SHAPES[team] + " " + t(NS + "join.joinTeam", { team: teamName(team) });
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
    d.teamSlots.forEach(function (team) {
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
  // prev is the previous update of the same round (null on entry), used to
  // spot what just happened for the animations.
  function renderMatch(prev) {
    var room = S.room;
    document.body.setAttribute("data-role", isTeam() ? "team" : "display");
    $("matchTitleLabel").textContent = room.title || "";
    $("controlLabel").textContent = t(NS + "match.teamPicks", { team: teamLabel(room.control) });
    $("controlLabel").className = "control-label " + room.control.toLowerCase();
    if (isTeam()) {
      $("teamPill").className = "team-pill " + S.role.toLowerCase();
      $("teamPill").textContent = teamLabel(S.role);
      $("myScore").textContent = t(NS + "match.points", { n: room.scores[S.role] });
    }

    // Where the picked square was, before the board is hidden.
    var picked = null;
    if (prev && prev.phase === "board" && room.phase === "question") {
      var cellEl = document.querySelector('.board-cell[data-cell="' + room.currentCell + '"]');
      if (cellEl) picked = cellEl.getBoundingClientRect();
    }

    renderScoreboard(room, prev);
    var onBoard = room.phase === "board";
    $("boardView").classList.toggle("hidden", !onBoard);
    $("questionView").classList.toggle("hidden", onBoard);
    if (onBoard) renderBoard(room); else renderQuestion(room);
    renderJudge();
    if (prev) playEvents(prev, room, picked);
  }

  function playEvents(prev, room, picked) {
    if (picked) BoardFX.zoom(picked, room.cells[room.currentCell].points, $("questionScreen"));
    var onQuestion = room.phase !== "board";
    room.playing.forEach(function (team) {
      var was = prev.attempts && prev.attempts[team], now = room.attempts[team];
      if (onQuestion && was && now) {
        if (!was.answered && now.answered) BoardFX.pop($("attempt" + team));
        if (was.result !== false && now.result === false) BoardFX.shake($("attempt" + team));
      }
      var delta = room.scores[team] - prev.scores[team];
      if (delta) BoardFX.fly(onQuestion ? $("questionScreen") : $("chip" + team), $("chip" + team), delta);
    });
    if (prev.control !== room.control) BoardFX.control($("chip" + room.control));
  }

  function renderScoreboard(room, prev) {
    var board = $("scoreboard");
    board.innerHTML = "";
    board.style.gridTemplateColumns = "repeat(" + room.playing.length + ", minmax(0, 1fr))";
    room.playing.forEach(function (team) {
      var chip = document.createElement("div");
      chip.className = "score-chip " + team.toLowerCase() + (room.control === team ? " in-control" : "");
      chip.id = "chip" + team;
      var lab = document.createElement("span"); lab.className = "lab"; lab.textContent = teamLabel(team);
      var val = document.createElement("span"); val.className = "val"; val.setAttribute("dir", "ltr");
      chip.appendChild(lab); chip.appendChild(val);
      board.appendChild(chip);
      BoardFX.count(val, prev ? prev.scores[team] : room.scores[team], room.scores[team]);
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
        b.setAttribute("data-cell", cell.id);
        // A won square shows its winner's shape; one nobody won stays empty.
        b.textContent = cell.used ? (cell.wonBy ? SHAPES[cell.wonBy] : "") : cell.points;
        b.disabled = cell.used || !clickable;
        b.setAttribute("aria-label", name + " " + cell.points);
        b.addEventListener("click", function () { socket.emit("pick-cell", { cell: cell.id }); });
        col.appendChild(b);
      });
      board.appendChild(col);
    });
    if (S.revealedRound !== room.round) {
      S.revealedRound = room.round;
      BoardFX.reveal(board);
    }
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
    room.playing.forEach(function (team) {
      var a = room.attempts[team];
      var box = document.createElement("div");
      box.className = "attempt " + team.toLowerCase() +
        (a.result === true ? " ok" : a.result === false ? " bad" : a.answered ? " done" : "");
      box.id = "attempt" + team;
      var name = document.createElement("span"); name.textContent = teamLabel(team);
      var status = document.createElement("span");
      status.textContent = attemptLabel(a) + (room.phase === "reveal" && a.input ? " (" + a.input + ")" : "");
      box.appendChild(name); box.appendChild(status);
      attempts.appendChild(box);
    });

    // The timer ring runs only while answers are open; it turns red for the
    // last 5 seconds.
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    var ring = $("timerRing");
    ring.style.strokeDasharray = RING;
    if (room.phase === "question") {
      var tick = function () {
        var left = Math.max(0, room.windowMs - (Date.now() - room.openedAt));
        ring.style.strokeDashoffset = RING * (1 - left / room.windowMs);
        $("timerNum").textContent = Math.ceil(left / 1000);
        $("qTimer").classList.toggle("low", left <= 5000);
      };
      tick();
      S.timer = setInterval(tick, 100);
    } else {
      ring.style.strokeDashoffset = RING;
      $("timerNum").textContent = "";
      $("qTimer").classList.remove("low");
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

  // Champions panel plus a leaderboard ranked by points, then correct
  // answers; teams level on both share a place.
  function refreshEndText(room) {
    var winner = room.winner;
    $("endHeadline").textContent = winner ? t(NS + "end.teamWins", { team: teamName(winner) }) : t(NS + "end.draw");
    $("champion").className = "champion" + (winner ? " " + winner.toLowerCase() : " none");
    $("championTeam").textContent = winner ? teamLabel(winner) : t(NS + "end.noWinner");
    $("championScore").classList.toggle("hidden", !winner);
    if (winner) $("championPoints").textContent = room.scores[winner];

    var key = function (team) { return [room.scores[team], room.stats[team].correct || 0]; };
    var ranked = room.playing.slice().sort(function (x, y) {
      return room.scores[y] - room.scores[x] || (room.stats[y].correct || 0) - (room.stats[x].correct || 0);
    });
    var rows = $("recap");
    rows.innerHTML = "";
    var place = 0;
    ranked.forEach(function (team, i) {
      var prevTeam = ranked[i - 1];
      if (!prevTeam || key(prevTeam).join() !== key(team).join()) place = i + 1;
      var row = document.createElement("div");
      row.className = "board-row" + (team === winner ? " win" : "");
      var rank = document.createElement("span"); rank.className = "rank"; rank.textContent = place;
      var tile = document.createElement("span"); tile.className = "shape-tile " + team.toLowerCase(); tile.textContent = SHAPES[team];
      var name = document.createElement("span"); name.className = "row-name"; name.textContent = teamName(team);
      row.appendChild(rank); row.appendChild(tile); row.appendChild(name);
      [["end.points", room.scores[team]], ["display.correct", room.stats[team].correct || 0], ["display.wrong", room.stats[team].wrong || 0]].forEach(function (cell, j) {
        var c = document.createElement("span"); c.className = "stat" + (j ? " minor" : "");
        var v = document.createElement("span"); v.className = "v"; v.setAttribute("dir", "ltr"); v.textContent = cell[1];
        var k = document.createElement("span"); k.className = "k"; k.textContent = t(NS + cell[0]);
        c.appendChild(v); c.appendChild(k); row.appendChild(c);
      });
      rows.appendChild(row);
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
