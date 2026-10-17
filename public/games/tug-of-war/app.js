(function () {
  "use strict";

  var NS = "games.tugOfWar.";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function tierLabel(id) { return t(NS + "tiers." + id + ".label") || id; }
  function tierBlurb(id) { return t(NS + "tiers." + id + ".blurb") || ""; }

  var socket = io("/tug-of-war");
  var rope = RopeScene.build(document.getElementById("ropeScene"));
  var SHAPES = { A: "▲", B: "◆" };
  var FINISH_HOLD_MS = 2500;

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
    qIndex: 0,
    questionReady: false,
    inputBuf: "",
    lockUntil: 0,
    myPulls: [],
    clockTimer: null,
    endTimer: null,
  };

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

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

  // ---------------- Tier picker ----------------
  var tierGrid = $("tierGrid");
  function renderTierPicker() {
    tierGrid.innerHTML = "";
    TIERS.forEach(function (tier) {
      var btn = document.createElement("button");
      btn.className = "tier-btn" + (S.tierChoice === tier.id ? " active" : "");
      btn.setAttribute("data-tier", tier.id);
      btn.innerHTML = "<strong>" + tierLabel(tier.id) + "</strong><span>" + tierBlurb(tier.id) + "</span>";
      btn.addEventListener("click", function () {
        qsa(".tier-btn").forEach(function (x) { x.classList.remove("active"); });
        btn.classList.add("active");
        S.tierChoice = tier.id;
        $("createGo").disabled = !(S.tierChoice && S.createTeam);
      });
      tierGrid.appendChild(btn);
    });
  }
  renderTierPicker();

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
    var prev = S.room;
    S.room = room;
    onRoomUpdate(room, prev);
  }

  function onRoundReset() {
    S.finished = false;
    S.myPulls = [];
    S.qIndex = 0;
    S.questionReady = false;
  }

  function onRoomUpdate(room, prev) {
    if (S.view === "lobby") renderLobby();
    var enteringMatch = room.status === "active" && (S.view === "lobby" || S.view === "end");
    if (S.view === "match" || enteringMatch) {
      if (S.view !== "match") { showView("match"); setupMatchUI(); }
      renderRope(ropeEvents(prev, room));
      renderDisplayStats();
    }
    if (room.status === "finished" && !S.finished) {
      S.finished = true;
      // The rope scene holds for its finish celebration first.
      if (S.view === "match" && RopeScene.enabled) {
        if (room.winner) rope.finish(room.winner, t(NS + (room.winner === "A" ? "end.redWins" : "end.blueWins")));
        else rope.draw(t(NS + "end.draw"));
        S.endTimer = setTimeout(function () { S.endTimer = null; showEnd(room); }, FINISH_HOLD_MS);
      } else {
        showEnd(room);
      }
    }
  }

  // A move toward a team is that team's pull (10 fast, 7 medium, 5 slow);
  // a new wrong answer makes that crew stumble.
  function ropeEvents(prev, room) {
    var ev = { wrong: [] };
    if (!prev || prev.round !== room.round || !prev.stats) return ev;
    var d = room.position - prev.position;
    if (d) ev.pull = { team: d < 0 ? "A" : "B", mag: Math.abs(d) >= 9 ? 10 : Math.abs(d) >= 6 ? 7 : 5 };
    ["A", "B"].forEach(function (team) {
      if (room.stats[team].wrong > prev.stats[team].wrong) ev.wrong.push(team);
    });
    return ev;
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
    if (S.endTimer) { clearTimeout(S.endTimer); S.endTimer = null; }
    document.body.removeAttribute("data-role");
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
      if (!ack.ok) { $("createErr").textContent = ack.error ? tError(ack.error) : t(NS + "err.createFailed"); $("createGo").disabled = false; return; }
      S.role = ack.team;
      S.code = ack.room.code;
      showView("lobby");
      applyRoomUpdate(ack.room);
    });
  });

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
      $("joinRoleTier").textContent = tierLabel(ack.room.difficulty);
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
    $("lobbyTier").textContent = t(NS + "lobby.difficulty", { tier: tierLabel(d.difficulty) });
    $("lobbyCode").textContent = d.code;
    var roster = $("lobbyRoster"); roster.innerHTML = "";
    [["A", t(NS + "lobby.redTeam"), d.teamA], ["B", t(NS + "lobby.blueTeam"), d.teamB]].forEach(function (row3) {
      var row = document.createElement("div");
      row.className = "roster-row" + (row3[2] && row3[2].joined ? " ready" : "");
      row.innerHTML = '<span class="dot ' + row3[0].toLowerCase() + '"></span><span class="name">' + row3[1] + '</span><span class="status">' +
        (row3[2] && row3[2].joined ? t(NS + "lobby.ready") : t(NS + "lobby.waiting")) + '</span>';
      roster.appendChild(row);
    });
    var bothReady = d.teamA && d.teamA.joined && d.teamB && d.teamB.joined;
    var startBtn = $("lobbyStart");
    startBtn.disabled = !bothReady || d.status === "active";
    startBtn.textContent = d.status === "active" ? t(NS + "lobby.matchStarting") : (bothReady ? t(NS + "lobby.startMatch") : t(NS + "lobby.waitingBothTeams"));
  }

  // ---------------- Match ----------------
  function setupMatchUI() {
    $("matchTierLabel").textContent = tierLabel(S.room.difficulty);
    var isTeam = S.role === "A" || S.role === "B";
    document.body.setAttribute("data-role", isTeam ? "team" : "display");
    $("teamPlay").classList.toggle("hidden", !isTeam);
    $("displayPlay").classList.toggle("hidden", isTeam);
    if (isTeam) {
      var card = $("teamCard");
      card.className = "team-card " + S.role.toLowerCase();
      $("teamTag").textContent = t(NS + (S.role === "A" ? "match.teamTagRed" : "match.teamTagBlue"));
      $("teamPill").className = "team-pill " + S.role.toLowerCase();
      $("teamPill").textContent = teamLabel(S.role);
      buildKeypad();
      startCountdownThenPlay();
    }
    // A fresh scene for the round, with the 3-2-1-GO when it has not started.
    rope.reset(S.room.position);
    if (S.room.matchStartAt > Date.now()) rope.countdown(S.room.matchStartAt);
    else rope.start();
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

  function teamName(team) { return t(NS + (team === "A" ? "lobby.redTeam" : "lobby.blueTeam")); }
  function teamLabel(team) { return SHAPES[team] + " " + teamName(team); }

  function renderRope(ev) {
    if (!S.room) return;
    ev = ev || {};
    (ev.wrong || []).forEach(function (team) { rope.wrong(team); });
    if (ev.pull || S.room.position !== rope.pos) rope.setPos(S.room.position, ev.pull);
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
    submit.textContent = t(NS + "match.haul");
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
    var requestedIndex = S.qIndex;
    S.questionReady = false;
    S.inputBuf = "";
    $("answerDisplay").textContent = " ";
    socket.emit("get-question", { index: requestedIndex }, function (ack) {
      if (!ack || !ack.ok || S.qIndex !== requestedIndex) return;
      $("equationText").textContent = ack.display;
      S.questionReady = true;
    });
  }

  function submitAnswer() {
    if (!S.questionReady || Date.now() < S.lockUntil) return;
    if (S.inputBuf === "" || S.inputBuf === "-" || S.inputBuf === ".") return;
    var submittedIndex = S.qIndex;
    var input = S.inputBuf;
    S.questionReady = false;

    socket.emit("submit-answer", { index: submittedIndex, input: input }, function (ack) {
      if (!ack || !ack.ok) { S.questionReady = true; return; }
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
    $("chipStreak").textContent = t(NS + "match.streak", { n: streak });
    var stats = S.room.stats[S.role];
    var total = stats.correct + stats.wrong;
    $("chipAcc").textContent = t(NS + "match.accuracy", { value: total ? Math.round(100 * stats.correct / total) + "%" : "–" });
  }

  function renderDisplayStats() {
    if (S.role !== null || !S.room) return;
    // The team the rope leans toward has its card outlined.
    var pos = S.room.position;
    $("dispCardA").classList.toggle("leading", pos < 50);
    $("dispCardB").classList.toggle("leading", pos > 50);
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
    refreshEndText(room);
    if (!reduceMotion && room.winner) launchConfetti(room.winner);
  }

  function accuracy(s) {
    var total = (s.correct || 0) + (s.wrong || 0);
    return total ? Math.round(100 * s.correct / total) + "%" : "–";
  }

  // Champions panel plus both teams ranked by how far the rope leans their way.
  function refreshEndText(room) {
    var winner = room.winner;
    $("endHeadline").textContent = winner === "A" ? t(NS + "end.redWins") : winner === "B" ? t(NS + "end.blueWins") : t(NS + "end.draw");
    $("champion").className = "champion" + (winner ? " " + winner.toLowerCase() : " none");
    $("championTeam").textContent = winner ? teamLabel(winner) : t(NS + "end.noWinner");
    $("championScore").classList.toggle("hidden", !winner);
    if (winner) $("championCorrect").textContent = room.stats[winner].correct || 0;

    var standing = { A: 100 - room.position, B: room.position };
    var ranked = ["A", "B"].sort(function (x, y) {
      return standing[y] - standing[x] || (room.stats[y].correct || 0) - (room.stats[x].correct || 0);
    });
    var level = standing.A === standing.B && (room.stats.A.correct || 0) === (room.stats.B.correct || 0);
    var rows = $("recap");
    rows.innerHTML = "";
    ranked.forEach(function (team, i) {
      var s = room.stats[team];
      var row = document.createElement("div");
      row.className = "board-row" + (team === winner ? " win" : "");
      var rank = document.createElement("span"); rank.className = "rank"; rank.textContent = level ? 1 : i + 1;
      var tile = document.createElement("span"); tile.className = "shape-tile " + team.toLowerCase(); tile.textContent = SHAPES[team];
      var name = document.createElement("span"); name.className = "row-name"; name.textContent = teamName(team);
      row.appendChild(rank); row.appendChild(tile); row.appendChild(name);
      [["display.correct", s.correct || 0], ["display.wrong", s.wrong || 0], ["display.accuracy", accuracy(s)]].forEach(function (cell, j) {
        var c = document.createElement("span"); c.className = "stat" + (j ? " minor" : "");
        var v = document.createElement("span"); v.className = "v"; v.textContent = cell[1];
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
    renderTierPicker();
    if (S.view === "lobby") renderLobby();
    if (S.view === "match" && (S.role === "A" || S.role === "B")) $("teamPill").textContent = teamLabel(S.role);
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
