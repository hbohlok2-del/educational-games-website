const { buildQuestions, cleanRallySettings, RALLY_MIN_STATIONS, RALLY_MAX_PER_STATION } = require("../content/questions");
const { sweepUnclaimedRooms } = require("./roomSweep");

// Rally: an online rally paper. The secret word sets the stations, one letter
// each; every station holds 1 to 5 questions. Every team starts at station 1
// and works through the stations in order, answering on its device (the game
// is online, so teams never crowd a station). Clearing a
// station gives that station's letter; after the last one the team unscrambles
// the word. The first team to solve it wins; at the time limit the team with
// the most stations (then the lowest time) wins.
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";
const TEAMS = ["A", "B", "C", "D"]; // red, blue, green, purple
const MIN_TEAMS = 2;
const START_COUNTDOWN_MS = 3000;
const WRONG_LOCK_MS = 5000;
const HINT_PENALTY_S = 30;
const SKIP_PENALTY_S = 120;

function generateRoomCode(rooms) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function perTeam(make) {
  const out = {};
  TEAMS.forEach((team) => { out[team] = make(); });
  return out;
}

function joinedTeams(room) {
  return room.slots.filter((team) => room.teams[team]);
}

// Stations from the word and the questions: station i keeps the first five
// questions marked for it. Every station needs at least one, or the rally
// cannot be played.
function buildStations(questions, settings) {
  const letters = Array.from(settings.word);
  if (letters.length < RALLY_MIN_STATIONS) return null;
  const stations = letters.map((letter, i) => ({ letter, clue: settings.clues[i] || "", questions: [] }));
  questions.forEach((q) => {
    const st = stations[q.station];
    if (st && st.questions.length < RALLY_MAX_PER_STATION) st.questions.push(q);
  });
  return stations.every((st) => st.questions.length > 0) ? stations : null;
}

function freshProgress() {
  return {
    step: 0, // the station the team is on, from 0
    q: 0, // question within the current station
    letters: [], // { station, letter } in the order collected
    penalty: 0, // seconds
    lockUntil: 0,
    hintShown: null, // "station:q" of the question whose hint is open
    phase: "question", // question | finale | done
    finishedAt: null,
    stats: { correct: 0, wrong: 0, hints: 0, skips: 0 },
  };
}

function currentStation(p) { return p.step; }

// Elapsed seconds plus penalties; a finished team's clock stops when it solves.
function teamTime(room, team, now = Date.now()) {
  const p = room.progress[team];
  if (!p || !room.matchStartAt) return 0;
  const end = p.finishedAt || room.endedAt || now;
  return Math.max(0, Math.round((end - room.matchStartAt) / 1000)) + p.penalty;
}

// Order for results: a team that solved the word first, then stations
// cleared, then lower time.
function ranking(room, now = Date.now()) {
  return room.playing.slice().sort((x, y) => {
    const a = room.progress[x], b = room.progress[y];
    if (!!b.finishedAt !== !!a.finishedAt) return b.finishedAt ? 1 : -1;
    if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
    return b.letters.length - a.letters.length || teamTime(room, x, now) - teamTime(room, y, now);
  });
}

// At the time limit: the single best team wins; a tie for first is a draw.
function timeWinner(room, now = Date.now()) {
  const order = ranking(room, now);
  if (order.length < 2) return order[0] || null;
  const [a, b] = order;
  const pa = room.progress[a], pb = room.progress[b];
  const level = pa.letters.length === pb.letters.length && teamTime(room, a, now) === teamTime(room, b, now);
  return level ? null : a;
}

function publicRoom(room) {
  const now = Date.now();
  const teams = {};
  room.playing.forEach((team) => {
    const p = room.progress[team];
    const station = currentStation(p);
    teams[team] = {
      station: p.phase === "question" ? station : null,
      q: p.q,
      qCount: p.phase === "question" ? room.stations[station].questions.length : 0,
      cleared: p.letters.length,
      letters: p.letters.map((l) => l.letter),
      clearedStations: p.letters.map((l) => l.station),
      penalty: p.penalty,
      time: teamTime(room, team, now),
      lockUntil: p.lockUntil,
      phase: p.phase,
      finishedAt: p.finishedAt,
      stats: p.stats,
    };
  });
  return {
    code: room.code,
    title: room.title,
    status: room.status,
    round: room.round,
    teamSlots: room.slots,
    teams: room.slots.reduce((acc, team) => { acc[team] = { joined: !!room.teams[team] }; return acc; }, {}),
    playing: room.playing,
    stationCount: room.stations.length,
    stationSizes: room.stations.map((st) => st.questions.length),
    questionCount: room.stations.reduce((n, st) => n + st.questions.length, 0),
    minutes: room.settings.minutes,
    matchStartAt: room.matchStartAt,
    endsAt: room.endsAt,
    progress: teams,
    winner: room.winner,
    ranking: room.status === "finished" ? ranking(room) : null,
  };
}

