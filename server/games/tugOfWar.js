const ROPE_MIN = 0;
const ROPE_MAX = 100;
const ROPE_CENTER = 50;
const MATCH_DURATION_MS = 180000;
const START_COUNTDOWN_MS = 3000;
const WRONG_LOCKOUT_MS = 700;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";

function generateRoomCode(rooms) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function pullMagnitude(timeMs) {
  if (timeMs < 5000) return 10;
  if (timeMs <= 10000) return 7;
  return 5;
}

function freshStats() {
  return { A: { correct: 0, wrong: 0 }, B: { correct: 0, wrong: 0 } };
}

function publicRoom(room) {
  return {
    code: room.code,
    difficulty: room.difficulty,
    status: room.status,
    round: room.round,
    teamA: { joined: !!room.teams.A },
    teamB: { joined: !!room.teams.B },
    position: room.position,
    stats: room.stats,
    matchStartAt: room.matchStartAt,
    winner: room.winner,
  };
}

function attach(io) {
  const nsp = io.of("/tug-of-war");
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
      const difficulty = ["rookie", "varsity", "champion"].includes(opts && opts.difficulty) ? opts.difficulty : "rookie";
      const team = opts && opts.team === "B" ? "B" : "A";
      const code = generateRoomCode(rooms);
      const room = {
        code,
        difficulty,
        status: "waiting",
        round: 1,
        position: ROPE_CENTER,
        stats: freshStats(),
        matchStartAt: null,
        winner: null,
        teams: { A: null, B: null },
      };
      room.teams[team] = socket.id;
      rooms.set(code, room);
      socket.join(code);
      socket.data.code = code;
      socket.data.team = team;
      ack({ ok: true, room: publicRoom(room), team });
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

    socket.on("submit-answer", ({ correct, timeMs } = {}) => {
      const room = rooms.get(socket.data.code);
      const team = socket.data.team;
      if (!room || room.status !== "active" || !team) return;

      const mag = correct ? pullMagnitude(Number(timeMs) || 0) : 0;
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

module.exports = { attach, pullMagnitude, ROPE_MIN, ROPE_MAX, ROPE_CENTER };
