const { pullMagnitude, ROPE_MIN, ROPE_MAX, ROPE_CENTER } = require("./tugOfWar");
const { buildQuestions, cleanBoardSettings } = require("../content/questions");
const { sweepUnclaimedRooms } = require("./roomSweep");

const MATCH_DURATION_MS = 180000;
const START_COUNTDOWN_MS = 3000;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";
const TEAMS = ["A", "B", "C", "D"]; // red, blue, green, purple
const MIN_TEAMS = 2;

function generateRoomCode(rooms) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function perSlot(room, make) {
  const out = {};
  room.slots.forEach((team) => { out[team] = make(); });
  return out;
}

function joinedTeams(room) {
  return room.slots.filter((team) => room.teams[team]);
}

// A rope has two ends, so the rope race is always 2 teams. Rocket races run
// 2 to 4 lanes, as the teacher chose (2 when unset).
function teamSlots(theme, settings) {
  return TEAMS.slice(0, theme === "rocket" && settings.teams ? settings.teams : 2);
}

function publicRoom(room) {
  return {
    code: room.code,
    title: room.title,
    theme: room.theme,
    status: room.status,
    round: room.round,
    teamSlots: room.slots,
    teams: room.slots.reduce((acc, team) => { acc[team] = { joined: !!room.teams[team] }; return acc; }, {}),
    playing: room.playing,
    position: room.position,
    progress: room.progress,
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
    room.winner = room.theme === "rocket"
      ? highestRocket(room)
      : (room.position < ROPE_CENTER ? "A" : room.position > ROPE_CENTER ? "B" : null);
    room.timedOut = true;
    broadcastRoom(room);
  }

  // When time runs out the highest rocket wins; a tie for first is a draw.
  function highestRocket(room) {
    const best = Math.max(...room.playing.map((team) => room.progress[team]));
    const leaders = room.playing.filter((team) => room.progress[team] === best);
    return leaders.length === 1 ? leaders[0] : null;
  }

  // The teams joined at start are the ones that race this round.
  function resetMatch(room) {
    room.status = "active";
    room.playing = joinedTeams(room);
    room.position = ROPE_CENTER;
    room.progress = perSlot(room, () => 0);
    room.stats = perSlot(room, () => ({ correct: 0, wrong: 0 }));
    room.winner = null;
    room.timedOut = false;
    room.matchStartAt = Date.now() + START_COUNTDOWN_MS;
  }

  setInterval(() => {
    for (const room of rooms.values()) checkTimeCap(room);
    sweepUnclaimedRooms(nsp, rooms);
  }, 1000);

  // Builds and registers a room with no socket attached. Used both by the
  // create-room socket event and by launching a saved quiz over HTTP, so the
  // question list (with answers) never has to pass through a browser.
  function createRoom(opts) {
    const title = String((opts && opts.title) || "").trim().slice(0, 80) || "Class Race";
    const theme = opts && opts.theme === "rocket" ? "rocket" : "rope";
    const questions = buildQuestions(opts && opts.questions);
    if (questions.length < 1) return null;

    const code = generateRoomCode(rooms);
    const room = {
      code,
      title,
      theme,
      slots: teamSlots(theme, cleanBoardSettings(opts && opts.settings)),
      status: "waiting",
      round: 1,
      position: ROPE_CENTER,
      matchStartAt: null,
      winner: null,
      timedOut: false,
      playing: [],
      questions,
      createdAt: Date.now(),
    };
    room.teams = perSlot(room, () => null);
    room.progress = perSlot(room, () => 0);
    room.stats = perSlot(room, () => ({ correct: 0, wrong: 0 }));
    rooms.set(code, room);
    return room;
  }

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
      // Once a race is under way only its own teams can (re)join.
      if (room.status !== "waiting" && !room.playing.includes(team)) return ack({ ok: false, error: "game-started" });

      room.teams[team] = socket.id;
      socket.join(room.code);
      socket.data.code = room.code;
      socket.data.team = team;
      ack({ ok: true, room: publicRoom(room), team });
      broadcastRoom(room);
    });

    socket.on("peek-room", ({ code } = {}, ack) => {
      const room = rooms.get((code || "").toUpperCase());
      if (!room) return ack({ ok: false, error: "room-not-found" });
      ack({ ok: true, room: publicRoom(room) });
    });

    // A 2-team race needs both teams; a 4-lane race starts with any 2.
    socket.on("start-match", () => {
      const room = rooms.get(socket.data.code);
      if (!room || room.status !== "waiting" || joinedTeams(room).length < MIN_TEAMS) return;
      resetMatch(room);
      broadcastRoom(room);
    });

    socket.on("rematch", () => {
      const room = rooms.get(socket.data.code);
      if (!room || joinedTeams(room).length < MIN_TEAMS) return;
      room.round += 1;
      resetMatch(room);
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
      if (!room || room.status !== "active" || !team || !room.playing.includes(team) || !room.questions.length) {
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

      let winner = null;
      if (room.theme === "rocket") {
        room.progress[team] = Math.min(ROPE_MAX, room.progress[team] + mag);
        if (room.progress[team] >= ROPE_MAX) winner = team;
      } else {
        const sign = team === "A" ? -1 : 1;
        room.position = Math.max(ROPE_MIN, Math.min(ROPE_MAX, room.position + sign * mag));
        if (room.position <= ROPE_MIN) winner = "A";
        else if (room.position >= ROPE_MAX) winner = "B";
      }
      if (correct) room.stats[team].correct += 1;
      else room.stats[team].wrong += 1;

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
      if (joinedTeams(room).length === 0) rooms.delete(room.code);
    });
  });

  return { rooms, createRoom };
}

module.exports = { attach, TEAMS };
