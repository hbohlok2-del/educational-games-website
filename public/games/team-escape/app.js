(function () {
  "use strict";

  var NS = "games.teamEscape.";
  var TEAMS = ["A", "B", "C", "D"];
  // Team shapes, so a team never depends on color alone.
  var SHAPES = { A: "▲", B: "◆", C: "●", D: "■" };
  var COLORS = { A: "#E63946", B: "#2E86FF", C: "#2BB673", D: "#9B59B6" };
  var gsap = window.gsap;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motion = !!gsap && !reduceMotion;
  var FEED_MAX = 6;

  var socket = io("/team-escape");

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
    shownKey: null, // "room:q" of the puzzle on the phone
    showing: "puzzle", // puzzle | opened (the phone holds the open door until Next room)
    puzzle: null, // the puzzle widget's controller
    vaultDial: null,
    labKey: null,
    geo: null,
    feed: [],
    alarmed: false,
    lastTickSec: null,
    clockTimer: null,
    lockTimer: null,
    countdownTimers: [],
  };

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function tt(key, vars) { return t(NS + key, vars); }
  function isTeam() { return TEAMS.indexOf(S.role) !== -1; }
  function teamName(team) { return tt("teams." + team); }
  function teamLabel(team) { return SHAPES[team] + " " + teamName(team); }
  function joinedCount(room) { return room.teamSlots.filter(function (x) { return room.teams[x].joined; }).length; }
  function roomTitle(room, i) { return room.roomNames && room.roomNames[i] ? room.roomNames[i] : tt("map.room", { n: i + 1 }); }
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  }
  function shake(sel) {
    if (motion) gsap.fromTo(sel, { x: 0 }, { x: 8, duration: 0.06, repeat: 5, yoyo: true, onComplete: function () { gsap.set(sel, { x: 0 }); } });
  }

  function showView(name) {
    S.view = name;
    document.body.setAttribute("data-screen", name);
    qsa("#app > section[data-view]").forEach(function (sec) {
      sec.classList.toggle("hidden", sec.getAttribute("data-view") !== name);
    });
  }

  function notice(msg) {
    var n = $("notice");
    if (!msg) { n.style.display = "none"; n.textContent = ""; return; }
    n.style.display = "block"; n.textContent = msg;
  }
  socket.on("connect_error", function () { notice(tt("notice.connectError")); });

  wireCopyButton($("copyLobbyCode"), function () { return $("lobbyCode").textContent; });

  // ---------------- Room state ----------------
  function applyRoomUpdate(room) {
    var firstSeen = S.lastSeenRound === null;
    if (!firstSeen && room.round !== S.lastSeenRound) {
      S.finished = false; S.showing = "puzzle"; S.labKey = null; S.feed = []; S.alarmed = false; S.shownKey = null;
    }
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
      if (!isTeam() && room.winner) vaultOpens(room.winner);
      // Let the class see the vault swing open before the results.
      setTimeout(function () { showEnd(S.room); }, motion ? (room.winner ? 2600 : 1200) : 0);
    }
  }
  socket.on("room-update", applyRoomUpdate);
  // The teacher opened this team's door: show it as if solved.
  socket.on("skipped", function (msg) { if (msg && msg.opened) showOpened(msg.opened); refreshMine(); });

  // ---------------- Navigation ----------------
  document.addEventListener("click", function (e) {
    var target = e.target.closest("[data-action]");
    if (!target) return;
    var act = target.getAttribute("data-action");
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
    S.code = null; S.role = null; S.room = null; S.mine = null; S.lastSeenRound = null; S.finished = false; S.labKey = null; S.feed = [];
    document.body.removeAttribute("data-role");
  }

  $("joinCodeGo").addEventListener("click", function () {
    var code = $("joinCodeInput").value.trim().toUpperCase();
    var errorEl = $("joinErr");
    if (code.length !== 4) { errorEl.textContent = tt("err.enterCode"); return; }
    socket.emit("peek-room", { code: code }, function (ack) {
      if (!ack.ok) { errorEl.textContent = tError(ack.error); return; }
      S.pendingCode = code;
      S.peekRoom = ack.room;
      if (S.pendingRole === "display") { joinAs(code, null); return; }
      $("joinRoleCode").textContent = code;
      $("joinRoleTitle").textContent = ack.room.title || tt("defaultTitle");
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
      b.textContent = SHAPES[team] + " " + tt("join.joinTeam", { team: teamName(team) });
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
    $("lobbyTitle").textContent = d.title || tt("defaultTitle");
    $("lobbyCode").textContent = d.code;
    $("lobbyRules").textContent = tt("lobby.rules", { rooms: d.roomCount, puzzles: d.questionCount, minutes: d.minutes });
    var roster = $("lobbyRoster"); roster.innerHTML = "";
    d.teamSlots.forEach(function (team) {
      var joined = d.teams[team].joined;
      var row = document.createElement("div");
      row.className = "roster-row" + (joined ? " ready" : "");
      var dot = document.createElement("span"); dot.className = "dot " + team.toLowerCase();
      var name = document.createElement("span"); name.className = "name"; name.textContent = teamName(team);
      var status = document.createElement("span"); status.className = "status";
      status.textContent = tt(joined ? "lobby.ready" : "lobby.open");
      row.appendChild(dot); row.appendChild(name); row.appendChild(status);
      roster.appendChild(row);
    });
    var count = joinedCount(d);
    var startBtn = $("lobbyStart");
    startBtn.disabled = count < 2 || d.status !== "waiting";
    startBtn.textContent = d.status === "active" ? tt("lobby.matchStarting") :
      count < 2 ? tt("lobby.needTwoTeams") : tt("lobby.startGame", { n: count });
  }

  // ---------------- Match ----------------
  function renderSoundBtn() {
    $("soundBtn").setAttribute("aria-pressed", window.Sfx.isOn() ? "true" : "false");
  }
  $("soundBtn").addEventListener("click", function () { window.Sfx.setOn(!window.Sfx.isOn()); renderSoundBtn(); });

  function setupMatch() {
    var team = isTeam();
    document.body.setAttribute("data-role", team ? "team" : "display");
    $("displayPlay").classList.toggle("hidden", team);
    $("teamPlay").classList.toggle("hidden", !team);
    if (team) {
      $("teamPill").className = "team-pill " + S.role.toLowerCase();
      $("teamPill").textContent = teamLabel(S.role);
    }
    renderSoundBtn();
    if (!S.clockTimer) S.clockTimer = setInterval(renderClock, 250);
    renderClock();
  }

  function renderClock() {
    var room = S.room;
    if (!room || !room.endsAt) return;
    var left = (room.endsAt - Math.max(Date.now(), room.matchStartAt)) / 1000;
    if (room.status === "finished") left = 0;
    $("matchClock").textContent = fmt(left);
    var low = room.status === "active" && left <= 60;
    $("clockRing").classList.toggle("low", low);
    if (!isTeam()) {
      $("labWrap").classList.toggle("alarm", low);
      // The last minute: one alarm, then a tick every second for the last ten.
      if (low && !S.alarmed && Date.now() >= room.matchStartAt) { S.alarmed = true; window.Sfx.play("alarm"); addFeed(tt("feed.lastMinute"), "alarm"); }
      var sec = Math.ceil(left);
      if (room.status === "active" && sec <= 10 && sec > 0 && sec !== S.lastTickSec) { S.lastTickSec = sec; window.Sfx.play("tick"); }
      if (room.status === "active") {
        room.playing.forEach(function (team) {
          var p = room.progress[team], node = $("time" + team);
          if (!node || p.finishedAt || Date.now() < room.matchStartAt) return;
          node.textContent = tt("match.time", { t: fmt((Date.now() - room.matchStartAt) / 1000 + p.penalty) });
        });
      }
    }
  }

  function renderMatch(prev) {
    var room = S.room;
    $("matchTitleLabel").textContent = room.title || "";
    if (isTeam()) {
      var now = room.progress[S.role];
      var before = prev && prev.progress[S.role];
      if (!S.mine || !before || before.room !== now.room || before.q !== now.q || before.phase !== now.phase || before.lockUntil !== now.lockUntil) refreshMine();
    } else {
      renderLab(room, prev);
      renderCards(room, prev);
      if (prev) feedFromDiff(prev, room);
    }
  }

  // ---------------- Big Screen ----------------
  function renderLab(room, prev) {
    var svg = $("lab");
    var key = room.code + ":" + room.round + ":" + currentLang();
    var fresh = S.labKey !== key;
    if (fresh) {
      S.labKey = key;
      S.geo = EscapeLab.build(svg, room.roomCount, room.roomNames || [], currentLang() === "ar", {
        room: function (n) { return tt("map.room", { n: n }); },
        vault: tt("map.vault"),
      });
    }
    EscapeLab.update(svg, S.geo, room);
    if (fresh && room.matchStartAt > Date.now()) introAnimation(svg, room.matchStartAt);
    if (!prev || !motion) return;
    room.playing.forEach(function (team) {
      var a = prev.progress[team], b = room.progress[team];
      var token = svg.querySelector('.lab-token[data-team="' + team + '"]');
      if (!a || !b || !token) return;
      if (b.cleared > a.cleared) {
        var opened = b.clearedRooms[b.clearedRooms.length - 1];
        doorOpens(svg, opened, team);
        var from = EscapeLab.tokenPos(S.geo, team, a.room, false), to = EscapeLab.tokenPos(S.geo, team, b.room, b.phase === "done");
        gsap.fromTo(token.querySelector(".lab-token-move"), { x: from.x - to.x, y: from.y - to.y }, { x: 0, y: 0, duration: 0.9, ease: "power2.inOut", delay: 0.35 });
      } else if (b.q > a.q) {
        gsap.fromTo(token.querySelector(".lab-token-body"), { scale: 1 }, { scale: 1.4, duration: 0.2, yoyo: true, repeat: 1, transformOrigin: "50% 50%" });
      } else if (b.lockUntil !== a.lockUntil && b.lockUntil > Date.now()) {
        gsap.fromTo(token.querySelector(".lab-token-body"), { x: 0 }, { x: 6, duration: 0.05, repeat: 7, yoyo: true, onComplete: function () { gsap.set(token.querySelector(".lab-token-body"), { x: 0 }); } });
        var roomEl = b.room != null && svg.querySelector('.lab-room[data-room="' + b.room + '"] .lab-flash');
        if (roomEl) gsap.fromTo(roomEl, { fill: "#E63946", opacity: 0.55 }, { opacity: 0, duration: 0.8 });
        window.Sfx.play("wrong");
      }
    });
  }

  // A team clears a room: the room flashes in the team's colour and its
  // padlock springs open.
  function doorOpens(svg, roomIdx, team) {
    window.Sfx.play("door");
    var flash = svg.querySelector('.lab-room[data-room="' + roomIdx + '"] .lab-flash');
    if (flash) gsap.fromTo(flash, { fill: COLORS[team], opacity: 0.7 }, { opacity: 0, duration: 1.2 });
    var lock = svg.querySelector('.lab-room[data-room="' + roomIdx + '"] .lab-lock[data-team="' + team + '"]');
    if (lock) {
      gsap.fromTo(lock, { scale: 1.8, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
      gsap.fromTo(lock.querySelector(".shackle"), { y: 0 }, { y: -6, duration: 0.3, yoyo: true, repeat: 1 });
    }
  }

  // The winning team cracks the vault: the wheel spins and the door glows.
  function vaultOpens(team) {
    window.Sfx.play("vault");
    if (!motion) return;
    var svg = $("lab");
    var wheel = svg.querySelector(".vault-wheel"), glow = svg.querySelector(".vault-glow"), door = svg.querySelector(".vault-door");
    if (wheel) gsap.to(wheel, { rotation: 540, svgOrigin: "0 0", duration: 1.4, ease: "power2.inOut" });
    if (glow) gsap.to(glow, { opacity: 1, duration: 0.8, delay: 1 });
    // The door swings on its left hinge.
    if (door) gsap.to(door, { scaleX: 0.1, svgOrigin: (S.geo.vault.cx - S.geo.vault.r) + " " + S.geo.vault.cy, duration: 0.8, delay: 1.4, ease: "power2.in" });
    burst($("labWrap"), COLORS[team]);
  }

  function introAnimation(svg, startAt) {
    var count = $("mapCountdown");
    S.countdownTimers.forEach(clearTimeout); S.countdownTimers = [];
    ["3", "2", "1", "GO!"].forEach(function (txt, n) {
      var at = startAt - (3 - n) * 1000 - Date.now();
      if (at < -600) return;
      S.countdownTimers.push(setTimeout(function () {
        count.textContent = txt;
        count.classList.toggle("go", txt === "GO!");
        window.Sfx.play(txt === "GO!" ? "go" : "tick");
        if (motion) {
          gsap.fromTo(count, { scale: 2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" });
          gsap.to(count, { opacity: 0, duration: 0.3, delay: 0.6 });
        } else {
          count.style.opacity = txt === "GO!" ? 0 : 1;
        }
      }, Math.max(0, at)));
    });
    if (!motion) return;
    gsap.fromTo(svg.querySelectorAll(".lab-room"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" });
    gsap.fromTo(svg.querySelectorAll(".lab-token-move"), { y: -90, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, delay: 0.9, ease: "bounce.out" });
  }

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
      card.className = "escape-card " + team.toLowerCase() + (team === leader ? " leading" : "");
      var head = document.createElement("div"); head.className = "ec-head";
      head.textContent = teamLabel(team);
      if (p.streak >= 3) {
        var fire = document.createElement("span"); fire.className = "ec-streak"; fire.textContent = tt("match.streak", { n: p.streak });
        head.appendChild(fire);
      }
      var score = document.createElement("div"); score.className = "ec-score"; score.setAttribute("dir", "ltr");
      score.textContent = p.cleared + " / " + room.roomCount;
      var bar = document.createElement("div"); bar.className = "ec-bar";
      for (var i = 0; i < room.roomCount; i++) {
        var seg = document.createElement("span");
        seg.className = p.clearedRooms.indexOf(i) !== -1 ? "on" : i === p.room ? "now" : "";
        bar.appendChild(seg);
      }
      var where = document.createElement("div"); where.className = "ec-where"; where.setAttribute("dir", "auto");
      where.textContent = p.phase === "puzzle" ? roomTitle(room, p.room) : tt(p.phase === "vault" ? "match.atVault" : "match.escaped");
      var meta = document.createElement("div"); meta.className = "ec-meta";
      var time = document.createElement("span"); time.id = "time" + team; time.textContent = tt("match.time", { t: fmt(p.time) });
      var pen = document.createElement("span"); pen.textContent = tt("match.penalty", { t: fmt(p.penalty) });
      meta.appendChild(time); meta.appendChild(pen);
      card.appendChild(head); card.appendChild(score); card.appendChild(bar); card.appendChild(where); card.appendChild(meta);
      if (p.phase === "puzzle" && room.status === "active") {
        var skip = document.createElement("button");
        skip.type = "button"; skip.className = "ec-skip"; skip.textContent = tt("match.skip");
        skip.addEventListener("click", function () { socket.emit("skip", { team: team }); });
        card.appendChild(skip);
      }
      wrap.appendChild(card);
      if (motion && prev && prev.progress[team] && p.penalty > prev.progress[team].penalty) {
        var tag = document.createElement("div"); tag.className = "ec-penalty"; tag.setAttribute("dir", "ltr");
        tag.textContent = "+" + (p.penalty - prev.progress[team].penalty) + " s";
        card.appendChild(tag);
        gsap.fromTo(tag, { y: 0, opacity: 1 }, { y: -30, opacity: 0, duration: 1.1, onComplete: function () { tag.remove(); } });
      }
    });
  }

  // The live feed beside the building: what just happened, newest first.
  function addFeed(text, kind, team) {
    S.feed.unshift({ text: text, kind: kind || "", team: team || "" });
    S.feed = S.feed.slice(0, FEED_MAX);
    var list = $("feed");
    list.innerHTML = "";
    S.feed.forEach(function (item, i) {
      var li = document.createElement("li");
      li.className = "feed-item" + (item.kind ? " kind-" + item.kind : "") + (item.team ? " " + item.team.toLowerCase() : "");
      li.setAttribute("dir", "auto");
      li.textContent = item.text;
      list.appendChild(li);
      if (i === 0 && motion) gsap.fromTo(li, { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35 });
    });
  }

  function feedFromDiff(prev, room) {
    room.playing.forEach(function (team) {
      var a = prev.progress[team], b = room.progress[team];
      if (!a || !b) return;
      var name = teamName(team);
      if (b.stats.skips > a.stats.skips) addFeed(tt("feed.skip", { team: name }), "skip", team);
      else if (b.cleared > a.cleared) addFeed(tt("feed.opened", { team: name, room: roomTitle(room, b.clearedRooms[b.clearedRooms.length - 1]) }), "door", team);
      if (b.phase === "vault" && a.phase !== "vault") addFeed(tt("feed.vault", { team: name }), "vault", team);
      if (b.phase === "done" && a.phase !== "done") addFeed(tt("feed.escaped", { team: name }), "vault", team);
      if (b.stats.hints > a.stats.hints) addFeed(tt("feed.hint", { team: name }), "hint", team);
      if (b.streak > a.streak && (b.streak === 3 || b.streak === 5 || b.streak === 8)) addFeed(tt("feed.streak", { team: name, n: b.streak }), "streak", team);
    });
  }

  // ---------------- Phone ----------------
  function refreshMine() {
    socket.emit("my-state", null, function (ack) {
      if (!ack || !ack.ok) return;
      S.mine = ack.state;
      renderPhone();
    });
  }

  function showCard(id) {
    ["puzzleCard", "openedCard", "vaultCard", "doneCard"].forEach(function (c) { $(c).classList.toggle("hidden", c !== id); });
  }

  function renderSlots(m) {
    var wrap = $("mySlots");
    wrap.innerHTML = "";
    for (var i = 0; i < m.roomCount; i++) {
      var hit = m.found.filter(function (f) { return f.room === i; })[0];
      var slot = document.createElement("span");
      slot.className = "code-slot" + (hit ? "" : " empty");
      var d = document.createElement("b"); d.textContent = hit ? hit.digit : "•";
      var k = document.createElement("small"); k.textContent = tt("match.roomShort", { n: i + 1 });
      slot.appendChild(d); slot.appendChild(k);
      wrap.appendChild(slot);
    }
  }

  function renderPhone() {
    var m = S.mine;
    if (!m || !S.room) return;
    renderSlots(m);
    var started = Date.now() >= S.room.matchStartAt;
    if (!started) {
      showCard("puzzleCard");
      $("roomNum").textContent = ""; $("roomName").textContent = "";
      $("roomStory").classList.add("hidden");
      $("phonePips").innerHTML = "";
      $("questionText").textContent = tt("match.getReady");
      $("puzzleArea").innerHTML = "";
      $("hintBtn").classList.add("hidden"); $("hintCard").classList.add("hidden");
      S.shownKey = null;
      S.countdownTimers.push(setTimeout(refreshMine, S.room.matchStartAt - Date.now() + 50));
      return;
    }
    if (S.showing === "opened") return; // the open door waits for Next room
    $("streakTag").classList.toggle("hidden", !(m.streak >= 2));
    $("streakTag").textContent = tt("match.streak", { n: m.streak });
    if (m.phase === "done") { showCard("doneCard"); $("roomHead").classList.add("hidden"); return; }
    if (m.phase === "vault") { $("roomHead").classList.add("hidden"); renderVault(m); return; }
    $("roomHead").classList.remove("hidden");
    showCard("puzzleCard");
    $("roomNum").textContent = tt("map.room", { n: m.room + 1 });
    $("roomName").textContent = m.roomName || "";
    $("roomStory").textContent = m.story || "";
    $("roomStory").classList.toggle("hidden", !m.story || m.q > 0);
    var pips = $("phonePips"); pips.innerHTML = "";
    for (var i = 0; i < m.qCount; i++) {
      var pip = document.createElement("span"); pip.className = "pip" + (i < m.q ? " done" : i === m.q ? " now" : ""); pips.appendChild(pip);
    }
    var q = m.question;
    // Only a new puzzle rebuilds the widget, so work in progress survives updates.
    var key = m.room + ":" + m.q;
    if (S.shownKey !== key) {
      S.shownKey = key;
      $("questionText").textContent = q.prompt;
      renderMathIn($("questionText"));
      S.puzzle = EscapePuzzles.render($("puzzleArea"), q, submitAnswer, tt);
      if (motion) gsap.fromTo("#puzzleCard", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" });
    }
    $("hintBtn").classList.toggle("hidden", !q.hasHint || !!m.hint);
    $("hintCard").classList.toggle("hidden", !m.hint);
    if (m.hint) { $("hintCard").textContent = m.hint; renderMathIn($("hintCard")); }
    renderLock("lockRing", "lockNum", m.lockUntil, function (off) { if (S.puzzle) S.puzzle.setDisabled(off); $("hintBtn").disabled = off; });
  }

  // A wrong answer sets off the alarm: a 5-second countdown before the next try.
  function renderLock(ringId, numId, lockUntil, setDisabled) {
    if (S.lockTimer) { clearInterval(S.lockTimer); S.lockTimer = null; }
    var tick = function () {
      var left = Math.ceil((lockUntil - Date.now()) / 1000);
      var locked = left > 0;
      $(ringId).classList.toggle("hidden", !locked);
      $(numId).textContent = left;
      setDisabled(locked);
      if (!locked && S.lockTimer) { clearInterval(S.lockTimer); S.lockTimer = null; }
    };
    tick();
    if (lockUntil > Date.now()) S.lockTimer = setInterval(tick, 200);
  }

  function wrongAnswer(cardSel) {
    window.Sfx.play("wrong");
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    shake(cardSel);
    var card = document.querySelector(cardSel);
    card.classList.remove("flash-bad"); void card.offsetWidth; card.classList.add("flash-bad");
  }

  function submitAnswer(input) {
    socket.emit("answer", { input: input }, function (ack) {
      if (!ack || !ack.ok) return;
      if (!ack.correct) { wrongAnswer("#puzzleCard"); refreshMine(); return; }
      window.Sfx.play("ok");
      var card = $("puzzleCard");
      card.classList.remove("flash-ok"); void card.offsetWidth; card.classList.add("flash-ok");
      S.mine = ack.state;
      if (ack.opened) showOpened(ack.opened);
      else renderPhone();
    });
  }

  $("hintBtn").addEventListener("click", function () {
    socket.emit("hint", null, function (ack) {
      if (!ack || !ack.ok) return;
      window.Sfx.play("hint");
      $("hintCard").textContent = ack.hint;
      renderMathIn($("hintCard"));
      $("hintCard").classList.remove("hidden");
      $("hintBtn").classList.add("hidden");
      if (motion) gsap.fromTo("#hintCard", { rotationX: 80, opacity: 0, transformPerspective: 500 }, { rotationX: 0, opacity: 1, duration: 0.45 });
    });
  });

  // A room is cleared: the door swings open and the digit is revealed.
  function showOpened(opened) {
    S.showing = "opened";
    S.shownKey = null;
    $("roomHead").classList.add("hidden");
    showCard("openedCard");
    $("openedEyebrow").textContent = tt("map.room", { n: opened.room + 1 }) + (opened.name ? " · " + opened.name : "");
    $("openedDigit").textContent = opened.digit;
    window.Sfx.play("door");
    if (navigator.vibrate) navigator.vibrate(60);
    if (S.mine) renderSlots(S.mine);
    if (motion) {
      gsap.fromTo("#doorAnim .door", { scaleX: 1, svgOrigin: "38 110" }, { scaleX: 0.08, svgOrigin: "38 110", duration: 0.7, ease: "power2.in", delay: 0.15 });
      gsap.fromTo("#openedDigit", { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.6, delay: 0.6, ease: "back.out(2.5)" });
      burst($("openedCard"), COLORS[S.role]);
    }
  }
  $("continueBtn").addEventListener("click", function () { S.showing = "puzzle"; renderPhone(); });

  // ---------------- Vault ----------------
  function renderVault(m) {
    showCard("vaultCard");
    if (!S.vaultDial || S.vaultDial.n !== m.roomCount) {
      $("vaultDial").innerHTML = "";
      S.vaultDial = { n: m.roomCount, dial: EscapePuzzles.dial($("vaultDial"), m.roomCount, { big: true, t: tt }) };
      if (motion) gsap.fromTo("#vaultAnim .wheel", { rotation: -90, svgOrigin: "100 100" }, { rotation: 0, svgOrigin: "100 100", duration: 1, ease: "back.out(1.5)" });
    }
    var list = $("vaultFound");
    list.innerHTML = "";
    m.found.slice().sort(function (a, b) { return a.room - b.room; }).forEach(function (f) {
      var chip = document.createElement("span"); chip.className = "found-chip";
      chip.textContent = tt("match.roomShort", { n: f.room + 1 }) + " → " + f.digit;
      list.appendChild(chip);
    });
    renderLock("vaultLock", "vaultLockNum", m.lockUntil, function (off) { S.vaultDial.dial.setDisabled(off); $("vaultBtn").disabled = off; });
  }

  $("vaultBtn").addEventListener("click", function () {
    if (!S.vaultDial) return;
    var code = S.vaultDial.dial.digits();
    socket.emit("vault", { code: code }, function (ack) {
      if (!ack || !ack.ok) return;
      if (!ack.correct) { wrongAnswer("#vaultCard"); refreshMine(); return; }
      window.Sfx.play("vault");
      if (motion) gsap.to("#vaultAnim .wheel", { rotation: 720, svgOrigin: "100 100", duration: 1.2, ease: "power2.inOut" });
      setTimeout(refreshMine, motion ? 1200 : 0);
    });
  });

  function burst(container, color) {
    if (!motion) return;
    var r = container.getBoundingClientRect();
    for (var i = 0; i < 22; i++) {
      var e = document.createElement("i");
      e.className = "escape-confetti";
      e.style.background = i % 3 ? color : "#FFC145";
      e.style.left = (r.width / 2) + "px"; e.style.top = (r.height * 0.4) + "px";
      container.appendChild(e);
      gsap.to(e, { x: (Math.random() - 0.5) * 300, y: 60 + Math.random() * 180, rotation: Math.random() * 600, opacity: 0, duration: 1, onComplete: (function (node) { return function () { node.remove(); }; })(e) });
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
    var escaped = winner && room.progress[winner].finishedAt;
    $("endHeadline").textContent = winner ? tt(escaped ? "end.teamEscaped" : "end.teamWins", { team: teamName(winner) }) : tt("end.draw");
    $("champion").className = "champion" + (winner ? " " + winner.toLowerCase() : " none");
    $("championTeam").textContent = winner ? teamLabel(winner) : tt("end.noWinner");
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
      [["end.rooms", p.cleared + "/" + room.roomCount], ["end.time", fmt(p.time)], ["end.bestStreak", "×" + p.stats.best]].forEach(function (cell, j) {
        var c = document.createElement("span"); c.className = "stat" + (j ? " minor" : "");
        var v = document.createElement("span"); v.className = "v"; v.setAttribute("dir", "ltr"); v.textContent = cell[1];
        var k = document.createElement("span"); k.className = "k"; k.textContent = tt(cell[0]);
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
    for (var i = 0; i < 90; i++) {
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
      if (Date.now() - start < 2400) requestAnimationFrame(frame); else canvas.classList.add("hidden");
    })();
  }

  document.addEventListener("i18nchange", function () {
    if (S.view === "lobby") renderLobby();
    if (S.view === "joinRoleSelect" && S.peekRoom) renderTeamPick(S.peekRoom);
    if (S.view === "match" && S.room) {
      if (isTeam()) { $("teamPill").textContent = teamLabel(S.role); S.shownKey = null; S.vaultDial = null; renderPhone(); }
      S.labKey = null;
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
