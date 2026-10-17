const path = require("path");
process.env.PORT = process.env.PORT || 4006;
const server = require(path.join(__dirname, "..", "server.js"));
const { io } = require("socket.io-client");

const url = `http://localhost:${process.env.PORT}/team-race`;

let failures = 0;
function check(label, ok) {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures++;
}

function emit(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function nextUpdate(socket, pred) {
  return new Promise((resolve) => {
    function handler(room) {
      if (pred(room)) { socket.off("room-update", handler); resolve(room); }
    }
    socket.on("room-update", handler);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const connect = (s) => new Promise((r) => s.on("connect", r));

const QUESTIONS = [
  { prompt: "2 + 2?", type: "short-answer", answer: "4" },
  { prompt: "Pick b", type: "multiple-choice", choices: ["a", "b"], answer: 1 },
];

async function main() {
  const host = io(url);
  await connect(host);

  // --- Team counts per theme ---
  const four = await emit(host, "create-room", { title: "Four", theme: "rocket", questions: QUESTIONS, settings: { teams: 4 } });
  check("rocket race with 4 teams offers 4 seats", four.ok && four.room.teamSlots.join("") === "ABCD");
  const two = await emit(host, "create-room", { title: "Two", theme: "rocket", questions: QUESTIONS, settings: { teams: 2 } });
  check("rocket race with 2 teams offers 2 seats", two.room.teamSlots.join("") === "AB");
  const unset = await emit(host, "create-room", { title: "Unset", theme: "rocket", questions: QUESTIONS });
  check("rocket race defaults to 2 seats", unset.room.teamSlots.join("") === "AB");
  const rope = await emit(host, "create-room", { title: "Rope", theme: "rope", questions: QUESTIONS, settings: { teams: 4 } });
  check("the rope race stays at 2 seats even if 4 is asked", rope.room.teamSlots.join("") === "AB");
  const odd = await emit(host, "create-room", { title: "Odd", theme: "rocket", questions: QUESTIONS, settings: { teams: 3 } });
  check("an unlisted team count falls back to 2", odd.room.teamSlots.join("") === "AB");

  // --- A 2-seat room refuses Green, and needs both teams ---
  const red2 = io(url), green2 = io(url);
  await Promise.all([red2, green2].map(connect));
  const greenIn2 = await emit(green2, "join-room", { code: two.room.code, team: "C" });
  check("a 2-team race refuses a third color", greenIn2.ok === false && greenIn2.error === "invalid-team");
  await emit(red2, "join-room", { code: two.room.code, team: "A" });
  red2.emit("start-match");
  await wait(300);
  const still = await emit(host, "peek-room", { code: two.room.code });
  check("one team alone cannot start a 2-team race", still.room.status === "waiting");

  // --- Four-lane race with three teams (Red, Green, Purple) ---
  const red = io(url), blue = io(url), green = io(url), purple = io(url);
  await Promise.all([red, blue, green, purple].map(connect));
  const code = four.room.code;
  await emit(red, "join-room", { code, team: "A" });
  await emit(green, "join-room", { code, team: "C" });
  const purpleJoin = await emit(purple, "join-room", { code, team: "D" });
  check("green and purple can join a 4-lane race", purpleJoin.ok && purpleJoin.room.teams.C.joined && purpleJoin.room.teams.D.joined);

  red.emit("start-match");
  const started = await nextUpdate(red, (r) => r.status === "active");
  check("three teams race, the empty lane does not", started.playing.join("") === "ACD");
  check("every lane starts at zero", ["A", "B", "C", "D"].every((t) => started.progress[t] === 0));
  const lateBlue = await emit(blue, "join-room", { code, team: "B" });
  check("a new team cannot join after the start", lateBlue.ok === false && lateBlue.error === "game-started");
  await wait(3100);

  const wrong = await emit(green, "submit-answer", { index: 0, input: "5" });
  check("a wrong answer does not move the rocket", wrong.ok && wrong.correct === false && wrong.mag === 0);

  // Purple answers correctly until its rocket reaches the finish.
  let winnerRoom = null;
  const finished = nextUpdate(red, (r) => r.status === "finished").then((r) => { winnerRoom = r; });
  for (let i = 0; i < 40 && !winnerRoom; i++) {
    await emit(purple, "get-question", { index: i });
    const q = QUESTIONS[i % QUESTIONS.length];
    await emit(purple, "submit-answer", { index: i, input: q.type === "multiple-choice" ? String(q.answer) : q.answer });
    await wait(10);
  }
  await finished;
  check("the first rocket to the finish wins", winnerRoom.winner === "D" && winnerRoom.progress.D === 100);
  check("other rockets keep their own progress", winnerRoom.progress.A === 0 && winnerRoom.progress.C === 0);
  check("stats cover each lane", winnerRoom.stats.C.wrong === 1 && winnerRoom.stats.D.correct > 0);

  const rematched = nextUpdate(red, (r) => r.round === 2);
  red.emit("rematch");
  const r2 = await rematched;
  check("rematch resets every lane", r2.status === "active" && r2.playing.join("") === "ACD" && r2.progress.D === 0);

  [host, red2, green2, red, blue, green, purple].forEach((s) => s.close());
  server.close(() => {
    console.log(failures ? `TEAM RACE LANES TEST FAILED (${failures})` : "TEAM RACE LANES TEST PASSED");
    process.exit(failures ? 1 : 0);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });

setTimeout(() => {
  console.log("TIMEOUT - test did not complete");
  process.exit(1);
}, 30000);
