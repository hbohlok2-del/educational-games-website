const { pullMagnitude, ROPE_MIN, ROPE_MAX, ROPE_CENTER } = require("./tugOfWar");

const MATCH_DURATION_MS = 180000;
const START_COUNTDOWN_MS = 3000;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";

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

function buildQuestion(raw) {
  if (!raw || typeof raw !== "object") return null;
  const prompt = String(raw.prompt || "").trim();
  if (!prompt) return null;
  const type = raw.type === "multiple-choice" ? "multiple-choice" : "short-answer";

  if (type === "multiple-choice") {
    const choices = Array.isArray(raw.choices)
      ? raw.choices.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const answerIndex = Number(raw.answer);
    if (choices.length < 2 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
      return null;
    }
    return {
      prompt, type, choices,
      checkAnswer(input) { return Number(input) === answerIndex; },
    };
  }

  const answerRaw = String(raw.answer == null ? "" : raw.answer).trim();
  if (!answerRaw) return null;
  const answerNorm = answerRaw.toLowerCase();
  const answerNum = Number(answerRaw);
  return {
    prompt, type, choices: null,
    checkAnswer(input) {
      const val = String(input == null ? "" : input).trim();
      if (!val) return false;
      if (Number.isFinite(answerNum)) {
        const v = Number(val);
        if (Number.isFinite(v)) return v === answerNum;
      }
      return val.toLowerCase() === answerNorm;
    },
  };
}

function buildQuestions(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(buildQuestion).filter(Boolean);
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
    position: room.position,
    stats: room.stats,
    matchStartAt: room.matchStartAt,
    winner: room.winner,
    questionCount: room.questions.length,
  };
}

function attach(io) {
  const nsp = io.of("/team-race");
  const rooms = new Map();

  function broadcastRoom(room) {
    nsp.to(room.code).emit("room-update", publicRoom(room));
  }

  function checkTimeCap(room) {
    if (room.status !== "active" || !room.matchStartAt) return;
    const elapsed = Date.now() - room.matchStartAt;
    if (elapsed < MATCH_DURATION_MS) return;
    room.status = "finished";
    room.winner = room.position < ROPE_CENTER ? "A" : room.position > ROPE_CENTER ? "B" : null;
    room.timedOut = true;
    broadcastRoom(room);
  }

  setInterval(() => {
    for (const room of rooms.values()) checkTimeCap(room);
  }, 1000);

  nsp.on("connection", (socket) => {
    socket.on("create-room", (opts, ack) => {
      if (typeof ack !== "function") return;
      const title = String((opts && opts.title) || "").trim().slice(0, 80) || "Class Race";
      const theme = opts && opts.theme === "rocket" ? "rocket" : "rope";
      const questions = buildQuestions(opts && opts.questions);
      if (questions.length < 1) return ack({ ok: false, error: "Add at least one valid question first." });

      const code = generateRoomCode(rooms);
      const room = {
        code,
        title,
        theme,
        status: "waiting",
        round: 1,
        position: ROPE_CENTER,
        stats: freshStats(),
        matchStartAt: null,
        winner: null,
        timedOut: false,
        teams: { A: null, B: null },
        questions,
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
      room.position = ROPE_CENTER;
      room.stats = freshStats();
      room.winner = null;
      room.timedOut = false;
      room.matchStartAt = Date.now() + START_COUNTDOWN_MS;
      broadcastRoom(room);
    });

    socket.on("rematch", () => {
      const room = rooms.get(socket.data.code);
      if (!room) return;
      room.round += 1;
      room.status = "active";
      room.position = ROPE_CENTER;
      room.stats = freshStats();
      room.winner = null;
      room.timedOut = false;
      room.matchStartAt = Date.now() + START_COUNTDOWN_MS;
      broadcastRoom(room);
    });

    socket.on("get-question", ({ index } = {}, ack) => {
      const room = rooms.get(socket.data.code);
      if (typeof ack !== "function") return;
      if (!room || room.status !== "active" || !room.questions.length || !Number.isInteger(index) || index < 0) {
        return ack({ ok: false });
      }
      const q = room.questions[index % room.questions.length];
      socket.data.lastQuestion = { index, at: Date.now() };
      ack({ ok: true, prompt: q.prompt, type: q.type, choices: q.choices });
    });

    socket.on("submit-answer", ({ index, input } = {}, ack) => {
      const room = rooms.get(socket.data.code);
      const team = socket.data.team;
      if (!room || room.status !== "active" || !team || !room.questions.length) {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }
      if (!Number.isInteger(index) || index < 0) {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }

      const q = room.questions[index % room.questions.length];
      const correct = q.checkAnswer(input);
      const issued = socket.data.lastQuestion;
      const timeMs = issued && issued.index === index ? Date.now() - issued.at : 99999;
      const mag = correct ? pullMagnitude(timeMs) : 0;
      const sign = team === "A" ? -1 : 1;
      room.position = Math.max(ROPE_MIN, Math.min(ROPE_MAX, room.position + sign * mag));
      if (correct) room.stats[team].correct += 1;
      else room.stats[team].wrong += 1;

      let winner = null;
      if (room.position <= ROPE_MIN) winner = "A";
      else if (room.position >= ROPE_MAX) winner = "B";
      if (winner) {
        room.status = "finished";
        room.winner = winner;
      }

      if (typeof ack === "function") ack({ ok: true, correct, mag });
      broadcastRoom(room);
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

module.exports = { attach };