// What one team's device needs for its current step. Answers never leave
// the server; the hint only once the team has paid for it.
function privateState(room, team) {
  const p = room.progress[team];
  if (!p) return null;
  const out = { phase: p.phase, lockUntil: p.lockUntil, letters: p.letters.map((l) => l.letter), wordLength: room.stations.length };
  if (p.phase !== "question") return out;
  const station = currentStation(p);
  const q = room.stations[station].questions[p.q];
  out.station = station;
  out.q = p.q;
  out.qCount = room.stations[station].questions.length;
  out.question = { prompt: q.prompt, type: q.type, choices: q.choices, hasHint: !!q.hint };
  if (p.hintShown === station + ":" + p.q) out.hint = q.hint;
  return out;
}

function attach(io) {
  const nsp = io.of("/team-rally");
  const rooms = new Map();

  function broadcastRoom(room) {
    nsp.to(room.code).emit("room-update", publicRoom(room));
  }

  // The station clears: its letter is collected and the team moves on, or
  // reaches the finale after the last one. Returns what the phone shows.
  function clearStation(room, team) {
    const p = room.progress[team];
    const station = currentStation(p);
    const st = room.stations[station];
    p.letters.push({ station, letter: st.letter });
    p.step += 1;
    p.q = 0;
    p.hintShown = null;
    if (p.step >= room.stations.length) p.phase = "finale";
    return { letter: st.letter, clue: st.clue, station };
  }

  function finish(room, winner) {
    room.status = "finished";
    room.endedAt = Date.now();
    room.winner = winner;
  }

  function resetMatch(room) {
    room.status = "active";
    room.playing = joinedTeams(room);
    room.progress = {};
    room.playing.forEach((team) => { room.progress[team] = freshProgress(); });
    room.winner = null;
    room.endedAt = null;
    room.matchStartAt = Date.now() + START_COUNTDOWN_MS;
    room.endsAt = room.matchStartAt + room.settings.minutes * 60000;
  }

  function createRoom(opts) {
    const title = String((opts && opts.title) || "").trim().slice(0, 80) || "Class Rally";
    const settings = cleanRallySettings(opts && opts.settings);
    const questions = buildQuestions(opts && opts.questions, { rally: true });
    const stations = buildStations(questions, settings);
    if (!stations) return null;
    const code = generateRoomCode(rooms);
    const room = {
      code, title, settings, stations,
      slots: TEAMS.slice(0, settings.teams || 2),
      status: "waiting",
      round: 1,
      teams: perTeam(() => null),
      playing: [],
      progress: {},
      winner: null,
      matchStartAt: null,
      endsAt: null,
      endedAt: null,
      createdAt: Date.now(),
    };
    rooms.set(code, room);
    return room;
  }

  setInterval(() => {
    sweepUnclaimedRooms(nsp, rooms);
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.status === "active" && now >= room.endsAt) {
        finish(room, timeWinner(room, now));
        broadcastRoom(room);
      }
    }
  }, 500);

  // The team's own socket, checked for a live round it is playing in.
  function teamRoom(socket) {
    const room = rooms.get(socket.data.code);
    const team = socket.data.team;
    if (!room || room.status !== "active" || !team || !room.playing.includes(team)) return null;
    if (Date.now() < room.matchStartAt) return null;
    return room;
  }

  nsp.on("connection", (socket) => {
    socket.on("create-room", (opts, ack) => {
      if (typeof ack !== "function") return;
      const room = createRoom(opts);
      if (!room) return ack({ ok: false, error: "rally-incomplete" });
      socket.join(room.code);
      socket.data.code = room.code;
      socket.data.team = null;
      ack({ ok: true, room: publicRoom(room) });
    });

    socket.on("join-room", ({ code, team } = {}, ack) => {
      if (typeof ack !== "function") return;
      const room = rooms.get((code || "").toUpperCase());
      if (!room) return ack({ ok: false, error: "room-not-found" });
      if (!team) {
        socket.join(room.code);
        socket.data.code = room.code;
        socket.data.team = null;
        return ack({ ok: true, room: publicRoom(room), team: null });
      }
      if (!room.slots.includes(team)) return ack({ ok: false, error: "invalid-team" });
      if (room.teams[team]) return ack({ ok: false, error: "team-taken" });
      if (room.status !== "waiting" && !room.playing.includes(team)) return ack({ ok: false, error: "game-started" });
      room.teams[team] = socket.id;
      socket.join(room.code);
      socket.data.code = room.code;
      socket.data.team = team;
      ack({ ok: true, room: publicRoom(room), team });
      broadcastRoom(room);
    });

    socket.on("peek-room", ({ code } = {}, ack) => {
      if (typeof ack !== "function") return;
      const room = rooms.get((code || "").toUpperCase());
      if (!room) return ack({ ok: false, error: "room-not-found" });
      ack({ ok: true, room: publicRoom(room) });
    });

    socket.on("start-match", () => {
      const room = rooms.get(socket.data.code);
      if (!room || room.status !== "waiting" || joinedTeams(room).length < MIN_TEAMS) return;
      resetMatch(room);
      broadcastRoom(room);
    });

    socket.on("rematch", () => {
      const room = rooms.get(socket.data.code);
      if (!room || room.status !== "finished" || joinedTeams(room).length < MIN_TEAMS) return;
      room.round += 1;
      resetMatch(room);
      broadcastRoom(room);
    });

    // The team's current question (or finale) for its device.
    socket.on("my-state", (_, ack) => {
      if (typeof ack !== "function") return;
      const room = rooms.get(socket.data.code);
      const team = socket.data.team;
      if (!room || !team || !room.progress[team]) return ack({ ok: false });
      ack({ ok: true, state: privateState(room, team) });
    });

    socket.on("answer", ({ input } = {}, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const room = teamRoom(socket);
      if (!room) return reply({ ok: false });
      const team = socket.data.team;
      const p = room.progress[team];
      if (p.phase !== "question") return reply({ ok: false });
      if (Date.now() < p.lockUntil) return reply({ ok: false, error: "locked", lockUntil: p.lockUntil });
      const text = String(input == null ? "" : input).trim().slice(0, 200);
      if (!text) return reply({ ok: false });
      const station = room.stations[currentStation(p)];
      const q = station.questions[p.q];
      if (!q.checkAnswer(text)) {
        p.stats.wrong += 1;
        p.lockUntil = Date.now() + WRONG_LOCK_MS;
        reply({ ok: true, correct: false, lockUntil: p.lockUntil });
        broadcastRoom(room);
        return;
      }
      p.stats.correct += 1;
      p.q += 1;
      p.hintShown = null;
      const cleared = p.q >= station.questions.length ? clearStation(room, team) : null;
      reply({ ok: true, correct: true, cleared, state: privateState(room, team) });
      broadcastRoom(room);
    });

    socket.on("hint", (_, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const room = teamRoom(socket);
      if (!room) return reply({ ok: false });
      const p = room.progress[socket.data.team];
      if (p.phase !== "question") return reply({ ok: false });
      const station = currentStation(p);
      const q = room.stations[station].questions[p.q];
      if (!q.hint) return reply({ ok: false, error: "no-hint" });
      const key = station + ":" + p.q;
      if (p.hintShown !== key) {
        p.hintShown = key;
        p.penalty += HINT_PENALTY_S;
        p.stats.hints += 1;
        broadcastRoom(room);
      }
      reply({ ok: true, hint: q.hint });
    });

    // The teacher (a Big Screen socket) moves a stuck team past its station.
    socket.on("skip", ({ team } = {}, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const room = rooms.get(socket.data.code);
      if (!room || socket.data.team !== null || room.status !== "active" || !room.playing.includes(team)) return reply({ ok: false });
      const p = room.progress[team];
      if (p.phase !== "question") return reply({ ok: false });
      p.penalty += SKIP_PENALTY_S;
      p.stats.skips += 1;
      p.lockUntil = 0;
      const cleared = clearStation(room, team);
      nsp.to(room.teams[team] || "").emit("skipped", { cleared });
      reply({ ok: true });
      broadcastRoom(room);
    });

    // The finale: the first team to unscramble the word wins.
    socket.on("solve", ({ word } = {}, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const room = teamRoom(socket);
      if (!room) return reply({ ok: false });
      const team = socket.data.team;
      const p = room.progress[team];
      if (p.phase !== "finale") return reply({ ok: false });
      if (Date.now() < p.lockUntil) return reply({ ok: false, error: "locked", lockUntil: p.lockUntil });
      const guess = Array.from(String(word || "").toLocaleUpperCase()).filter((ch) => /\p{L}/u.test(ch)).join("");
      if (guess !== room.settings.word) {
        p.stats.wrong += 1;
        p.lockUntil = Date.now() + WRONG_LOCK_MS;
        reply({ ok: true, correct: false, lockUntil: p.lockUntil });
        broadcastRoom(room);
        return;
      }
      p.phase = "done";
      p.finishedAt = Date.now();
      finish(room, team);
      reply({ ok: true, correct: true });
      broadcastRoom(room);
    });

    socket.on("disconnect", () => {
      const room = rooms.get(socket.data.code);
      if (!room) return;
      if (socket.data.team && room.teams[socket.data.team] === socket.id) {
        room.teams[socket.data.team] = null;
        broadcastRoom(room);
      }
      const connected = nsp.adapter.rooms.get(room.code);
      if (room.status !== "waiting" && (!connected || connected.size === 0)) rooms.delete(room.code);
    });
  });

  return { rooms, createRoom };
}

module.exports = { attach, TEAMS, buildStations, ranking, timeWinner, teamTime, WRONG_LOCK_MS, HINT_PENALTY_S, SKIP_PENALTY_S };
