const { buildQuestions, cleanBoardSettings } = require("../content/questions");
const { sweepUnclaimedRooms } = require("./roomSweep");

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";
const TEAMS = ["A", "B", "C", "D"]; // red, blue, green, purple
const MIN_TEAMS = 2;
const START_COUNTDOWN_MS = 3000;
const REVEAL_MS = 4500;
const MAX_CATEGORIES = 6;
const MAX_PER_CATEGORY = 6;

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

function freshStats() {
  return perTeam(() => ({ correct: 0, wrong: 0 }));
}

function joinedTeams(room) {
  return TEAMS.filter((team) => room.teams[team]);
}

// Categories in the order the teacher first used them, each column sorted by
// points. A cell keeps the index of its question in room.questions.
function buildBoard(questions) {
  const categories = [];
  const columns = new Map();
  questions.forEach((q, index) => {
    if (!columns.has(q.category)) {
      if (categories.length >= MAX_CATEGORIES) return;
      categories.push(q.category);
      columns.set(q.category, []);
    }
    const column = columns.get(q.category);
    if (column.length < MAX_PER_CATEGORY) column.push(index);
  });
  const cells = [];
  categories.forEach((name, cat) => {
    columns.get(name)
      .sort((a, b) => questions[a].points - questions[b].points)
      .forEach((qIndex) => cells.push({ id: cells.length, cat, points: questions[qIndex].points, qIndex, used: false, wonBy: null }));
  });
  return { categories, cells };
}

function publicRoom(room) {
  const cell = room.currentCell == null ? null : room.cells[room.currentCell];
  const q = cell ? room.questions[cell.qIndex] : null;
  const revealing = room.phase === "reveal";
  const attempts = {};
  room.playing.forEach((team) => {
    const a = room.attempts[team];
    // A team's answer text stays hidden until the question closes, so the
    // other teams cannot copy it.
    attempts[team] = a ? { answered: true, result: a.result, input: revealing ? a.input : null } : { answered: false, result: null, input: null };
  });
  return {
    code: room.code,
    title: room.title,
    theme: room.theme,
    penalty: room.settings.penalty,
    timeLimit: room.settings.timeLimit,
    status: room.status,
    round: room.round,
    teams: TEAMS.reduce((acc, team) => { acc[team] = { joined: !!room.teams[team] }; return acc; }, {}),
    playing: room.playing,
    scores: room.scores,
    stats: room.stats,
    winner: room.winner,
    matchStartAt: room.matchStartAt,
    questionCount: room.cells.length,
    categories: room.categories,
    cells: room.cells.map((c) => ({ id: c.id, cat: c.cat, points: c.points, used: c.used, wonBy: c.wonBy })),
    control: room.control,
    phase: room.phase,
    currentCell: room.currentCell,
    question: q ? { prompt: q.prompt, type: q.type, choices: q.choices, points: cell.points, category: room.categories[cell.cat] } : null,
    openedAt: room.openedAt,
    windowMs: room.settings.timeLimit * 1000,
    attempts,
    cellWinner: room.cellWinner,
    answerText: revealing && q ? q.answerText : null,
    revealUntil: room.revealUntil,
  };
}

