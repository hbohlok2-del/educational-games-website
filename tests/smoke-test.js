const path = require("path");
process.env.PORT = process.env.PORT || 3999;
const server = require(path.join(__dirname, "..", "server.js"));
const { io } = require("socket.io-client");

const URL = `http://localhost:${process.env.PORT}/tug-of-war`;
const a = io(URL);
const b = io(URL);

let code;

function log(...args) { console.log(...args); }

a.on("connect", () => {
  a.emit("create-room", { difficulty: "early" }, (ack) => {
    log("A create-room ack:", ack);
    code = ack.code;
    b.emit("join-room", { code, team: "B" }, (ackB) => {
      log("B join-room ack:", ackB);
      runRound();
    });
  });
});

let position = 0;
a.on("state", (s) => { position = s.position; });
b.on("state", (s) => { position = s.position; });

let gameOverResult = null;
a.on("game-over", (g) => { gameOverResult = { who: "A", ...g }; });
b.on("game-over", (g) => { gameOverResult = { who: "B", ...g }; });

function runRound() {
  log("Starting round: A answers correctly fast repeatedly, B answers wrong.");
  let ticks = 0;
  const interval = setInterval(() => {
    ticks++;
    a.emit("submit-answer", { correct: true, timeMs: 200 });
    b.emit("submit-answer", { correct: false, timeMs: 3000 });

    if (gameOverResult || ticks > 40) {
      clearInterval(interval);
      setTimeout(() => {
        log("Final position:", position);
        log("Game over result:", gameOverResult);
        a.close();
        b.close();
        server.close(() => {
          if (gameOverResult && gameOverResult.winner === "A") {
            log("SMOKE TEST PASSED: Team A won as expected.");
            process.exit(0);
          } else {
            log("SMOKE TEST FAILED");
            process.exit(1);
          }
        });
      }, 300);
    }
  }, 60);
}

setTimeout(() => {
  log("TIMEOUT - test did not complete");
  process.exit(1);
}, 15000);
