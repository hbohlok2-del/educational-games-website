const ROPE_LIMIT = 100;
const BASE_PULL = 6;
const MAX_SPEED_BONUS = 6;
const WRONG_ANSWER_PENALTY = 3;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(rooms) {
  let code;
  do {
    code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function pullForAnswer(correct, timeMs) {
  if (!correct) return -WRONG_ANSWER_PENALTY;
  const speedBonus = Math.max(0, MAX_SPEED_BONUS - timeMs / 1500);
  return BASE_PULL + speedBonus;
}

function attach(io) {
  const nsp = io.of("/tug-of-war");
  const rooms = new Map();

  nsp.on("connection", (socket) => {
    socket.on("create-room", (opts, ack) => {
      const difficulty = ["early", "upper", "middle"].includes(opts && opts.difficulty) ? opts.difficulty : "early";
      const code = generateRoomCode(rooms);
      const room = {
        code,
        difficulty,
        position: 0,
        finished: false,
        winner: null,
        teams: { A: null, B: null },
      };
      rooms.set(code, room);
      room.teams.A = socket.id;
      socket.join(code);
      socket.data.code = code;
      socket.data.team = "A";
      ack({ ok: true, code, team: "A", difficulty, position: room.position });
    });

    socket.on("join-room", ({ code, team } = {}, ack) => {
      const room = rooms.get((code || "").toUpperCase());
      if (!room) return ack({ ok: false, error: "Room not found" });

      if (!team) {
        socket.join(room.code);
        socket.data.code = room.code;
        socket.data.team = null;
        return ack({ ok: true, code: room.code, team: null, difficulty: room.difficulty, position: room.position, spectator: true });
      }

      if (!["A", "B"].includes(team)) return ack({ ok: false, error: "Invalid team" });
      if (room.teams[team]) return ack({ ok: false, error: "That team already has a player" });

      room.teams[team] = socket.id;
      socket.join(room.code);
      socket.data.code = room.code;
      socket.data.team = team;
      ack({ ok: true, code: room.code, team, difficulty: room.difficulty, position: room.position });
      nsp.to(room.code).emit("player-joined", { team });
    });

    socket.on("submit-answer", ({ correct, timeMs } = {}) => {
      const room = rooms.get(socket.data.code);
      if (!room || room.finished || !socket.data.team) return;

      const pull = pullForAnswer(!!correct, Number(timeMs) || 0);
      const delta = socket.data.team === "A" ? -pull : pull;
      room.position = Math.max(-ROPE_LIMIT, Math.min(ROPE_LIMIT, room.position + delta));

      let winner = null;
      if (room.position <= -ROPE_LIMIT) winner = "A";
      else if (room.position >= ROPE_LIMIT) winner = "B";

      if (winner) {
        room.finished = true;
        room.winner = winner;
      }

      nsp.to(room.code).emit("state", { position: room.position });
      if (winner) nsp.to(room.code).emit("game-over", { winner });
    });

    socket.on("disconnect", () => {
      const room = rooms.get(socket.data.code);
      if (!room) return;
      if (socket.data.team && room.teams[socket.data.team] === socket.id) {
        room.teams[socket.data.team] = null;
        nsp.to(room.code).emit("opponent-left", { team: socket.data.team });
      }
      const stillHasPlayers = room.teams.A || room.teams.B;
      if (!stillHasPlayers) rooms.delete(room.code);
    });
  });

  return { rooms };
}

module.exports = { attach, pullForAnswer, ROPE_LIMIT };
