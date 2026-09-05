(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TIER_LABEL = {};
  TIERS.forEach(function (t) { TIER_LABEL[t.id] = t.label; });

  var socket = io("/tug-of-war");

  var S = {
    view: "landing",
    code: null,
    role: null,
    tierChoice: null,
    createTeam: null,
    pendingRole: null,
    pendingCode: null,
    room: null,
    lastSeenRound: null,
    finished: false,
    question: null,
    qStartTs: 0,
    inputBuf: "",
    lockUntil: 0,
    myPulls: [],
    clockTimer: null,
  };

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

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

  // ---------------- Tier picker ----------------
  var tierGrid = $("tierGrid");
  TIERS.forEach(function (t) {
    var btn = document.createElement("button");
    btn.className = "tier-btn";
    btn.setAttribute("data-tier", t.id);
    btn.innerHTML = "<strong>" + t.label + "</strong><span>" + t.blurb + "</span>";
    btn.addEventListener("click", function () {
      qsa(".tier-btn").forEach(function (x) { x.classList.remove("active"); });
      btn.classList.add("active");
      S.tierChoice = t.id;
      $("createGo").disabled = !(S.tierChoice && S.createTeam);
    });
    tierGrid.appendChild(btn);
  });
  qsa("#createTeamPick .team-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      qsa("#createTeamPick .team-btn").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      S.createTeam = b.getAttribute("data-team");
      $("createGo").disabled = !(S.tierChoice && S.createTeam);
    });
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
    S.question = null;
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
    if (act === "go-create") { resetCreateForm(); showView("createSetup"); }
    if (act === "go-join") { $("joinCodeInput").value = ""; $("joinErr").textContent = ""; S.pendingRole = null; showView("joinEntry"); }
    if (act === "go-display") { $("joinCodeInput").value = ""; $("joinErr").textContent = ""; S.pendingRole = "display"; showView("joinEntry"); }
  });

  function leaveRoom() {
    if (S.clockTimer) { clearInterval(S.clockTimer); S.clockTimer = null; }
    if (socket.connected) socket.disconnect();
    socket.connect();
    S.code = null; S.role = null; S.room = null; S.lastSeenRound = null; S.finished = false;
  }

  function resetCreateForm() {
    S.tierChoice = null; S.createTeam = null;
    qsa(".tier-btn").forEach(function (b) { b.classList.remove("active"); });
    qsa("#createTeamPick .team-btn").forEach(function (b) { b.classList.remove("active"); });
    $("createGo").disabled = true;
    $("createErr").textContent = "";
  }

  $("createGo").addEventListener("click", function () {
    $("createGo").disabled = true;
    socket.emit("create-room", { difficulty: S.tierChoice, team: S.createTeam }, function (ack) {
      if (!ack.ok) { $("createErr").textContent = ack.error || "Couldn't create room."; $("createGo").disabled = false; return; }
      S.role = ack.team;
      S.code = ack.room.code;
      showView("lobby");
      applyRoomUpdate(ack.room);
    });
  });

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
      $("joinRoleTier").textContent = TIER_LABEL[ack.room.difficulty] || ack.room.difficulty;
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
    $("lobbyTier").textContent = "Difficulty: " + (TIER_LABEL[d.difficulty] || d.difficulty);
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
    startBtn.textContent = d.status === "active" ? "Match starting…" : (bothReady ? "Start Match" : "Waiting for both teams…");
  }

  // ---------------- Match ----------------
  function setupMatchUI() {
    $("matchTierLabel").textContent = TIER_LABEL[S.room.difficulty] || "";
    var isTeam = S.role === "A" || S.role === "B";
    $("teamPlay").classList.toggle("hidden", !isTeam);
    $("displayPlay").classList.toggle("hidden", isTeam);
    if (isTeam) {
      var card = $("teamCard");
      card.className = "team-card " + S.role.toLowerCase();
      $("teamTag").textContent = (S.role === "A" ? "🔴 RED TEAM" : "🔵 BLUE TEAM");
      buildKeypad();
      startCountdownThenPlay();
    }
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

  function buildKeypad() {
    var kp = $("keypad"); kp.innerHTML = "";
    var keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    keys = keys.concat([S.room.difficulty === "champion" ? "±" : ".", "0", "⌫"]);
    keys.forEach(function (k) {
      var b = document.createElement("button");
      b.className = "key";
      b.textContent = k;
      b.addEventListener("click", function () { onKey(k); });
      kp.appendChild(b);
    });
    var submit = document.createElement("button");
    submit.className = "key submit"; submit.style.gridColumn = "span 3";
    submit.textContent = "Haul ✓";
    submit.addEventListener("click", submitAnswer);
    kp.appendChild(submit);
  }

  function onKey(k) {
    if (Date.now() < S.lockUntil) return;
    if (k === "⌫") { S.inputBuf = S.inputBuf.slice(0, -1); }
    else if (k === "±") { S.inputBuf = S.inputBuf.charAt(0) === "-" ? S.inputBuf.slice(1) : "-" + S.inputBuf; }
    else if (k === "." && S.inputBuf.indexOf(".") === -1) { S.inputBuf += (S.inputBuf === "" ? "0." : "."); }
    else if (k !== "." && S.inputBuf.length < 6) { S.inputBuf += k; }
    $("answerDisplay").textContent = S.inputBuf || " ";
  }

  document.addEventListener("keydown", function (e) {
    if (S.view !== "match" || !(S.role === "A" || S.role === "B")) return;
    if (e.key >= "0" && e.key <= "9") onKey(e.key);
    else if (e.key === "-") onKey("±");
    else if (e.key === "." ) onKey(".");
    else if (e.key === "Backspace") onKey("⌫");
    else if (e.key === "Enter") submitAnswer();
  });

  function nextQuestion() {
    S.question = generateProblem(S.room.difficulty);
    S.qStartTs = Date.now();
    S.inputBuf = "";
    $("equationText").textContent = S.question.display;
    $("answerDisplay").textContent = " ";
  }

  function pullMagnitude(timeMs) {
    if (timeMs < 5000) return 10;
    if (timeMs <= 10000) return 7;
    return 5;
  }

  function submitAnswer() {
    if (!S.question || Date.now() < S.lockUntil) return;
    if (S.inputBuf === "" || S.inputBuf === "-" || S.inputBuf === ".") return;
    var correct = S.question.checkAnswer(S.inputBuf);
    var elapsedMs = Date.now() - S.qStartTs;
    var mag = correct ? pullMagnitude(elapsedMs) : 0;

    socket.emit("submit-answer", { correct: correct, timeMs: elapsedMs });
    S.myPulls.push({ c: correct });

    spawnPop(correct ? ("+" + mag) : "✗", correct);
    if (!correct) {
      $("teamCard").classList.remove("flash-wrong"); void $("teamCard").offsetWidth; $("teamCard").classList.add("flash-wrong");
      S.lockUntil = Date.now() + 700;
      setTimeout(nextQuestion, 700);
    } else {
      nextQuestion();
    }
    renderTeamStatChips();
  }

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
    $("endHeadline").textContent = winner === "A" ? "Red Team hauls the win!" :
      winner === "B" ? "Blue Team hauls the win!" : "It's a draw!";
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

  showView("landing");
})();
