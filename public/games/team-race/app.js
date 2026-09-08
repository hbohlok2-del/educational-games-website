(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var socket = io("/team-race");

  var S = {
    view: "landing",
    code: null,
    role: null,
    pendingRole: null,
    pendingCode: null,
    room: null,
    lastSeenRound: null,
    finished: false,
    qIndex: 0,
    questionReady: false,
    currentType: "short-answer",
    lockUntil: 0,
    myPulls: [],
    clockTimer: null,
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
    S.myPulls = [];
    S.qIndex = 0;
    S.questionReady = false;
  }

  function onRoomUpdate(room) {
    if (S.view === "lobby") renderLobby();
    var enteringMatch = room.status === "active" && (S.view === "lobby" || S.view === "end");
    if (S.view === "match" || enteringMatch) {
      if (S.view !== "match") { showView("match"); setupMatchUI(); }
      renderRope();
      renderDisplayStats();
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
      $("joinRoleTitle").textContent = ack.room.title || "Team Race";
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
    $("lobbyTitle").textContent = (d.title || "Team Race") + " · " + qLabel;
    $("lobbyCode").textContent = d.code;
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
    startBtn.textContent = d.status === "active" ? "Match starting…" : (bothReady ? "Start Race" : "Waiting for both teams…");
  }

  // ---------------- Match ----------------
  function setupMatchUI() {
    $("matchTitleLabel").textContent = (S.room && S.room.title) || "";
    var isTeam = S.role === "A" || S.role === "B";
    $("teamPlay").classList.toggle("hidden", !isTeam);
    $("displayPlay").classList.toggle("hidden", isTeam);
    if (isTeam) {
      var card = $("teamCard");
      card.className = "team-card " + S.role.toLowerCase();
      $("teamTag").textContent = (S.role === "A" ? "🔴 RED TEAM" : "🔵 BLUE TEAM");
      startCountdownThenPlay();
    }
    var isRocket = S.room && S.room.theme === "rocket";
    $("ropeWrap").classList.toggle("hidden", isRocket);
    $("rocketWrap").classList.toggle("hidden", !isRocket);
    renderRope();
    if (!S.clockTimer) S.clockTimer = setInterval(renderMatchMeta, 1000);
    renderMatchMeta();
  }

  function renderMatchMeta() {
    if (!S.room || !S.room.matchStartAt) { $("matchClock").textContent = "3:00"; return; }
    var remain = Math.max(0, 180000 - (Date.now() - S.room.matchStartAt));
    var m = Math.floor(remain / 60000), s = Math.floor((remain % 60000) / 1000);
    $("matchClock").textContent = m + ":" + (s < 10 ? "0" : "") + s;
  }

  function renderRope() {
    var pos = S.room ? S.room.position : 50;
    var marker = $("ropeMarker");
    if (marker) marker.style.left = pos + "%";
    var track = $("ropeTrack");
    if (track) track.classList.toggle("tense", (pos < 18 || pos > 82) && !reduceMotion);
    renderRocketTrack(pos);
  }

  var ROCKET_PAD_PCT = 6;
  var ROCKET_FINISH_PCT = 80;
  function renderRocketTrack(pos) {
    var progressA = Math.max(0, 50 - pos) / 50;
    var progressB = Math.max(0, pos - 50) / 50;
    var bottomA = ROCKET_PAD_PCT + progressA * (ROCKET_FINISH_PCT - ROCKET_PAD_PCT);
    var bottomB = ROCKET_PAD_PCT + progressB * (ROCKET_FINISH_PCT - ROCKET_PAD_PCT);
    var rocketA = $("rocketA"), rocketB = $("rocketB");
    if (rocketA) rocketA.style.bottom = bottomA + "%";
    if (rocketB) rocketB.style.bottom = bottomB + "%";
  }

  function startCountdownThenPlay() {
    function tick() {
      if (!S.room || !S.room.matchStartAt) return;
      var wait = S.room.matchStartAt - Date.now();
      if (wait > 0) {
        $("equationText").textContent = Math.ceil(wait / 1000);
        setTimeout(tick, 200);
      } else {
        nextQuestion();
      }
    }
    tick();
  }

  function nextQuestion() {
    var requestedIndex = S.qIndex;
    S.questionReady = false;
    $("textAnswerInput").value = "";
    socket.emit("get-question", { index: requestedIndex }, function (ack) {
      if (!ack || !ack.ok || S.qIndex !== requestedIndex) return;
      S.currentType = ack.type;
      $("equationText").textContent = ack.prompt;
      renderMathIn($("equationText"));
      if (ack.type === "multiple-choice") {
        $("shortAnswerArea").classList.add("hidden");
        $("mcArea").classList.remove("hidden");
        buildChoices(ack.choices || []);
      } else {
        $("mcArea").classList.add("hidden");
        $("shortAnswerArea").classList.remove("hidden");
        $("textAnswerInput").focus();
      }
      S.questionReady = true;
    });
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
    if (!S.questionReady || Date.now() < S.lockUntil) return;
    var input;
    if (typeof mcInput === "string") {
      input = mcInput;
    } else {
      input = $("textAnswerInput").value.trim();
      if (!input) return;
    }
    var submittedIndex = S.qIndex;
    S.questionReady = false;
    if (S.currentType === "multiple-choice") {
      qsa(".mc-choice", $("mcChoices")).forEach(function (b) { b.disabled = true; });
    }

    socket.emit("submit-answer", { index: submittedIndex, input: input }, function (ack) {
      if (!ack || !ack.ok) {
        S.questionReady = true;
        if (S.currentType === "multiple-choice") qsa(".mc-choice", $("mcChoices")).forEach(function (b) { b.disabled = false; });
        return;
      }
      var correct = ack.correct, mag = ack.mag;
      S.myPulls.push({ c: correct });

      spawnPop(correct ? ("+" + mag) : "✗", correct);
      if (!correct) {
        $("teamCard").classList.remove("flash-wrong"); void $("teamCard").offsetWidth; $("teamCard").classList.add("flash-wrong");
        S.lockUntil = Date.now() + 700;
        setTimeout(function () { S.qIndex++; nextQuestion(); }, 700);
      } else {
        S.qIndex++;
        nextQuestion();
      }
      renderTeamStatChips();
    });
  }

  $("textAnswerGo").addEventListener("click", function () { submitAnswer(); });
  $("textAnswerInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") submitAnswer();
  });

  function spawnPop(text, good) {
    var layer = $("popLayer");
    var el = document.createElement("div");
    el.className = "pop"; el.textContent = text;
    el.style.color = good ? "var(--gold)" : "#ffb3b8";
    layer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, reduceMotion ? 50 : 950);
  }

  function renderTeamStatChips() {
    if (!(S.role === "A" || S.role === "B") || !S.room) return;
    var streak = 0;
    for (var i = S.myPulls.length - 1; i >= 0; i--) { if (S.myPulls[i].c) streak++; else break; }
    $("chipStreak").textContent = "Streak " + streak;
    var stats = S.room.stats[S.role];
    var total = stats.correct + stats.wrong;
    $("chipAcc").textContent = "Accuracy " + (total ? Math.round(100 * stats.correct / total) + "%" : "–");
  }

  function renderDisplayStats() {
    if (S.role !== null || !S.room) return;
    ["A", "B"].forEach(function (team) {
      var s = S.room.stats[team];
      var total = s.correct + s.wrong;
      $("disp" + team + "Correct").textContent = s.correct;
      $("disp" + team + "Wrong").textContent = s.wrong;
      $("disp" + team + "Acc").textContent = total ? Math.round(100 * s.correct / total) + "%" : "–";
    });
  }

  // ---------------- End screen ----------------
  function showEnd(room) {
    showView("end");
    if (S.clockTimer) { clearInterval(S.clockTimer); S.clockTimer = null; }
    var winner = room.winner;
    $("endTrophy").textContent = winner ? "🏆" : "🤝";
    $("endHeadline").textContent = winner === "A" ? "Red Team wins the race!" :
      winner === "B" ? "Blue Team wins the race!" : "It's a draw!";
    fillEndCard("A", room.stats.A); fillEndCard("B", room.stats.B);
    renderRope();
    if (!reduceMotion && winner) launchConfetti(winner);
  }

  function fillEndCard(team, stats) {
    var c = stats.correct || 0, w = stats.wrong || 0, tot = c + w;
    $("end" + team + "Correct").textContent = c;
    $("end" + team + "Wrong").textContent = w;
    $("end" + team + "Acc").textContent = tot ? Math.round(100 * c / tot) + "%" : "–";
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
