(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var socket = io("/team-buzzer");

  var S = {
    view: "landing",
    code: null,
    role: null,
    pendingRole: null,
    pendingCode: null,
    room: null,
    lastSeenRound: null,
    finished: false,
    lastRevealAt: undefined,
    clockTimer: null,
    buzzTimer: null,
  };

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

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
    notice("Can't reach the game server right now. Check your connection and reload.");
  });

  // ---------------- Room state application ----------------
  function applyRoomUpdate(room) {
    var firstSeen = S.lastSeenRound === null;
    if (!firstSeen && room.round !== S.lastSeenRound) onRoundReset();
    S.lastSeenRound = room.round;
    S.room = room;
    onRoomUpdate(room);
  }

  function onRoundReset() {
    S.finished = false;
    S.lastRevealAt = undefined;
  }

  function onRoomUpdate(room) {
    if (S.view === "lobby") renderLobby();
    var enteringMatch = room.status === "active" && (S.view === "lobby" || S.view === "end");
    if (S.view === "match" || enteringMatch) {
      if (S.view !== "match") { showView("match"); setupMatchUI(); }
      renderMatchState(room);
    }
    if (room.status === "finished" && !S.finished) {
      S.finished = true;
      showEnd(room);
    }
  }

  socket.on("room-update", applyRoomUpdate);

  // ---------------- Navigation ----------------
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var act = el.getAttribute("data-action");
    if (act === "go-landing") { leaveRoom(); showView("landing"); }
    if (act === "go-join") { $("joinCodeInput").value = ""; $("joinErr").textContent = ""; S.pendingRole = null; showView("joinEntry"); }
    if (act === "go-display") { $("joinCodeInput").value = ""; $("joinErr").textContent = ""; S.pendingRole = "display"; showView("joinEntry"); }
  });

  function leaveRoom() {
    if (S.clockTimer) { clearInterval(S.clockTimer); S.clockTimer = null; }
    if (S.buzzTimer) { clearInterval(S.buzzTimer); S.buzzTimer = null; }
    if (socket.connected) socket.disconnect();
    socket.connect();
    S.code = null; S.role = null; S.room = null; S.lastSeenRound = null; S.finished = false;
  }

  $("joinCodeGo").addEventListener("click", function () {
    var code = $("joinCodeInput").value.trim().toUpperCase();
    var errorEl = $("joinErr");
    if (code.length !== 4) { errorEl.textContent = "Enter the 4-letter code."; return; }
    socket.emit("peek-room", { code: code }, function (ack) {
      if (!ack.ok) { errorEl.textContent = ack.error; return; }
      S.pendingCode = code;
      if (S.pendingRole === "display") {
        joinAs(code, null);
        return;
      }
      $("joinRoleCode").textContent = code;
      $("joinRoleTitle").textContent = ack.room.title || "Spotlight Showdown";
      $("joinAsA").disabled = ack.room.teamA.joined;
      $("joinAsB").disabled = ack.room.teamB.joined;
      $("joinRoleErr").textContent = "";
      showView("joinRoleSelect");
    });
  });

  function joinAs(code, team) {
    socket.emit("join-room", { code: code, team: team }, function (ack) {
      var errEl = S.view === "joinRoleSelect" ? $("joinRoleErr") : $("joinErr");
      if (!ack.ok) { errEl.textContent = ack.error; return; }
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
    var qLabel = d.questionCount + (d.questionCount === 1 ? " question" : " questions");
    $("lobbyTitle").textContent = (d.title || "Spotlight Showdown") + " · " + qLabel;
    $("lobbyCode").textContent = d.code;
    $("howtoWinScore").textContent = d.winScore;
    var roster = $("lobbyRoster"); roster.innerHTML = "";
    [["A", "Red Team", d.teamA], ["B", "Blue Team", d.teamB]].forEach(function (t) {
      var row = document.createElement("div");
      row.className = "roster-row" + (t[2] && t[2].joined ? " ready" : "");
      row.innerHTML = '<span class="dot ' + t[0].toLowerCase() + '"></span><span class="name">' + t[1] + '</span><span class="status">' +
        (t[2] && t[2].joined ? "Ready" : "Waiting…") + '</span>';
      roster.appendChild(row);
    });
    var bothReady = d.teamA && d.teamA.joined && d.teamB && d.teamB.joined;
    var startBtn = $("lobbyStart");
    startBtn.disabled = !bothReady || d.status === "active";
    startBtn.textContent = d.status === "active" ? "Match starting…" : (bothReady ? "Start Showdown" : "Waiting for both teams…");
  }

  // ---------------- Match ----------------
  function setupMatchUI() {
    $("matchTitleLabel").textContent = (S.room && S.room.title) || "";
    if (!S.clockTimer) S.clockTimer = setInterval(renderMatchMeta, 1000);
    renderMatchMeta();
  }

  function renderMatchMeta() {
    if (!S.room || !S.room.matchStartAt) { $("matchClock").textContent = "3:00"; return; }
    var remain = Math.max(0, 180000 - (Date.now() - S.room.matchStartAt));
    var m = Math.floor(remain / 60000), s = Math.floor((remain % 60000) / 1000);
    $("matchClock").textContent = m + ":" + (s < 10 ? "0" : "") + s;
  }

  function manageBuzzTimer(room) {
    if (S.buzzTimer) { clearInterval(S.buzzTimer); S.buzzTimer = null; }
    if (room.question && !room.locked && room.revealAt) {
      function tick() {
        var elapsed = Date.now() - room.revealAt;
        var pct = Math.max(0, 100 - (elapsed / room.windowMs) * 100);
        $("buzzTimerBar").style.width = pct + "%";
      }
      tick();
      S.buzzTimer = setInterval(tick, 100);
    } else {
      $("buzzTimerBar").style.width = room.locked ? "0%" : "100%";
    }
  }

  function renderMatchState(room) {
    $("scoreA").textContent = room.scores.A;
    $("scoreB").textContent = room.scores.B;

    var isTeam = S.role === "A" || S.role === "B";
    $("teamPlay").classList.toggle("hidden", !isTeam);
    $("displayPlay").classList.toggle("hidden", isTeam);
    if (isTeam) {
      var card = $("teamCard");
      $("teamTag").textContent = (S.role === "A" ? "🔴 RED TEAM" : "🔵 BLUE TEAM");
    }

    var revealChanged = S.lastRevealAt !== room.revealAt;
    if (revealChanged) {
      S.lastRevealAt = room.revealAt;
      $("resultBanner").classList.add("hidden");
      $("textAnswerInput").value = "";
    }

    if (!room.question) {
      var wait = room.matchStartAt ? room.matchStartAt - Date.now() : 0;
      $("equationText").textContent = wait > 0 ? Math.ceil(wait / 1000) : "Get ready…";
      $("shortAnswerArea").classList.add("hidden");
      $("mcArea").classList.add("hidden");
      manageBuzzTimer(room);
      return;
    }

    $("equationText").textContent = room.question.prompt;
    renderMathIn($("equationText"));

    if (room.question.type === "multiple-choice") {
      $("shortAnswerArea").classList.add("hidden");
      $("mcArea").classList.remove("hidden");
      if (revealChanged) buildChoices(room.question.choices || []);
    } else {
      $("mcArea").classList.add("hidden");
      $("shortAnswerArea").classList.remove("hidden");
    }

    $("textAnswerInput").disabled = room.locked;
    $("textAnswerGo").disabled = room.locked;
    qsa(".mc-choice", $("mcChoices")).forEach(function (b) { b.disabled = room.locked; });

    if (room.locked && room.lastResult) {
      var banner = $("resultBanner");
      banner.classList.remove("hidden");
      if (room.lastResult.winner === "A") {
        banner.textContent = "🔴 Red Team buzzed in first!";
        banner.classList.remove("wrong-team");
      } else if (room.lastResult.winner === "B") {
        banner.textContent = "🔵 Blue Team buzzed in first!";
        banner.classList.remove("wrong-team");
      } else {
        banner.textContent = "⏱ Time's up — no one got it.";
        banner.classList.add("wrong-team");
      }
    }

    manageBuzzTimer(room);
  }

  function buildChoices(choices) {
    var wrap = $("mcChoices");
    wrap.innerHTML = "";
    choices.forEach(function (text, idx) {
      var b = document.createElement("button");
      b.className = "mc-choice";
      b.textContent = text;
      b.addEventListener("click", function () { submitBuzz(String(idx)); });
      wrap.appendChild(b);
    });
    renderMathIn(wrap);
  }

  function submitBuzz(mcInput) {
    if (!S.room || !S.room.question || S.room.locked) return;
    var input;
    if (typeof mcInput === "string") {
      input = mcInput;
    } else {
      input = $("textAnswerInput").value.trim();
      if (!input) return;
    }
    var index = S.room.currentIndex;
    socket.emit("buzz-answer", { index: index, input: input }, function (ack) {
      if (!ack || !ack.ok || ack.tooLate) return;
      if (!ack.correct) {
        spawnPop("✗", false);
        if (S.role === "A" || S.role === "B") $("textAnswerInput").value = "";
      }
    });
  }

  $("textAnswerGo").addEventListener("click", function () { submitBuzz(); });
  $("textAnswerInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") submitBuzz();
  });

  function spawnPop(text, good) {
    var layer = $("popLayer");
    if (!layer) return;
    var el = document.createElement("div");
    el.className = "pop"; el.textContent = text;
    el.style.color = good ? "var(--gold)" : "#ffb3b8";
    layer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, reduceMotion ? 50 : 950);
  }

  // ---------------- End screen ----------------
  function showEnd(room) {
    showView("end");
    if (S.clockTimer) { clearInterval(S.clockTimer); S.clockTimer = null; }
    if (S.buzzTimer) { clearInterval(S.buzzTimer); S.buzzTimer = null; }
    var winner = room.winner;
    $("endTrophy").textContent = winner ? "🏆" : "🤝";
    $("endHeadline").textContent = winner === "A" ? "Red Team wins the showdown!" :
      winner === "B" ? "Blue Team wins the showdown!" : "It's a draw!";
    fillEndCard("A", room.scores.A, room.stats.A);
    fillEndCard("B", room.scores.B, room.stats.B);
    if (!reduceMotion && winner) launchConfetti(winner);
  }

  function fillEndCard(team, score, stats) {
    $("end" + team + "Score").textContent = score;
    $("end" + team + "Correct").textContent = (stats && stats.correct) || 0;
    $("end" + team + "Wrong").textContent = (stats && stats.wrong) || 0;
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
