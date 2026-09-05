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

a.on("connect", () => {
  a.emit("create-room", { difficulty: "rookie", team: "A" }, (ack) => {
    log("A create-room ack:", ack.ok, ack.room && ack.room.code);
    const code = ack.room.code;
    b.emit("join-room", { code, team: "B" }, (ackB) => {
      log("B join-room ack:", ackB.ok);
      a.emit("start-match");
      setTimeout(runRound, 200);
    });
  });
});

function runRound() {
  log("Starting round: A answers correctly fast repeatedly, B answers wrong.");
  let ticks = 0;
  const interval = setInterval(() => {
    ticks++;
    a.emit("submit-answer", { correct: true, timeMs: 200 });
    b.emit("submit-answer", { correct: false, timeMs: 3000 });

    const finished = latestRoom && latestRoom.status === "finished";
    if (finished || ticks > 40) {
      clearInterval(interval);
      setTimeout(() => {
        a.close();
        b.close();
        server.close(() => {
          log("Final room:", latestRoom);
          if (finished && latestRoom.winner === "A") {
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
