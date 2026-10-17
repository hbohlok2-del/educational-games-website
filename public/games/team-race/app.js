(function () {
  "use strict";

  var NS = "games.teamRace.";
  // Team shapes, so a team never depends on color alone.
  var SHAPES = { A: "▲", B: "◆", C: "●", D: "■" };
  var COLORS = { A: "#E63946", B: "#2E86FF", C: "#2BB673", D: "#9B59B6" };
  var FINISH_HOLD_MS = 2500;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var socket = io("/team-race");
  var rope = RopeScene.build(document.getElementById("ropeScene"));

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
    qIndex: 0,
    questionReady: false,
    currentType: "short-answer",
    lockUntil: 0,
    myPulls: [],
    clockTimer: null,
    lanesFor: null,
    leader: null,
    endTimer: null,
  };

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function isTeam() { return !!S.role; }
  function teamName(team) { return t(NS + "teams." + team); }
  function teamLabel(team) { return SHAPES[team] + " " + teamName(team); }
  function joinedCount(room) { return room.teamSlots.filter(function (x) { return room.teams[x].joined; }).length; }
  // Four rockets get their own code-drawn lanes; a two-team race keeps the
  // painted two-lane artwork.
  function usesLanes(room) { return room.theme === "rocket" && room.teamSlots.length > 2; }

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

  function questionCountLabel(n) {
    return t(NS + (n === 1 ? "lobby.questionSingular" : "lobby.questionPlural"), { n: n });
  }

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
    S.leader = null;
  }

  function onRoomUpdate(room, prev) {
    if (S.view === "lobby") renderLobby();
    var enteringMatch = room.status === "active" && (S.view === "lobby" || S.view === "end");
    if (S.view === "match" || enteringMatch) {
      if (S.view !== "match") { showView("match"); setupMatchUI(); }
      renderRope(trackEvents(prev, room));
      renderDisplayStats();
    }
    if (room.status === "finished" && !S.finished) {
      S.finished = true;
      // A rocket or rope race holds the scene for its finish celebration first.
      var fxOn = room.theme === "rocket" ? RaceFX.enabled : RopeScene.enabled;
      if (S.view === "match" && fxOn) {
        celebrate(room);
        S.endTimer = setTimeout(function () { S.endTimer = null; showEnd(room); }, FINISH_HOLD_MS);
      } else {
        showEnd(room);
      }
    }
  }

  // What happened to each rocket since the last update: a correct answer
  // (fast or slow, from how far it climbed) or a wrong one.
  function trackEvents(prev, room) {
    var ev = {};
    if (!prev || prev.round !== room.round || !prev.stats) return ev;
    if (room.theme !== "rocket") return ropeEvents(prev, room);
    room.playing.forEach(function (team) {
      var a = prev.stats[team], b = room.stats[team];
      if (!a || !b) return;
      if (b.correct > a.correct) ev[team] = room.progress[team] - prev.progress[team] >= 10 ? "fast" : "slow";
      else if (b.wrong > a.wrong) ev[team] = "wrong";
    });
    return ev;
  }

  // The rope: a move toward a team is that team's pull (10 fast, 7 medium,
  // 5 slow); a new wrong answer makes that crew stumble.
  function ropeEvents(prev, room) {
    var ev = { wrong: [] };
    var d = room.position - prev.position;
    if (d) ev.pull = { team: d < 0 ? "A" : "B", mag: Math.abs(d) >= 9 ? 10 : Math.abs(d) >= 6 ? 7 : 5 };
    ["A", "B"].forEach(function (team) {
      if (prev.stats[team] && room.stats[team] && room.stats[team].wrong > prev.stats[team].wrong) ev.wrong.push(team);
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
    if (act === "go-join") { $("joinCodeInput").value = ""; $("joinErr").textContent = ""; S.pendingRole = null; showView("joinEntry"); }
    if (act === "go-display") { $("joinCodeInput").value = ""; $("joinErr").textContent = ""; S.pendingRole = "display"; showView("joinEntry"); }
  });

  function leaveRoom() {
    if (S.clockTimer) { clearInterval(S.clockTimer); S.clockTimer = null; }
    if (S.endTimer) { clearTimeout(S.endTimer); S.endTimer = null; }
    S.leader = null;
    document.body.removeAttribute("data-role");
    if (socket.connected) socket.disconnect();
    socket.connect();
    S.code = null; S.role = null; S.room = null; S.lastSeenRound = null; S.finished = false; S.lanesFor = null;
  }

  $("joinCodeGo").addEventListener("click", function () {
    var code = $("joinCodeInput").value.trim().toUpperCase();
    var errorEl = $("joinErr");
    if (code.length !== 4) { errorEl.textContent = t(NS + "err.enterCode"); return; }
    socket.emit("peek-room", { code: code }, function (ack) {
      if (!ack.ok) { errorEl.textContent = tError(ack.error); return; }
      S.pendingCode = code;
      S.peekRoom = ack.room;
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

  // Only the room's seats (2 or 4), and free ones only. Once a race has
  // started, only its own teams can rejoin.
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
    $("lobbyTitle").textContent = (d.title || t(NS + "defaultTitle")) + " · " + questionCountLabel(d.questionCount);
    $("lobbyCode").textContent = d.code;
    var roster = $("lobbyRoster"); roster.innerHTML = "";
    d.teamSlots.forEach(function (team) {
      var joined = d.teams[team].joined;
      var row = document.createElement("div");
      row.className = "roster-row" + (joined ? " ready" : "");
      var dot = document.createElement("span"); dot.className = "dot " + team.toLowerCase();
      var name = document.createElement("span"); name.className = "name"; name.textContent = teamName(team);
      var status = document.createElement("span"); status.className = "status";
      status.textContent = t(NS + (joined ? "lobby.ready" : "lobby.waiting"));
      row.appendChild(dot); row.appendChild(name); row.appendChild(status);
      roster.appendChild(row);
    });
    // Two seats: both must be filled. Four lanes: any two can race.
    var count = joinedCount(d);
    var four = d.teamSlots.length > 2;
    var ready = count >= 2;
    var startBtn = $("lobbyStart");
    startBtn.disabled = !ready || d.status === "active";
    startBtn.textContent = d.status === "active" ? t(NS + "lobby.matchStarting") :
      !ready ? t(NS + (four ? "lobby.needTwoTeams" : "lobby.waitingBothTeams")) :
      four ? t(NS + "lobby.startRaceTeams", { n: count }) : t(NS + "lobby.startRace");
  }

  // ---------------- Match ----------------
  function setupMatchUI() {
    $("matchTitleLabel").textContent = (S.room && S.room.title) || "";
    var team = isTeam();
    document.body.setAttribute("data-role", team ? "team" : "display");
    $("teamPlay").classList.toggle("hidden", !team);
    $("displayPlay").classList.toggle("hidden", team);
    if (team) {
      var card = $("teamCard");
      card.className = "team-card " + S.role.toLowerCase();
      $("teamTag").textContent = teamLabel(S.role);
      $("teamPill").className = "team-pill " + S.role.toLowerCase();
      $("teamPill").textContent = teamLabel(S.role);
      startCountdownThenPlay();
    }
    var isRocket = S.room && S.room.theme === "rocket";
    var lanes = !!S.room && usesLanes(S.room);
    $("ropeWrap").classList.toggle("hidden", isRocket);
    $("rocketWrap").classList.toggle("hidden", !isRocket || lanes);
    $("laneWrap").classList.toggle("hidden", !lanes);
    if (lanes) buildLanes(S.room);
    buildDisplayStats(S.room);
    if (isRocket) startTrackFx(S.room);
    else startRopeFx(S.room);
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

  function renderRope(ev) {
    var room = S.room;
    ev = ev || {};
    if (room && room.theme !== "rocket") {
      (ev.wrong || []).forEach(function (team) { rope.wrong(team); });
      if (ev.pull || room.position !== rope.pos) rope.setPos(room.position, ev.pull);
      return;
    }
    if (!room) return;
    if (usesLanes(room)) renderLanes(room, ev);
    else renderRocketTrack(room, ev);
    updateLeader(room);
  }

  var ROCKET_PAD_PCT = 20; // a resting rocket stands on its painted pad
  var ROCKET_FINISH_PCT = 80;
  function rocketBottom(progress, pad) {
    return pad + ((progress || 0) / 100) * (ROCKET_FINISH_PCT - pad);
  }
  function renderRocketTrack(room, ev) {
    ["A", "B"].forEach(function (team) {
      var wrap = $("rocket" + team);
      moveRocket(wrap, null, wrap.querySelector("img"), rocketBottom(room.progress[team], ROCKET_PAD_PCT), ev[team]);
    });
  }

  // Plays the answer's animation, then moves the rocket. Unchanged rockets
  // are left alone so an animation in flight is not cut short.
  function moveRocket(wrap, beam, dimTarget, pct, event) {
    if (!wrap) return;
    if (event === "wrong") RaceFX.wrong(wrap, dimTarget);
    else if (event) RaceFX.boost(wrap, beam, event === "fast");
    if (wrap.dataset.pct === String(pct)) return;
    wrap.dataset.pct = String(pct);
    RaceFX.place(wrap, pct, event === "fast" || event === "slow" ? event : null);
  }

  function activeTrack(room) { return usesLanes(room) ? $("laneTrack") : $("rocketTrack"); }
  function rocketWrap(room, team) { return usesLanes(room) ? $("laneRocket" + team) : $("rocket" + team); }

  // The leader is the single highest rocket; on a tie the crown stays put.
  function updateLeader(room) {
    var best = 0;
    room.playing.forEach(function (team) { best = Math.max(best, room.progress[team] || 0); });
    var tops = room.playing.filter(function (team) { return best > 0 && room.progress[team] === best; });
    if (tops.length === 1 && tops[0] !== S.leader) {
      S.leader = tops[0];
      RaceFX.lead(activeTrack(room), rocketWrap(room, S.leader));
    }
    room.teamSlots.forEach(function (team) {
      var lane = $("lane" + team);
      if (lane) lane.classList.toggle("leading", team === S.leader);
      var card = $("dispCard" + team);
      if (card) card.classList.toggle("leading", team === S.leader);
    });
  }

  // Engine glows, idle bob and stars for this track, plus the 3-2-1-GO
  // countdown when the race has not started yet.
  function startTrackFx(room) {
    var track = activeTrack(room);
    var wraps = room.teamSlots.map(function (team) { return rocketWrap(room, team); });
    RaceFX.clear(track);
    RaceFX.setup(track, wraps, usesLanes(room));
    if (room.matchStartAt > Date.now()) {
      var pads = usesLanes(room) ? qsa(".lane-pad", track) : [];
      RaceFX.countdown(track, room.matchStartAt, pads, wraps);
    }
  }

  // A fresh scene for the round, with the 3-2-1-GO when it has not started.
  function startRopeFx(room) {
    rope.reset(room.position);
    if (room.matchStartAt > Date.now()) rope.countdown(room.matchStartAt);
    else rope.start();
  }

  function celebrate(room) {
    if (room.theme !== "rocket") {
      if (room.winner) rope.finish(room.winner, t(NS + "end.teamWins", { team: teamName(room.winner) }));
      else rope.draw(t(NS + "end.draw"));
      return;
    }
    var track = activeTrack(room);
    if (room.winner) {
      var others = room.playing.filter(function (team) { return team !== room.winner; }).map(function (team) {
        return usesLanes(room) ? $("lane" + team) : $("rocket" + team);
      });
      RaceFX.finish(track, rocketWrap(room, room.winner), others, t(NS + "end.teamWins", { team: teamLabel(room.winner) }), COLORS[room.winner]);
    } else {
      RaceFX.draw(track, usesLanes(room) ? qsa(".lane-beam", track) : [], t(NS + "end.draw"));
    }
  }

  // ---------------- Four-lane rocket track ----------------
  // Every part (lane, beam, pad, rocket) is its own element so it can be
  // styled and animated on its own.
  var LANE_PAD_PCT = 17; // a resting rocket stands on its pad
  function buildLanes(room) {
    var key = room.code + ":" + room.round;
    if (S.lanesFor === key) return;
    S.lanesFor = key;
    var labels = $("laneLabels"), lanes = $("laneLanes");
    labels.innerHTML = ""; lanes.innerHTML = "";
    room.teamSlots.forEach(function (team) {
      var id = team.toLowerCase();
      var label = document.createElement("span");
      label.className = id;
      label.setAttribute("data-team", team);
      label.textContent = teamLabel(team);
      labels.appendChild(label);

      var lane = document.createElement("div");
      lane.className = "lane " + id;
      lane.id = "lane" + team;
      var beam = document.createElement("div"); beam.className = "lane-beam";
      var pad = document.createElement("div"); pad.className = "lane-pad";
      var rocket = document.createElement("div");
      rocket.className = "lane-rocket";
      rocket.id = "laneRocket" + team;
      var img = document.createElement("img");
      img.src = "themes/rocket/rocket-" + id + ".png";
      img.alt = "";
      rocket.appendChild(img);
      lane.appendChild(beam); lane.appendChild(pad); lane.appendChild(rocket);
      lanes.appendChild(lane);
    });
  }

  function renderLanes(room, ev) {
    buildLanes(room);
    room.teamSlots.forEach(function (team) {
      var playing = room.playing.indexOf(team) !== -1;
      var lane = $("lane" + team);
      if (!lane) return;
      lane.classList.toggle("empty", room.status !== "waiting" && !playing);
      moveRocket($("laneRocket" + team), lane.querySelector(".lane-beam"), lane, rocketBottom(room.progress[team], LANE_PAD_PCT), ev[team]);
    });
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
    if (!isTeam() || !S.room) return;
    var streak = 0;
    for (var i = S.myPulls.length - 1; i >= 0; i--) { if (S.myPulls[i].c) streak++; else break; }
    $("chipStreak").textContent = t(NS + "match.streak", { n: streak });
    var stats = S.room.stats[S.role];
    var total = stats.correct + stats.wrong;
    $("chipAcc").textContent = t(NS + "match.accuracy", { value: total ? Math.round(100 * stats.correct / total) + "%" : "–" });
  }

  function accuracy(s) {
    var total = s.correct + s.wrong;
    return total ? Math.round(100 * s.correct / total) + "%" : "–";
  }

  // Big Screen: one card per team racing this round, in track order (the
  // painted two-rocket track has Blue on the left).
  function buildDisplayStats(room) {
    var wrap = $("displayStats");
    wrap.innerHTML = "";
    if (!room) return;
    var order = room.theme === "rocket" && !usesLanes(room) ? room.playing.slice().reverse() : room.playing;
    order.forEach(function (team) {
      var card = document.createElement("div");
      card.className = "display-team " + team.toLowerCase() + (team === S.leader ? " leading" : "");
      card.id = "dispCard" + team;
      var lab = document.createElement("div"); lab.className = "lab"; lab.textContent = teamLabel(team);
      var big = document.createElement("div"); big.className = "big"; big.id = "disp" + team + "Correct"; big.textContent = "0";
      card.appendChild(lab); card.appendChild(big);
      [["display.wrong", "Wrong"], ["display.accuracy", "Acc"]].forEach(function (row) {
        var r = document.createElement("div"); r.className = "row";
        var k = document.createElement("span"); k.textContent = t(NS + row[0]);
        var v = document.createElement("span"); v.id = "disp" + team + row[1];
        r.appendChild(k); r.appendChild(v); card.appendChild(r);
      });
      wrap.appendChild(card);
    });
  }

  function renderDisplayStats() {
    if (S.role !== null || !S.room) return;
    S.room.playing.forEach(function (team) {
      var s = S.room.stats[team];
      if (!$("disp" + team + "Correct")) buildDisplayStats(S.room);
      $("disp" + team + "Correct").textContent = s.correct;
      $("disp" + team + "Wrong").textContent = s.wrong;
      $("disp" + team + "Acc").textContent = accuracy(s);
    });
  }

  // ---------------- End screen ----------------
  function showEnd(room) {
    showView("end");
    if (S.clockTimer) { clearInterval(S.clockTimer); S.clockTimer = null; }
    refreshEndText(room);
    renderRope();
    if (!reduceMotion && room.winner) launchConfetti(room.winner);
  }

  // How far a team got: rocket height, or for the rope how far the marker
  // sits on its side.
  function standing(room, team) {
    if (room.theme === "rocket") return room.progress[team] || 0;
    return team === "A" ? 100 - room.position : room.position;
  }

  function refreshEndText(room) {
    var winner = room.winner;
    // The champion panel carries the colored shape, so the headline uses the plain name.
    $("endHeadline").textContent = winner ? t(NS + "end.teamWins", { team: teamName(winner) }) : t(NS + "end.draw");
    var champ = $("champion");
    champ.className = "champion" + (winner ? " " + winner.toLowerCase() : " none");
    $("championTeam").textContent = winner ? teamLabel(winner) : t(NS + "end.noWinner");
    $("championScore").classList.toggle("hidden", !winner);
    if (winner) $("championCorrect").textContent = room.stats[winner].correct || 0;

    var ranked = room.playing.slice().sort(function (x, y) {
      return standing(room, y) - standing(room, x) || (room.stats[y].correct || 0) - (room.stats[x].correct || 0);
    });
    var rows = $("recap");
    rows.innerHTML = "";
    var place = 0;
    ranked.forEach(function (team, i) {
      var s = room.stats[team];
      // Teams level on height and correct answers share a place.
      var prev = ranked[i - 1];
      if (!prev || standing(room, prev) !== standing(room, team) || (room.stats[prev].correct || 0) !== (s.correct || 0)) place = i + 1;
      var row = document.createElement("div");
      row.className = "board-row" + (team === winner ? " win" : "");
      var rank = document.createElement("span"); rank.className = "rank"; rank.textContent = place;
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
    var color = COLORS[winner];
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
    if (S.view === "joinRoleSelect" && S.peekRoom) renderTeamPick(S.peekRoom);
    if (S.view === "match" && S.room) {
      if (isTeam()) { $("teamTag").textContent = teamLabel(S.role); $("teamPill").textContent = teamLabel(S.role); }
      S.lanesFor = null;
      if (usesLanes(S.room)) buildLanes(S.room);
      buildDisplayStats(S.room);
      renderRope();
      renderDisplayStats();
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
