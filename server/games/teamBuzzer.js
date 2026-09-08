const { buildQuestions } = require("../content/questions");

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";
const START_COUNTDOWN_MS = 3000;
const BUZZ_WINDOW_MS = 12000;
const NEXT_QUESTION_DELAY_MS = 1800;
const MATCH_DURATION_MS = 180000;
const WIN_SCORE = 5;

function generateRoomCode(rooms) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function freshStats() {
  return { A: { correct: 0, wrong: 0 }, B: { correct: 0, wrong: 0 } };
}

function currentQuestionPublic(room) {
  if (room.currentIndex < 0 || room.currentIndex >= room.questions.length) return null;
  const q = room.questions[room.currentIndex];
  return { prompt: q.prompt, type: q.type, choices: q.choices };
}

function publicRoom(room) {
  return {
    code: room.code,
    title: room.title,
    theme: room.theme,
    status: room.status,
    round: room.round,
    teamA: { joined: !!room.teams.A },
    teamB: { joined: !!room.teams.B },
    scores: room.scores,
    stats: room.stats,
    matchStartAt: room.matchStartAt,
    winner: room.winner,
    questionCount: room.questions.length,
    currentIndex: room.currentIndex,
    question: currentQuestionPublic(room),
    locked: room.locked,
    lastResult: room.lastResult,
    revealAt: room.questionRevealedAt,
    nextAt: room.nextAt,
    windowMs: BUZZ_WINDOW_MS,
    winScore: WIN_SCORE,
  };
}

function attach(io) {
  const nsp = io.of("/team-buzzer");
  const rooms = new Map();

  function broadcastRoom(room) {
    nsp.to(room.code).emit("room-update", publicRoom(room));
  }

  function revealQuestion(room, index) {
    room.currentIndex = index;
    room.locked = false;
    room.lastResult = null;
    room.questionRevealedAt = Date.now();
    room.nextAt = null;
  }

  function resolveQuestion(room, winnerTeam) {
    room.locked = true;
    room.lastResult = { winner: winnerTeam || null };
    room.nextAt = Date.now() + NEXT_QUESTION_DELAY_MS;
  }

  setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.status !== "active") continue;

      if (room.matchStartAt && now - room.matchStartAt >= MATCH_DURATION_MS) {
        room.status = "finished";
        room.winner = room.scores.A === room.scores.B ? null : (room.scores.A > room.scores.B ? "A" : "B");
        broadcastRoom(room);
        continue;
      }

      if (!room.locked && room.questionRevealedAt && now - room.questionRevealedAt >= BUZZ_WINDOW_MS) {
        resolveQuestion(room, null);
        broadcastRoom(room);
        continue;
      }

      if (room.locked && room.nextAt && now >= room.nextAt) {
        revealQuestion(room, (room.currentIndex + 1) % room.questions.length);
        broadcastRoom(room);
      }
    }
  }, 300);

  nsp.on("connection", (socket) => {
    socket.on("create-room", (opts, ack) => {
      if (typeof ack !== "function") return;
      const title = String((opts && opts.title) || "").trim().slice(0, 80) || "Class Buzzer";
      const theme = opts && opts.theme === "spotlight" ? "spotlight" : "spotlight";
      const questions = buildQuestions(opts && opts.questions);
      if (questions.length < 1) return ack({ ok: false, error: "Add at least one valid question first." });

      const code = generateRoomCode(rooms);
      const room = {
        code,
        title,
        theme,
        status: "waiting",
        round: 1,
        scores: { A: 0, B: 0 },
        stats: freshStats(),
        matchStartAt: null,
        winner: null,
        teams: { A: null, B: null },
        questions,
        currentIndex: -1,
        locked: true,
        lastResult: null,
        questionRevealedAt: null,
        nextAt: null,
      };
      rooms.set(code, room);
      socket.join(code);
      socket.data.code = code;
      socket.data.team = null;
      ack({ ok: true, room: publicRoom(room) });
    });

    socket.on("join-room", ({ code, team } = {}, ack) => {
      const room = rooms.get((code || "").toUpperCase());
      if (!room) return ack({ ok: false, error: "No match found with that code." });

      if (!team) {
        socket.join(room.code);
        socket.data.code = room.code;
        socket.data.team = null;
        return ack({ ok: true, room: publicRoom(room), team: null });
      }

      if (!["A", "B"].includes(team)) return ack({ ok: false, error: "Invalid team" });
      if (room.teams[team]) return ack({ ok: false, error: "That team is already taken." });

      room.teams[team] = socket.id;
      socket.join(room.code);
      socket.data.code = room.code;
      socket.data.team = team;
      ack({ ok: true, room: publicRoom(room), team });
      broadcastRoom(room);
    });

    socket.on("peek-room", ({ code } = {}, ack) => {
      const room = rooms.get((code || "").toUpperCase());
      if (!room) return ack({ ok: false, error: "No match found with that code." });
      ack({ ok: true, room: publicRoom(room) });
    });

    socket.on("start-match", () => {
      const room = rooms.get(socket.data.code);
      if (!room || !room.teams.A || !room.teams.B) return;
      room.status = "active";
      room.round = room.round || 1;
      room.scores = { A: 0, B: 0 };
      room.stats = freshStats();
      room.winner = null;
      room.matchStartAt = Date.now() + START_COUNTDOWN_MS;
      room.currentIndex = -1;
      room.locked = true;
      room.lastResult = null;
      room.nextAt = room.matchStartAt;
      broadcastRoom(room);
    });

    socket.on("rematch", () => {
      const room = rooms.get(socket.data.code);
      if (!room) return;
      room.round += 1;
      room.status = "active";
      room.scores = { A: 0, B: 0 };
      room.stats = freshStats();
      room.winner = null;
      room.matchStartAt = Date.now() + START_COUNTDOWN_MS;
      room.currentIndex = -1;
      room.locked = true;
      room.lastResult = null;
      room.nextAt = room.matchStartAt;
      broadcastRoom(room);
    });

    socket.on("buzz-answer", ({ index, input } = {}, ack) => {
      const room = rooms.get(socket.data.code);
      const team = socket.data.team;
      if (!room || room.status !== "active" || !team) {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }
      if (room.locked || room.currentIndex < 0 || index !== room.currentIndex) {
        if (typeof ack === "function") ack({ ok: true, correct: false, tooLate: true });
        return;
      }

      const q = room.questions[room.currentIndex];
      const correct = q.checkAnswer(input);
      if (correct) {
        room.scores[team] += 1;
        room.stats[team].correct += 1;
        resolveQuestion(room, team);
        if (room.scores[team] >= WIN_SCORE) {
          room.status = "finished";
          room.winner = team;
        }
        if (typeof ack === "function") ack({ ok: true, correct: true });
        broadcastRoom(room);
      } else {
        room.stats[team].wrong += 1;
        if (typeof ack === "function") ack({ ok: true, correct: false });
      }
    });

    socket.on("disconnect", () => {
      const room = rooms.get(socket.data.code);
      if (!room) return;
      if (socket.data.team && room.teams[socket.data.team] === socket.id) {
        room.teams[socket.data.team] = null;
        broadcastRoom(room);
      }
      if (!room.teams.A && !room.teams.B) rooms.delete(room.code);
    });
  });

  return { rooms };
}

module.exports = { attach, BUZZ_WINDOW_MS, WIN_SCORE };
