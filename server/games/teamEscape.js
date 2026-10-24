const { buildQuestions, cleanEscapeSettings, ESCAPE_MIN_ROOMS, ESCAPE_MAX_PER_ROOM } = require("../content/questions");
const { sweepUnclaimedRooms } = require("./roomSweep");

// Escape Room: teams are locked in a building of puzzle rooms. The vault code
// sets the rooms, one digit each; every room holds 1 to 5 puzzles (padlock
// numbers, typed expressions, multiple choice, step ordering, matching pairs,
// graph points). Every team starts in room 1 and works through the rooms in
// order (the game is online, so teams never crowd a room).
// Clearing a room opens its door and reveals that room's digit; after the
// last room the team enters the full code (in room order) at the vault. The
// first team out wins; at the time limit the team with the most rooms (then
// the lowest time) wins. Built on the Rally engine.
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

function joinedTeams(room) {
  return room.slots.filter((team) => room.teams[team]);
}

// Rooms from the vault code and the puzzles: room i keeps the first five
// puzzles marked for it. Every room needs at least one.
function buildRooms(questions, settings) {
  const digits = Array.from(settings.code);
  if (digits.length < ESCAPE_MIN_ROOMS) return null;
  const rooms = digits.map((digit, i) => ({ digit, name: settings.rooms[i].name, story: settings.rooms[i].story, questions: [] }));
  questions.forEach((q) => {
    const r = rooms[q.room];
    if (r && r.questions.length < ESCAPE_MAX_PER_ROOM) r.questions.push(q);
  });
  return rooms.every((r) => r.questions.length > 0) ? rooms : null;
}

function freshProgress() {
  return {
    step: 0, // the room the team is in, from 0
    q: 0, // puzzle within the current room
    found: [], // { room, digit } in the order opened
    penalty: 0, // seconds
    lockUntil: 0,
    hintShown: null, // "room:q" of the puzzle whose hint is open
    phase: "puzzle", // puzzle | vault | done
    finishedAt: null,
    streak: 0, // right answers in a row
    stats: { correct: 0, wrong: 0, hints: 0, skips: 0, best: 0 },
  };
}

function currentRoom(p) { return p.step; }

function teamTime(game, team, now = Date.now()) {
  const p = game.progress[team];
  if (!p || !game.matchStartAt) return 0;
  const end = p.finishedAt || game.endedAt || now;
  return Math.max(0, Math.round((end - game.matchStartAt) / 1000)) + p.penalty;
}

// Escaped teams first (earliest out first), then rooms opened, then time.
function ranking(game, now = Date.now()) {
  return game.playing.slice().sort((x, y) => {
    const a = game.progress[x], b = game.progress[y];
    if (!!b.finishedAt !== !!a.finishedAt) return b.finishedAt ? 1 : -1;
    if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
    return b.found.length - a.found.length || teamTime(game, x, now) - teamTime(game, y, now);
  });
}

function timeWinner(game, now = Date.now()) {
  const order = ranking(game, now);
  if (order.length < 2) return order[0] || null;
  const [a, b] = order;
  const pa = game.progress[a], pb = game.progress[b];
  const level = pa.found.length === pb.found.length && teamTime(game, a, now) === teamTime(game, b, now);
  return level ? null : a;
}

// What everyone may see, the Big Screen included. Digits stay private: the
// projector is in front of every team.
function publicRoom(game) {
  const now = Date.now();
  const teams = {};
  game.playing.forEach((team) => {
    const p = game.progress[team];
    const r = currentRoom(p);
    teams[team] = {
      room: p.phase === "puzzle" ? r : null,
      q: p.q,
      qCount: p.phase === "puzzle" ? game.rooms[r].questions.length : 0,
      cleared: p.found.length,
      clearedRooms: p.found.map((f) => f.room),
      penalty: p.penalty,
      time: teamTime(game, team, now),
      lockUntil: p.lockUntil,
      phase: p.phase,
      finishedAt: p.finishedAt,
      streak: p.streak,
      stats: p.stats,
    };
  });
  return {
    code: game.code,
    title: game.title,
    status: game.status,
    round: game.round,
    teamSlots: game.slots,
    teams: game.slots.reduce((acc, team) => { acc[team] = { joined: !!game.teams[team] }; return acc; }, {}),
    playing: game.playing,
    roomCount: game.rooms.length,
    roomNames: game.rooms.map((r) => r.name),
    roomSizes: game.rooms.map((r) => r.questions.length),
    questionCount: game.rooms.reduce((n, r) => n + r.questions.length, 0),
    minutes: game.settings.minutes,
    matchStartAt: game.matchStartAt,
    endsAt: game.endsAt,
    progress: teams,
    winner: game.winner,
    ranking: game.status === "finished" ? ranking(game) : null,
  };
}

