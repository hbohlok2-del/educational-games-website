const path = require("path");
process.env.PORT = process.env.PORT || 4002;
const server = require(path.join(__dirname, "..", "server.js"));
const { io } = require("socket.io-client");

const URL = `http://localhost:${process.env.PORT}/team-buzzer`;
const teacher = io(URL);
const a = io(URL);
const b = io(URL);

function log(...args) { console.log(...args); }

const QUESTIONS = [
  { prompt: "Capital of Japan?", type: "short-answer", answer: "Tokyo" },
  { prompt: "What is $3^{2}$?", type: "multiple-choice", choices: ["6", "9", "12"], answer: 1 },
];

function correctInputFor(index) {
  const q = QUESTIONS[index % QUESTIONS.length];
  return q.type === "multiple-choice" ? String(q.answer) : q.answer;
}

let latestRoom = null;
let finished = false;
const seenPrompts = {};
let mismatch = false;
let answerLeaked = false;
let mcChoicesOk = true;
let aActedAt = null;
let bActedAt = null;
let tooLateObserved = false;

function checkShared(room) {
  if (!room.question) return;
  if ("answer" in room.question) answerLeaked = true;
  const idx = room.currentIndex;
  if (seenPrompts[idx] === undefined) {
    seenPrompts[idx] = room.question.prompt;
  } else if (seenPrompts[idx] !== room.question.prompt) {
    mismatch = true;
    log(`MISMATCH at index ${idx}: "${seenPrompts[idx]}" vs "${room.question.prompt}"`);
  }
  const q = QUESTIONS[idx % QUESTIONS.length];
  if (q.type === "multiple-choice" && (!Array.isArray(room.question.choices) || room.question.choices.length !== q.choices.length)) {
    mcChoicesOk = false;
  }
}

function maybeFinish(room) {
  if (finished) return;
  if (room.status === "finished") {
    finished = true;
    finishTest();
  }
}

a.on("room-update", (room) => {
  latestRoom = room;
  checkShared(room);
  maybeFinish(room);
  if (finished || room.status !== "active" || !room.question || room.locked) return;
  if (aActedAt === room.revealAt) return;
  aActedAt = room.revealAt;
  a.emit("buzz-answer", { index: room.currentIndex, input: correctInputFor(room.currentIndex) }, (ack) => {
    if (ack && ack.tooLate) tooLateObserved = true;
    if (!ack || !ack.ok || ack.correct !== true) log("A buzz unexpectedly not correct:", ack);
  });
});

b.on("room-update", (room) => {
  latestRoom = room;
  checkShared(room);
  maybeFinish(room);
  if (finished || room.status !== "active" || !room.question || room.locked) return;
  if (bActedAt === room.revealAt) return;
  bActedAt = room.revealAt;
  b.emit("buzz-answer", { index: room.currentIndex, input: "definitely-wrong-answer" }, (ack) => {
    if (ack && ack.tooLate) tooLateObserved = true;
  });
});

function finishTest() {
  setTimeout(() => {
    teacher.close(); a.close(); b.close();
    server.close(() => {
      log("Final room:", latestRoom);
      log("Shared-question indices checked:", Object.keys(seenPrompts).length, "| mismatch:", mismatch);
      log("Answer field ever leaked to client:", answerLeaked);
      log("Multiple-choice options delivered correctly:", mcChoicesOk);
      log("'Too late' rejection observed at least once:", tooLateObserved);
      const ok = latestRoom && latestRoom.winner === "A" && latestRoom.scores.A >= latestRoom.winScore &&
        !mismatch && !answerLeaked && mcChoicesOk;
      if (ok) {
        log("TEAM BUZZER SMOKE TEST PASSED");
        process.exit(0);
      } else {
        log("TEAM BUZZER SMOKE TEST FAILED");
        process.exit(1);
      }
    });
  }, 400);
}

teacher.on("connect", () => {
  teacher.emit("create-room", { title: "World Quiz", theme: "spotlight", questions: QUESTIONS }, (ack) => {
    log("Teacher create-room ack:", ack.ok, ack.room && ack.room.code, "questionCount:", ack.room && ack.room.questionCount);
    const code = ack.room.code;
    a.emit("join-room", { code, team: "A" }, (ackA) => {
      log("A join-room ack:", ackA.ok);
      b.emit("join-room", { code, team: "B" }, (ackB) => {
        log("B join-room ack:", ackB.ok);
        teacher.emit("start-match");
      });
    });
  });
});

setTimeout(() => {
  log("TIMEOUT - test did not complete");
  process.exit(1);
}, 30000);
