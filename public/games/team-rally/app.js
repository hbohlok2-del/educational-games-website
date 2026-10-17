(function () {
  "use strict";

  var NS = "games.teamRally.";
  var TEAMS = ["A", "B", "C", "D"];
  // Team shapes, so a team never depends on color alone.
  var SHAPES = { A: "▲", B: "◆", C: "●", D: "■" };
  var COLORS = { A: "#E63946", B: "#2E86FF", C: "#2BB673", D: "#9B59B6" };
  var gsap = window.gsap;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motion = !!gsap && !reduceMotion;

  var socket = io("/team-rally");

  var S = {
    view: "landing",
    code: null,
    role: null,
    pendingRole: null,
    pendingCode: null,
    peekRoom: null,
    room: null,
    lastSeenRound: null,
    finished: false,
    mine: null, // this team's private state from the server
    shownKey: null, // "station:q" of the question on the phone
    showing: "question", // question | cleared (the phone holds the cleared card until Continue)
    mapKey: null,
    points: [],
    clockTimer: null,
    lockTimer: null,
    countdownTimers: [],
  };

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function isTeam() { return TEAMS.indexOf(S.role) !== -1; }
  function teamName(team) { return t(NS + "teams." + team); }
  function teamLabel(team) { return SHAPES[team] + " " + teamName(team); }
  function joinedCount(room) { return room.teamSlots.filter(function (x) { return room.teams[x].joined; }).length; }
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  }

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
  socket.on("connect_error", function () { notice(t(NS + "notice.connectError")); });

  wireCopyButton($("copyLobbyCode"), function () { return $("lobbyCode").textContent; });

  // ---------------- Room state ----------------
  function applyRoomUpdate(room) {
    var firstSeen = S.lastSeenRound === null;
    if (!firstSeen && room.round !== S.lastSeenRound) { S.finished = false; S.showing = "question"; S.mapKey = null; }
    S.lastSeenRound = room.round;
    var prev = S.room;
    S.room = room;
    if (S.view === "lobby") renderLobby();
    var enteringMatch = room.status === "active" && (S.view === "lobby" || S.view === "end");
    if (S.view === "match" || enteringMatch) {
      if (S.view !== "match") { showView("match"); setupMatch(); }
      renderMatch(prev && prev.round === room.round ? prev : null);
    }
    if (room.status === "finished" && !S.finished) {
      S.finished = true;
      // A short pause on the map so the class sees the last move.
      setTimeout(function () { showEnd(S.room); }, motion ? 1200 : 0);
    }
  }
  socket.on("room-update", applyRoomUpdate);
  // The teacher moved this team on: show the cleared station as if solved.
  socket.on("skipped", function (msg) { if (msg && msg.cleared) showCleared(msg.cleared); refreshMine(); });

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
    if (S.clockTimer) { clearInterval(S.clockTimer); S.clockTimer = null; }
    if (S.lockTimer) { clearInterval(S.lockTimer); S.lockTimer = null; }
    S.countdownTimers.forEach(clearTimeout); S.countdownTimers = [];
  }

  function leaveRoom() {
    stopTimers();
    if (socket.connected) socket.disconnect();
    socket.connect();
    S.code = null; S.role = null; S.room = null; S.mine = null; S.lastSeenRound = null; S.finished = false; S.mapKey = null;
    document.body.removeAttribute("data-role");
  }

  $("joinCodeGo").addEventListener("click", function () {
    var code = $("joinCodeInput").value.trim().toUpperCase();
    var errorEl = $("joinErr");
    if (code.length !== 4) { errorEl.textContent = t(NS + "err.enterCode"); return; }
    socket.emit("peek-room", { code: code }, function (ack) {
      if (!ack.ok) { errorEl.textContent = tError(ack.error); return; }
      S.pendingCode = code;
      S.peekRoom = ack.room;
      if (S.pendingRole === "display") { joinAs(code, null); return; }
      $("joinRoleCode").textContent = code;
      $("joinRoleTitle").textContent = ack.room.title || t(NS + "defaultTitle");
      renderTeamPick(ack.room);
      $("joinRoleErr").textContent = "";
      showView("joinRoleSelect");
    });
  });
  $("joinCodeInput").addEventListener("keydown", function (e) { if (e.key === "Enter") $("joinCodeGo").click(); });

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

  $("lobbyStart").addEventListener("click", function () { if (!$("lobbyStart").disabled) socket.emit("start-match"); });
  $("endRematch").addEventListener("click", function () { socket.emit("rematch"); });

  // ---------------- Lobby ----------------
  function renderLobby() {
    var d = S.room; if (!d) return;
    $("lobbyTitle").textContent = d.title || t(NS + "defaultTitle");
    $("lobbyCode").textContent = d.code;
    $("lobbyRules").textContent = t(NS + "lobby.rules", { stations: d.stationCount, questions: d.questionCount, minutes: d.minutes });
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
  function setupMatch() {
    var team = isTeam();
    document.body.setAttribute("data-role", team ? "team" : "display");
    $("displayPlay").classList.toggle("hidden", team);
    $("teamPlay").classList.toggle("hidden", !team);
    if (team) {
      $("teamPill").className = "team-pill " + S.role.toLowerCase();
      $("teamPill").textContent = teamLabel(S.role);
    }
    if (!S.clockTimer) S.clockTimer = setInterval(renderClock, 500);
    renderClock();
  }

  function renderClock() {
    var room = S.room;
    if (!room || !room.endsAt) return;
    var left = (room.endsAt - Math.max(Date.now(), room.matchStartAt)) / 1000;
    if (room.status === "finished") left = 0;
    $("matchClock").textContent = fmt(left);
    $("clockRing").classList.toggle("low", left <= 60);
    // Team times keep running between updates until a team finishes.
    if (!isTeam() && room.status === "active") {
      room.playing.forEach(function (team) {
        var p = room.progress[team], el = $("time" + team);
        if (!el || p.finishedAt || Date.now() < room.matchStartAt) return;
        el.textContent = t(NS + "match.time", { t: fmt((Date.now() - room.matchStartAt) / 1000 + p.penalty) });
      });
    }
  }

  function renderMatch(prev) {
    var room = S.room;
    $("matchTitleLabel").textContent = room.title || "";
    if (isTeam()) {
      var mineNow = room.progress[S.role];
      var minePrev = prev && prev.progress[S.role];
      if (!S.mine || !minePrev || minePrev.station !== mineNow.station || minePrev.q !== mineNow.q || minePrev.phase !== mineNow.phase || minePrev.lockUntil !== mineNow.lockUntil) refreshMine();
      renderLetters($("myLetters"), mineNow.letters, room.stationCount, false);
    } else {
      renderMap(room, prev);
      renderCards(room, prev);
    }
  }

  // ---------------- Big Screen ----------------
  function mapLabels() {
    var labels = t(NS + "map.labels");
    return Array.isArray(labels) ? labels : [];
  }

  function renderMap(room, prev) {
    var svg = $("rallyMap");
    var key = room.code + ":" + room.round + ":" + currentLang();
    var fresh = S.mapKey !== key;
    if (fresh) {
      S.mapKey = key;
      S.points = RallyMap.build(svg, room.stationCount, mapLabels(), currentLang() === "ar");
    }
    RallyMap.tokens(svg, S.points, room);
    if (fresh && room.matchStartAt > Date.now()) introAnimation(svg, room.matchStartAt);
    if (!prev || !motion) return;
    room.playing.forEach(function (team) {
      var a = prev.progress[team], b = room.progress[team];
      var token = svg.querySelector('.rm-token[data-team="' + team + '"]');
      if (!a || !b || !token) return;
      if (b.cleared > a.cleared) {
        // Hop from the old station to the new one.
        var from = S.points[a.station == null ? S.points.length - 1 : a.station], to = S.points[b.station == null ? S.points.length - 1 : b.station];
        if (from && to) gsap.fromTo(token.querySelector(".rm-token-move"), { x: from.x - to.x, y: from.y - to.y - 20 }, { x: 0, y: 0, duration: 0.7, ease: "power2.out" });
      } else if (b.q > a.q) {
        gsap.fromTo(token.querySelector(".rm-token-body"), { scale: 1 }, { scale: 1.35, duration: 0.2, yoyo: true, repeat: 1, transformOrigin: "50% 50%" });
      } else if (b.lockUntil !== a.lockUntil && b.lockUntil > Date.now()) {
        gsap.fromTo(token.querySelector(".rm-token-body"), { x: 0 }, { x: 5, duration: 0.06, repeat: 5, yoyo: true, onComplete: function () { gsap.set(token.querySelector(".rm-token-body"), { x: 0 }); } });
      }
    });
  }

  // Start of a round: the route draws itself, tokens drop in, then 3-2-1-GO.
  function introAnimation(svg, startAt) {
    var count = $("mapCountdown");
    S.countdownTimers.forEach(clearTimeout); S.countdownTimers = [];
    ["3", "2", "1", "GO!"].forEach(function (txt, n) {
      var at = startAt - (3 - n) * 1000 - Date.now();
      if (at < -600) return;
      S.countdownTimers.push(setTimeout(function () {
        count.textContent = txt;
        count.classList.toggle("go", txt === "GO!");
        if (motion) {
          gsap.fromTo(count, { scale: 2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" });
          gsap.to(count, { opacity: 0, duration: 0.3, delay: 0.6 });
        } else {
          count.style.opacity = txt === "GO!" ? 0 : 1;
        }
      }, Math.max(0, at)));
    });
    if (!motion) return;
    var route = svg.querySelector(".rm-route");
    var len = route.getTotalLength();
    gsap.fromTo(route, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut", onComplete: function () { route.style.strokeDasharray = ""; route.style.strokeDashoffset = ""; } });
    gsap.fromTo(svg.querySelectorAll(".rm-token-move"), { y: -80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, delay: 1.2, ease: "bounce.out" });
  }

  // The team ahead: most stations, then the lowest time.
  function leaderOf(room) {
    var order = room.playing.slice().sort(function (x, y) {
      var a = room.progress[x], b = room.progress[y];
      return b.cleared - a.cleared || a.time - b.time;
    });
    var a = room.progress[order[0]], b = room.progress[order[1]];
    if (!a || a.cleared === 0 || (b && b.cleared === a.cleared && b.time === a.time)) return null;
    return order[0];
  }

  function renderCards(room, prev) {
    var wrap = $("teamCards");
    var leader = leaderOf(room);
    wrap.innerHTML = "";
    room.playing.forEach(function (team) {
      var p = room.progress[team];
      var card = document.createElement("div");
      card.className = "rally-card " + team.toLowerCase() + (team === leader ? " leading" : "");
      card.id = "card" + team;
      var head = document.createElement("div"); head.className = "rc-head"; head.textContent = teamLabel(team);
      var score = document.createElement("div"); score.className = "rc-score"; score.setAttribute("dir", "ltr");
      score.textContent = p.cleared + " / " + room.stationCount;
      var tiles = document.createElement("div"); tiles.className = "letter-tiles small"; tiles.setAttribute("dir", "ltr");
      renderLetters(tiles, p.letters, room.stationCount, true);
      var meta = document.createElement("div"); meta.className = "rc-meta";
      var time = document.createElement("span"); time.id = "time" + team; time.textContent = t(NS + "match.time", { t: fmt(p.time) });
      var pen = document.createElement("span"); pen.textContent = t(NS + "match.penalty", { t: fmt(p.penalty) });
      meta.appendChild(time); meta.appendChild(pen);
      card.appendChild(head); card.appendChild(score); card.appendChild(tiles); card.appendChild(meta);
      if (p.phase === "question") {
        var skip = document.createElement("button");
        skip.type = "button"; skip.className = "rc-skip"; skip.textContent = t(NS + "match.skip");
        skip.addEventListener("click", function () { socket.emit("skip", { team: team }); });
        card.appendChild(skip);
      } else {
        var status = document.createElement("div"); status.className = "rc-status";
        status.textContent = t(NS + (p.phase === "finale" ? "match.atFinale" : "match.finished"));
        card.appendChild(status);
      }
      wrap.appendChild(card);
      if (motion && prev && prev.progress[team] && p.penalty > prev.progress[team].penalty) {
        var tag = document.createElement("div"); tag.className = "rc-penalty"; tag.setAttribute("dir", "ltr");
        tag.textContent = "+" + (p.penalty - prev.progress[team].penalty) + " s";
        card.appendChild(tag);
        gsap.fromTo(tag, { y: 0, opacity: 1 }, { y: -30, opacity: 0, duration: 1, onComplete: function () { tag.remove(); } });
      }
    });
  }

  // Collected letters are always shown in alphabetical order, so the order
  // they were won in never spells the word out: every team has to unscramble.
  function renderLetters(el, letters, total, compact) {
    letters = letters.slice().sort(function (a, b) { return a.localeCompare(b); });
    el.innerHTML = "";
    for (var i = 0; i < total; i++) {
      var tile = document.createElement("span");
      tile.className = "letter-tile" + (letters[i] ? "" : " empty") + (compact ? " compact" : "");
      tile.textContent = letters[i] || "";
      el.appendChild(tile);
    }
  }

  // ---------------- Phone ----------------
  function refreshMine() {
    socket.emit("my-state", null, function (ack) {
      if (!ack || !ack.ok) return;
      S.mine = ack.state;
      renderPhone();
    });
  }

  function renderPhone() {
    var m = S.mine;
    if (!m || !S.room) return;
    var started = Date.now() >= S.room.matchStartAt;
    if (!started) {
      showCard("questionCard");
      $("stepLine").textContent = "";
      $("questionText").textContent = t(NS + "match.getReady");
      S.shownKey = null;
      $("textArea").classList.add("hidden"); $("mcArea").classList.add("hidden"); $("hintBtn").classList.add("hidden"); $("hintCard").classList.add("hidden");
      S.countdownTimers.push(setTimeout(refreshMine, S.room.matchStartAt - Date.now() + 50));
      return;
    }
    if (S.showing === "cleared") return; // the cleared card waits for Continue
    if (m.phase === "done") { showCard("doneCard"); $("stepLine").textContent = ""; $("phonePips").innerHTML = ""; return; }
    if (m.phase === "finale") {
      showCard("finaleCard");
      $("stepLine").textContent = "";
      $("phonePips").innerHTML = "";
      renderLetters($("finaleLetters"), m.letters, m.wordLength, false);
      $("secretInput").maxLength = m.wordLength;
      $("secretInput").placeholder = "_".repeat(m.wordLength);
      renderLock("finaleLock", "finaleLockNum", m.lockUntil, [$("secretInput"), $("solveBtn")]);
      return;
    }
    showCard("questionCard");
    $("stepLine").textContent = t(NS + "match.step", { station: m.station + 1, n: S.room.stationCount, q: m.q + 1, k: m.qCount });
    var pips = $("phonePips"); pips.innerHTML = "";
    for (var i = 0; i < m.qCount; i++) {
      var pip = document.createElement("span"); pip.className = "pip" + (i < m.q ? " done" : i === m.q ? " now" : ""); pips.appendChild(pip);
    }
    var q = m.question;
    // Only a new question replaces the text, so typing is not wiped by updates.
    var key = m.station + ":" + m.q;
    if (S.shownKey !== key) {
      S.shownKey = key;
      $("questionText").textContent = q.prompt;
      renderMathIn($("questionText"));
      $("textAnswerInput").value = "";
      if (q.type === "multiple-choice") buildChoices(q.choices || []);
    }
    var mc = q.type === "multiple-choice";
    $("textArea").classList.toggle("hidden", mc);
    $("mcArea").classList.toggle("hidden", !mc);
    $("hintBtn").classList.toggle("hidden", !q.hasHint || !!m.hint);
    $("hintCard").classList.toggle("hidden", !m.hint);
    if (m.hint) { $("hintCard").textContent = m.hint; renderMathIn($("hintCard")); }
    renderLock("lockRing", "lockNum", m.lockUntil, [$("textAnswerInput"), $("textAnswerGo")].concat(qsa(".mc-choice", $("mcChoices"))));
  }

  function showCard(id) {
    ["questionCard", "clearedCard", "finaleCard", "doneCard"].forEach(function (c) { $(c).classList.toggle("hidden", c !== id); });
  }

  // A wrong answer: a 5-second countdown before the team may try again.
  function renderLock(ringId, numId, lockUntil, controls) {
    if (S.lockTimer) { clearInterval(S.lockTimer); S.lockTimer = null; }
    var tick = function () {
      var left = Math.ceil((lockUntil - Date.now()) / 1000);
      var locked = left > 0;
      $(ringId).classList.toggle("hidden", !locked);
      $(numId).textContent = left;
      controls.forEach(function (c) { c.disabled = locked; });
      if (!locked && S.lockTimer) { clearInterval(S.lockTimer); S.lockTimer = null; }
    };
    tick();
    if (lockUntil > Date.now()) S.lockTimer = setInterval(tick, 200);
  }

  function buildChoices(choices) {
    var wrap = $("mcChoices");
    wrap.innerHTML = "";
    choices.forEach(function (text, idx) {
      var b = document.createElement("button");
      b.className = "mc-choice"; b.type = "button";
      b.textContent = text;
      b.addEventListener("click", function () { submitAnswer(String(idx)); });
      wrap.appendChild(b);
    });
    renderMathIn(wrap);
  }

  function submitAnswer(mcInput) {
    var input = typeof mcInput === "string" ? mcInput : $("textAnswerInput").value.trim();
    if (!input) return;
    socket.emit("answer", { input: input }, function (ack) {
      if (!ack || !ack.ok) return;
      if (!ack.correct) {
        if (motion) gsap.fromTo("#questionCard", { x: 0 }, { x: 8, duration: 0.06, repeat: 5, yoyo: true, onComplete: function () { gsap.set("#questionCard", { x: 0 }); } });
        refreshMine();
        return;
      }
      if (motion) gsap.fromTo("#questionText", { scale: 1.06 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
      if (ack.cleared) showCleared(ack.cleared);
      S.mine = ack.state;
      renderPhone();
    });
  }
  $("textAnswerGo").addEventListener("click", function () { submitAnswer(); });
  $("textAnswerInput").addEventListener("keydown", function (e) { if (e.key === "Enter") submitAnswer(); });

  $("hintBtn").addEventListener("click", function () {
    socket.emit("hint", null, function (ack) {
      if (!ack || !ack.ok) return;
      $("hintCard").textContent = ack.hint;
      renderMathIn($("hintCard"));
      $("hintCard").classList.remove("hidden");
      $("hintBtn").classList.add("hidden");
      if (motion) gsap.fromTo("#hintCard", { rotationX: 80, opacity: 0, transformPerspective: 500 }, { rotationX: 0, opacity: 1, duration: 0.45 });
    });
  });

  // Station cleared: the clue and the new letter, until the team continues.
  function showCleared(cleared) {
    S.showing = "cleared";
    showCard("clearedCard");
    $("clueText").textContent = cleared.clue || t(NS + "match.noClue");
    renderMathIn($("clueText"));
    renderLetters($("newLetter"), [cleared.letter], 1, false);
    if (motion) {
      gsap.fromTo("#newLetter .letter-tile", { y: -50, rotation: 20, scale: 0.5 }, { y: 0, rotation: 0, scale: 1, duration: 0.55, ease: "back.out(2)" });
      burst($("clearedCard"), COLORS[S.role]);
    }
  }
  $("continueBtn").addEventListener("click", function () { S.showing = "question"; renderPhone(); });

  $("solveBtn").addEventListener("click", function () {
    var word = $("secretInput").value.trim();
    if (!word) return;
    socket.emit("solve", { word: word }, function (ack) {
      if (!ack || !ack.ok) return;
      if (!ack.correct) {
        if (motion) gsap.fromTo("#finaleCard", { x: 0 }, { x: 8, duration: 0.06, repeat: 5, yoyo: true, onComplete: function () { gsap.set("#finaleCard", { x: 0 }); } });
        refreshMine();
      }
    });
  });
  $("secretInput").addEventListener("keydown", function (e) { if (e.key === "Enter") $("solveBtn").click(); });

  function burst(container, color) {
    var r = container.getBoundingClientRect();
    for (var i = 0; i < 18; i++) {
      var e = document.createElement("i");
      e.className = "rally-confetti";
      e.style.background = i % 3 ? color : "#FFC145";
      e.style.left = (r.width / 2) + "px"; e.style.top = (r.height * 0.4) + "px";
      container.appendChild(e);
      gsap.to(e, { x: (Math.random() - 0.5) * 260, y: 80 + Math.random() * 160, rotation: Math.random() * 600, opacity: 0, duration: 0.9, onComplete: (function (node) { return function () { node.remove(); }; })(e) });
    }
  }

  // ---------------- Results ----------------
  function showEnd(room) {
    showView("end");
    stopTimers();
    refreshEndText(room);
    if (!reduceMotion && room.winner) launchConfetti(room.winner);
  }

  function refreshEndText(room) {
    var winner = room.winner;
    $("endHeadline").textContent = winner ? t(NS + "end.teamWins", { team: teamName(winner) }) : t(NS + "end.draw");
    $("champion").className = "champion" + (winner ? " " + winner.toLowerCase() : " none");
    $("championTeam").textContent = winner ? teamLabel(winner) : t(NS + "end.noWinner");
    $("championScore").classList.toggle("hidden", !winner);
    if (winner) $("championTime").textContent = fmt(room.progress[winner].time);

    var order = room.ranking || room.playing;
    var rows = $("recap");
    rows.innerHTML = "";
    var place = 0;
    order.forEach(function (team, i) {
      var p = room.progress[team];
      var prevTeam = order[i - 1], pp = prevTeam && room.progress[prevTeam];
      if (!pp || pp.cleared !== p.cleared || pp.time !== p.time || !!pp.finishedAt !== !!p.finishedAt) place = i + 1;
      var row = document.createElement("div");
      row.className = "board-row" + (team === winner ? " win" : "");
      var rank = document.createElement("span"); rank.className = "rank"; rank.textContent = place;
      var tile = document.createElement("span"); tile.className = "shape-tile " + team.toLowerCase(); tile.textContent = SHAPES[team];
      var name = document.createElement("span"); name.className = "row-name"; name.textContent = teamName(team);
      row.appendChild(rank); row.appendChild(tile); row.appendChild(name);
      [["end.stations", p.cleared + "/" + room.stationCount], ["end.time", fmt(p.time)], ["end.penalty", "+" + fmt(p.penalty)]].forEach(function (cell, j) {
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
    var particles = [];
    for (var i = 0; i < 80; i++) {
      particles.push({ x: Math.random() * canvas.width, y: -20 - Math.random() * 200, vy: 2 + Math.random() * 3, vx: -1 + Math.random() * 2, size: 4 + Math.random() * 5, rot: Math.random() * 360, c: Math.random() < 0.5 ? COLORS[winner] : "#FFC145" });
    }
    var start = Date.now();
    (function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) {
        p.y += p.vy; p.x += p.vx; p.rot += 6;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.c; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (Date.now() - start < 2200) requestAnimationFrame(frame); else canvas.classList.add("hidden");
    })();
  }

  document.addEventListener("i18nchange", function () {
    if (S.view === "lobby") renderLobby();
    if (S.view === "joinRoleSelect" && S.peekRoom) renderTeamPick(S.peekRoom);
    if (S.view === "match" && S.room) {
      if (isTeam()) { $("teamPill").textContent = teamLabel(S.role); renderPhone(); }
      S.mapKey = null;
      renderMatch(null);
    }
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