// One team's device: its current puzzle (never the answer), its digits, and
// the hint once paid for.
function privateState(game, team) {
  const p = game.progress[team];
  if (!p) return null;
  const out = {
    phase: p.phase, lockUntil: p.lockUntil, roomCount: game.rooms.length, streak: p.streak,
    found: p.found.map((f) => ({ room: f.room, digit: f.digit })),
  };
  if (p.phase !== "puzzle") return out;
  const r = currentRoom(p);
  const room = game.rooms[r];
  const q = room.questions[p.q];
  out.room = r;
  out.roomName = room.name;
  out.story = room.story;
  out.q = p.q;
  out.qCount = room.questions.length;
  out.question = Object.assign({ prompt: q.prompt, type: q.type, choices: q.choices, hasHint: !!q.hint }, q.view);
  if (p.hintShown === r + ":" + p.q) out.hint = q.hint;
  return out;
}

function attach(io) {
  const nsp = io.of("/team-escape");
  const games = new Map();

  function broadcast(game) {
    nsp.to(game.code).emit("room-update", publicRoom(game));
  }

  // The room's door opens: its digit is found and the team moves on, or
  // reaches the vault after the last room.
  function openDoor(game, team) {
    const p = game.progress[team];
    const r = currentRoom(p);
    const room = game.rooms[r];
    p.found.push({ room: r, digit: room.digit });
    p.step += 1;
    p.q = 0;
    p.hintShown = null;
    if (p.step >= game.rooms.length) p.phase = "vault";
    return { room: r, digit: room.digit, name: room.name };
  }

  function finish(game, winner) {
    game.status = "finished";
    game.endedAt = Date.now();
    game.winner = winner;
  }

  function resetMatch(game) {
    game.status = "active";
    game.playing = joinedTeams(game);
    game.progress = {};
    game.playing.forEach((team) => { game.progress[team] = freshProgress(); });
    game.winner = null;
    game.endedAt = null;
    game.matchStartAt = Date.now() + START_COUNTDOWN_MS;
    game.endsAt = game.matchStartAt + game.settings.minutes * 60000;
  }

  function createRoom(opts) {
    const title = String((opts && opts.title) || "").trim().slice(0, 80) || "Escape Room";
    const settings = cleanEscapeSettings(opts && opts.settings);
    const questions = buildQuestions(opts && opts.questions, { escape: true });
    const rooms = buildRooms(questions, settings);
    if (!rooms) return null;
    const code = generateRoomCode(games);
    const game = {
      code, title, settings, rooms,
      slots: TEAMS.slice(0, settings.teams || 2),
      status: "waiting",
      round: 1,
      teams: { A: null, B: null, C: null, D: null },
      playing: [],
      progress: {},
      winner: null,
      matchStartAt: null,
      endsAt: null,
      endedAt: null,
      createdAt: Date.now(),
    };
    games.set(code, game);
    return game;
  }

  setInterval(() => {
    sweepUnclaimedRooms(nsp, games);
    const now = Date.now();
    for (const game of games.values()) {
      if (game.status === "active" && now >= game.endsAt) {
        finish(game, timeWinner(game, now));
        broadcast(game);
      }
    }
  }, 500);

  function teamGame(socket) {
    const game = games.get(socket.data.code);
    const team = socket.data.team;
    if (!game || game.status !== "active" || !team || !game.playing.includes(team)) return null;
    if (Date.now() < game.matchStartAt) return null;
    return game;
  }

  function wrong(game, p, reply) {
    p.stats.wrong += 1;
    p.streak = 0;
    p.lockUntil = Date.now() + WRONG_LOCK_MS;
    reply({ ok: true, correct: false, lockUntil: p.lockUntil });
    broadcast(game);
  }

  nsp.on("connection", (socket) => {
    socket.on("create-room", (opts, ack) => {
      if (typeof ack !== "function") return;
      const game = createRoom(opts);
      if (!game) return ack({ ok: false, error: "escape-incomplete" });
      socket.join(game.code);
      socket.data.code = game.code;
      socket.data.team = null;
      ack({ ok: true, room: publicRoom(game) });
    });

    socket.on("join-room", ({ code, team } = {}, ack) => {
      if (typeof ack !== "function") return;
      const game = games.get((code || "").toUpperCase());
      if (!game) return ack({ ok: false, error: "room-not-found" });
      if (!team) {
        socket.join(game.code);
        socket.data.code = game.code;
        socket.data.team = null;
        return ack({ ok: true, room: publicRoom(game), team: null });
      }
      if (!game.slots.includes(team)) return ack({ ok: false, error: "invalid-team" });
      if (game.teams[team]) return ack({ ok: false, error: "team-taken" });
      if (game.status !== "waiting" && !game.playing.includes(team)) return ack({ ok: false, error: "game-started" });
      game.teams[team] = socket.id;
      socket.join(game.code);
      socket.data.code = game.code;
      socket.data.team = team;
      ack({ ok: true, room: publicRoom(game), team });
      broadcast(game);
    });

    socket.on("peek-room", ({ code } = {}, ack) => {
      if (typeof ack !== "function") return;
      const game = games.get((code || "").toUpperCase());
      if (!game) return ack({ ok: false, error: "room-not-found" });
      ack({ ok: true, room: publicRoom(game) });
    });

    socket.on("start-match", () => {
      const game = games.get(socket.data.code);
      if (!game || game.status !== "waiting" || joinedTeams(game).length < MIN_TEAMS) return;
      resetMatch(game);
      broadcast(game);
    });

    socket.on("rematch", () => {
      const game = games.get(socket.data.code);
      if (!game || game.status !== "finished" || joinedTeams(game).length < MIN_TEAMS) return;
      game.round += 1;
      resetMatch(game);
      broadcast(game);
    });

    socket.on("my-state", (_, ack) => {
      if (typeof ack !== "function") return;
      const game = games.get(socket.data.code);
      const team = socket.data.team;
      if (!game || !team || !game.progress[team]) return ack({ ok: false });
      ack({ ok: true, state: privateState(game, team) });
    });

    socket.on("answer", ({ input } = {}, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const game = teamGame(socket);
      if (!game) return reply({ ok: false });
      const team = socket.data.team;
      const p = game.progress[team];
      if (p.phase !== "puzzle") return reply({ ok: false });
      if (Date.now() < p.lockUntil) return reply({ ok: false, error: "locked", lockUntil: p.lockUntil });
      const text = String(input == null ? "" : input).trim().slice(0, 200);
      if (!text) return reply({ ok: false });
      const room = game.rooms[currentRoom(p)];
      if (!room.questions[p.q].checkAnswer(text)) return wrong(game, p, reply);
      p.stats.correct += 1;
      p.streak += 1;
      p.stats.best = Math.max(p.stats.best, p.streak);
      p.q += 1;
      p.hintShown = null;
      const opened = p.q >= room.questions.length ? openDoor(game, team) : null;
      reply({ ok: true, correct: true, opened, state: privateState(game, team) });
      broadcast(game);
    });

    socket.on("hint", (_, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const game = teamGame(socket);
      if (!game) return reply({ ok: false });
      const p = game.progress[socket.data.team];
      if (p.phase !== "puzzle") return reply({ ok: false });
      const r = currentRoom(p);
      const q = game.rooms[r].questions[p.q];
      if (!q.hint) return reply({ ok: false, error: "no-hint" });
      const key = r + ":" + p.q;
      if (p.hintShown !== key) {
        p.hintShown = key;
        p.penalty += HINT_PENALTY_S;
        p.stats.hints += 1;
        broadcast(game);
      }
      reply({ ok: true, hint: q.hint });
    });

    // The teacher (a Big Screen socket) opens a stuck team's door.
    socket.on("skip", ({ team } = {}, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const game = games.get(socket.data.code);
      if (!game || socket.data.team !== null || game.status !== "active" || !game.playing.includes(team)) return reply({ ok: false });
      const p = game.progress[team];
      if (p.phase !== "puzzle") return reply({ ok: false });
      p.penalty += SKIP_PENALTY_S;
      p.stats.skips += 1;
      p.lockUntil = 0;
      p.streak = 0;
      const opened = openDoor(game, team);
      nsp.to(game.teams[team] || "").emit("skipped", { opened });
      reply({ ok: true });
      broadcast(game);
    });

    // The vault: the full code, digits in room order. The first team out wins.
    socket.on("vault", ({ code } = {}, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const game = teamGame(socket);
      if (!game) return reply({ ok: false });
      const team = socket.data.team;
      const p = game.progress[team];
      if (p.phase !== "vault") return reply({ ok: false });
      if (Date.now() < p.lockUntil) return reply({ ok: false, error: "locked", lockUntil: p.lockUntil });
      if (String(code == null ? "" : code).replace(/\D/g, "") !== game.settings.code) return wrong(game, p, reply);
      p.phase = "done";
      p.finishedAt = Date.now();
      finish(game, team);
      reply({ ok: true, correct: true });
      broadcast(game);
    });

    socket.on("disconnect", () => {
      const game = games.get(socket.data.code);
      if (!game) return;
      if (socket.data.team && game.teams[socket.data.team] === socket.id) {
        game.teams[socket.data.team] = null;
        broadcast(game);
      }
      const connected = nsp.adapter.rooms.get(game.code);
      if (game.status !== "waiting" && (!connected || connected.size === 0)) games.delete(game.code);
    });
  });

  return { rooms: games, createRoom };
}

module.exports = { attach, TEAMS, buildRooms, ranking, timeWinner, teamTime, WRONG_LOCK_MS, HINT_PENALTY_S, SKIP_PENALTY_S };
