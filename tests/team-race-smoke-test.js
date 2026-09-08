const path = require("path");
process.env.PORT = process.env.PORT || 4001;
const server = require(path.join(__dirname, "..", "server.js"));
const { io } = require("socket.io-client");

const URL = `http://localhost:${process.env.PORT}/team-race`;
const teacher = io(URL);
const a = io(URL);
const b = io(URL);

function log(...args) { console.log(...args); }

const QUESTIONS = [
  { prompt: "Capital of France?", type: "short-answer", answer: "Paris" },
  { prompt: "What is $2^{3}$?", type: "multiple-choice", choices: ["6", "8", "9", "16"], answer: 1 },
  { prompt: "$H_2O$ is commonly known as?", type: "short-answer", answer: "water" },
];

let latestRoom = null;
a.on("room-update", (room) => { latestRoom = room; });
b.on("room-update", (room) => { latestRoom = room; });

const seenPrompts = {};
let mismatch = false;
let answerLeaked = false;
let mcHiddenChoiceOk = true;
let finished = false;
const MAX_ROUNDS = 40;

function correctAnswerFor(index) {
  const q = QUESTIONS[index % QUESTIONS.length];
  return q.type === "multiple-choice" ? String(q.answer) : q.answer;
}

function checkAck(index, ack) {
  if ("answer" in ack) answerLeaked = true;
  if (seenPrompts[index] === undefined) {
    seenPrompts[index] = ack.prompt;
  } else if (seenPrompts[index] !== ack.prompt) {
    mismatch = true;
    log(`MISMATCH at index ${index}: "${seenPrompts[index]}" vs "${ack.prompt}"`);
  }
  const q = QUESTIONS[index % QUESTIONS.length];
  if (q.type === "multiple-choice" && (!Array.isArray(ack.choices) || ack.choices.length !== q.choices.length)) {
    mcHiddenChoiceOk = false;
  }
}

function aRound(index) {
  if (finished || index >= MAX_ROUNDS) return;
  a.emit("get-question", { index }, (ack) => {
    if (finished || !ack || !ack.ok) return;
    checkAck(index, ack);
    a.emit("submit-answer", { index, input: correctAnswerFor(index) }, (subAck) => {
      if (finished) return;
      if (!subAck || !subAck.ok || subAck.correct !== true) log("A submission unexpectedly not correct:", subAck);
      maybeFinish();
      if (!finished) setTimeout(() => aRound(index + 1), 25);
    });
  });
}

function bRound(index) {
  if (finished || index >= MAX_ROUNDS) return;
  b.emit("get-question", { index }, (ack) => {
    if (finished || !ack || !ack.ok) return;
    checkAck(index, ack);
    b.emit("submit-answer", { index, input: "definitely-wrong-answer" }, (subAck) => {
      if (finished) return;
      maybeFinish();
      if (!finished) setTimeout(() => bRound(index + 1), 25);
    });
  });
}

function maybeFinish() {
  if (finished) return;
  if (latestRoom && latestRoom.status === "finished") {
    finished = true;
    finishTest();
  }
}

function finishTest() {
  setTimeout(() => {
    teacher.close(); a.close(); b.close();
    server.close(() => {
      log("Final room:", latestRoom);
      log("Shared-question indices checked:", Object.keys(seenPrompts).length, "| mismatch:", mismatch);
      log("Answer field ever leaked to client:", answerLeaked);
      log("Multiple-choice options delivered correctly:", mcHiddenChoiceOk);
      const ok = latestRoom && latestRoom.winner === "A" && !mismatch && !answerLeaked && mcHiddenChoiceOk;
      if (ok) {
        log("TEAM RACE SMOKE TEST PASSED");
        process.exit(0);
      } else {
        log("TEAM RACE SMOKE TEST FAILED");
        process.exit(1);
      }
    });
  }, 200);
}

teacher.on("connect", () => {
  teacher.emit("create-room", { title: "Geography & Science", theme: "rocket", questions: QUESTIONS }, (ack) => {
    log("Teacher create-room ack:", ack.ok, ack.room && ack.room.code, "questionCount:", ack.room && ack.room.questionCount, "theme:", ack.room && ack.room.theme);
    if (!ack.room || ack.room.theme !== "rocket") {
      log("THEME MISMATCH: expected 'rocket', got", ack.room && ack.room.theme);
      process.exit(1);
    }
    const code = ack.room.code;
    a.emit("join-room", { code, team: "A" }, (ackA) => {
      log("A join-room ack:", ackA.ok);
      b.emit("join-room", { code, team: "B" }, (ackB) => {
        log("B join-room ack:", ackB.ok);
        teacher.emit("start-match");
        setTimeout(() => {
          aRound(0);
          bRound(0);
        }, 200);
      });
    });
  });
});

setTimeout(() => {
  log("TIMEOUT - test did not complete");
  process.exit(1);
}, 20000);
