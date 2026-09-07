const path = require("path");
process.env.PORT = process.env.PORT || 3999;
const server = require(path.join(__dirname, "..", "server.js"));
const { io } = require("socket.io-client");

const URL = `http://localhost:${process.env.PORT}/tug-of-war`;
const a = io(URL);
const b = io(URL);

function log(...args) { console.log(...args); }

let latestRoom = null;
a.on("room-update", (room) => { latestRoom = room; });
b.on("room-update", (room) => { latestRoom = room; });

const seenDisplays = {}; // index -> display text first observed
let mismatch = false;
let finished = false;
const MAX_ROUNDS = 40;

function checkShared(index, display) {
  if (seenDisplays[index] === undefined) {
    seenDisplays[index] = display;
  } else if (seenDisplays[index] !== display) {
    mismatch = true;
    log(`MISMATCH at index ${index}: "${seenDisplays[index]}" vs "${display}"`);
  }
}

function parseRookieAnswer(display) {
  const [n1, op, n2] = display.split(" ");
  return op === "+" ? Number(n1) + Number(n2) : Number(n1) - Number(n2);
}

function aRound(index) {
  if (finished || index >= MAX_ROUNDS) return;
  a.emit("get-question", { index }, (ack) => {
    if (finished || !ack || !ack.ok) return;
    checkShared(index, ack.display);
    const answer = parseRookieAnswer(ack.display);
    a.emit("submit-answer", { index, input: String(answer) }, (subAck) => {
      if (finished) return;
      if (!subAck || !subAck.ok || subAck.correct !== true) {
        log("A submission unexpectedly not correct:", subAck);
      }
      maybeFinish();
      if (!finished) setTimeout(() => aRound(index + 1), 25);
    });
  });
}

function bRound(index) {
  if (finished || index >= MAX_ROUNDS) return;
  b.emit("get-question", { index }, (ack) => {
    if (finished || !ack || !ack.ok) return;
    checkShared(index, ack.display);
    b.emit("submit-answer", { index, input: "999999" }, (subAck) => {
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
    a.close();
    b.close();
    server.close(() => {
      log("Final room:", latestRoom);
      log("Shared-question indices checked:", Object.keys(seenDisplays).length, "| mismatch:", mismatch);
      const ok = latestRoom && latestRoom.winner === "A" && !mismatch;
      if (ok) {
        log("SMOKE TEST PASSED: Team A won, and both teams saw identical questions at every shared index.");
        process.exit(0);
      } else {
        log("SMOKE TEST FAILED");
        process.exit(1);
      }
    });
  }, 200);
}

a.on("connect", () => {
  a.emit("create-room", { difficulty: "rookie", team: "A" }, (ack) => {
    log("A create-room ack:", ack.ok, ack.room && ack.room.code);
    const code = ack.room.code;
    b.emit("join-room", { code, team: "B" }, (ackB) => {
      log("B join-room ack:", ackB.ok);
      a.emit("start-match");
      setTimeout(() => {
        aRound(0);
        bRound(0);
      }, 200);
    });
  });
});

setTimeout(() => {
  log("TIMEOUT - test did not complete");
  process.exit(1);
}, 20000);