function attach(io) {
  const nsp = io.of("/team-board");
  const rooms = new Map();

  function broadcastRoom(room) {
    nsp.to(room.code).emit("room-update", publicRoom(room));
    sendJudgeQueue(room);
  }

  // The host (any Big Screen socket) needs the submitted text of open answers
  // plus the expected answer to judge them. Only display sockets get this,
  // and only once no more answers can come in.
  function sendJudgeQueue(room) {
    const sockets = nsp.adapter.rooms.get(room.code);
    if (!sockets) return;
    const payload = judgeQueue(room);
    for (const id of sockets) {
      const s = nsp.sockets.get(id);
      if (s && s.data.team === null) s.emit("judge-queue", payload);
    }
  }

  function judgeQueue(room) {
    if (room.phase !== "judging") return null;
    const q = room.questions[room.cells[room.currentCell].qIndex];
    return {
      cell: room.currentCell,
      expected: q.answerText,
      pending: room.order
        .filter((team) => room.attempts[team] && room.attempts[team].result === null)
        .map((team) => ({ team, input: room.attempts[team].input })),
    };
  }

  // The teams joined at start are the ones that play this round; empty seats
  // stay out until the next rematch.
  function resetMatch(room) {
    room.status = "active";
    room.playing = joinedTeams(room);
    room.scores = perTeam(() => 0);
    room.stats = freshStats();
    room.winner = null;
    room.cells.forEach((c) => { c.used = false; c.wonBy = null; });
    room.control = room.playing[0];
    room.phase = "board";
    room.currentCell = null;
    room.attempts = {};
    room.order = [];
    room.cellWinner = null;
    room.openedAt = null;
    room.revealUntil = null;
    room.matchStartAt = Date.now() + START_COUNTDOWN_MS;
  }

  function createRoom(opts) {
    const title = String((opts && opts.title) || "").trim().slice(0, 80) || "Class Board";
    const questions = buildQuestions(opts && opts.questions, { board: true });
    if (questions.length < 1) return null;
    const { categories, cells } = buildBoard(questions);

    const code = generateRoomCode(rooms);
    const room = {
      code,
      title,
      theme: "classic",
      settings: cleanBoardSettings(opts && opts.settings),
      status: "waiting",
      round: 1,
      teams: perTeam(() => null),
      playing: [],
      questions,
      categories,
      cells,
      scores: perTeam(() => 0),
      stats: freshStats(),
      winner: null,
      matchStartAt: null,
      control: null,
      phase: "board",
      currentCell: null,
      attempts: {},
      order: [],
      cellWinner: null,
      openedAt: null,
      revealUntil: null,
      createdAt: Date.now(),
    };
    rooms.set(code, room);
    return room;
  }

  function award(room, team) {
    const cell = room.cells[room.currentCell];
    room.scores[team] += cell.points;
    room.stats[team].correct += 1;
    room.cellWinner = team;
    cell.wonBy = team;
    room.control = team;
  }

  function markWrong(room, team) {
    room.stats[team].wrong += 1;
    if (room.settings.penalty) room.scores[team] -= room.cells[room.currentCell].points;
  }

  function startReveal(room) {
    room.phase = "reveal";
    room.cells[room.currentCell].used = true;
    room.revealUntil = Date.now() + REVEAL_MS;
  }

  // Highest score among the teams playing; a tie for first is a draw.
  function topTeam(room) {
    const best = Math.max(...room.playing.map((team) => room.scores[team]));
    const leaders = room.playing.filter((team) => room.scores[team] === best);
    return leaders.length === 1 ? leaders[0] : null;
  }

  function finishReveal(room) {
    room.phase = "board";
    room.currentCell = null;
    room.attempts = {};
    room.order = [];
    room.cellWinner = null;
    room.openedAt = null;
    room.revealUntil = null;
    if (room.cells.every((c) => c.used)) {
      room.status = "finished";
      room.winner = topTeam(room);
    }
  }

  // Answers are in (every playing team, or the window closed). Open questions
  // go to the host if anyone answered; everything else reveals.
  function closeAnswering(room) {
    const q = room.questions[room.cells[room.currentCell].qIndex];
    if (q.type === "open" && room.order.some((team) => room.attempts[team].result === null)) {
      room.phase = "judging";
    } else {
      startReveal(room);
    }
  }

  setInterval(() => {
    sweepUnclaimedRooms(nsp, rooms);
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.status !== "active") continue;
      if (room.phase === "question" && now - room.openedAt >= room.settings.timeLimit * 1000) {
        closeAnswering(room);
        broadcastRoom(room);
      } else if (room.phase === "reveal" && now >= room.revealUntil) {
        finishReveal(room);
        broadcastRoom(room);
      }
    }
  }, 300);

  nsp.on("connection", (socket) => {
    socket.on("create-room", (opts, ack) => {
      if (typeof ack !== "function") return;
      const room = createRoom(opts);
      if (!room) return ack({ ok: false, error: "no-questions" });
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
        ack({ ok: true, room: publicRoom(room), team: null });
        socket.emit("judge-queue", judgeQueue(room));
        return;
      }

      if (!TEAMS.includes(team)) return ack({ ok: false, error: "invalid-team" });
      if (room.teams[team]) return ack({ ok: false, error: "team-taken" });
      // Once a game is under way only its own teams can (re)join, e.g. after
      // a phone drops its connection.
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

    // The team in control picks on its device; the host can also pick from
    // the Big Screen on its behalf.
    socket.on("pick-cell", ({ cell } = {}, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const room = rooms.get(socket.data.code);
      if (!room || room.status !== "active" || room.phase !== "board") return reply({ ok: false });
      if (Date.now() < room.matchStartAt) return reply({ ok: false });
      const team = socket.data.team;
      if (team !== null && team !== room.control) return reply({ ok: false, error: "not-your-pick" });
      const target = room.cells[cell];
      if (!Number.isInteger(cell) || !target || target.used) return reply({ ok: false });

      room.phase = "question";
      room.currentCell = cell;
      room.attempts = {};
      room.order = [];
      room.cellWinner = null;
      room.openedAt = Date.now();
      reply({ ok: true });
      broadcastRoom(room);
    });

    // One attempt per team per question. Auto-checked types score at once;
    // open answers wait for the host.
    socket.on("answer", ({ cell, input } = {}, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const room = rooms.get(socket.data.code);
      const team = socket.data.team;
      if (!room || room.status !== "active" || room.phase !== "question" || !team) return reply({ ok: false });
      if (!room.playing.includes(team)) return reply({ ok: false });
      if (cell !== room.currentCell) return reply({ ok: false, tooLate: true });
      if (room.attempts[team]) return reply({ ok: false, error: "already-answered" });
      const text = String(input == null ? "" : input).trim().slice(0, 200);
      if (!text) return reply({ ok: false });

      const q = room.questions[room.cells[room.currentCell].qIndex];
      room.order.push(team);
      if (q.type === "open") {
        room.attempts[team] = { input: text, result: null };
        reply({ ok: true, pending: true });
      } else {
        const correct = q.checkAnswer(text);
        room.attempts[team] = { input: text, result: correct };
        if (correct) award(room, team);
        else markWrong(room, team);
        reply({ ok: true, correct });
        if (correct) {
          startReveal(room);
          broadcastRoom(room);
          return;
        }
      }
      if (room.playing.every((t) => room.attempts[t])) closeAnswering(room);
      broadcastRoom(room);
    });

    // Host judges open answers in the order they arrived: the first correct
    // one wins the cell and the rest are not judged.
    socket.on("judge", ({ team, correct } = {}, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      const room = rooms.get(socket.data.code);
      if (!room || socket.data.team !== null || room.phase !== "judging") return reply({ ok: false });
      const next = room.order.find((t) => room.attempts[t] && room.attempts[t].result === null);
      if (!next || next !== team) return reply({ ok: false });

      room.attempts[team].result = !!correct;
      if (correct) {
        award(room, team);
        room.order.forEach((t) => { if (room.attempts[t].result === null) room.attempts[t].result = "skipped"; });
        startReveal(room);
      } else {
        markWrong(room, team);
        if (!room.order.some((t) => room.attempts[t].result === null)) startReveal(room);
      }
      reply({ ok: true });
      broadcastRoom(room);
    });

    socket.on("disconnect", () => {
      const room = rooms.get(socket.data.code);
      if (!room) return;
      if (socket.data.team && room.teams[socket.data.team] === socket.id) {
        room.teams[socket.data.team] = null;
        broadcastRoom(room);
      }
      // A waiting room outlives its creator's tab (or a refreshed Big Screen);
      // the unclaimed-room sweep removes it if nobody comes. A game in
      // progress ends once nobody at all is connected.
      const connected = nsp.adapter.rooms.get(room.code);
      if (room.status !== "waiting" && (!connected || connected.size === 0)) rooms.delete(room.code);
    });
  });

  return { rooms, createRoom };
}

module.exports = { attach, REVEAL_MS, TEAMS, buildBoard };
