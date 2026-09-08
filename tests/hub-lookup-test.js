const path = require("path");
process.env.PORT = process.env.PORT || 4003;
const server = require(path.join(__dirname, "..", "server.js"));
const { io } = require("socket.io-client");

const raceUrl = `http://localhost:${process.env.PORT}/team-race`;
const buzzerUrl = `http://localhost:${process.env.PORT}/team-buzzer`;

function log(...args) { console.log(...args); }

function peek(socket, code) {
  return new Promise((resolve) => {
    socket.emit("peek-room", { code }, (ack) => resolve(!!(ack && ack.ok)));
  });
}

async function main() {
  const raceCreator = io(raceUrl);
  const buzzerCreator = io(buzzerUrl);
  const raceLookup = io(raceUrl);
  const buzzerLookup = io(buzzerUrl);

  await new Promise((resolve) => raceCreator.on("connect", resolve));
  await new Promise((resolve) => buzzerCreator.on("connect", resolve));

  const raceRoom = await new Promise((resolve) => {
    raceCreator.emit("create-room", {
      title: "Race Room",
      questions: [{ prompt: "1+1?", type: "short-answer", answer: "2" }],
    }, (ack) => resolve(ack.room));
  });

  const buzzerRoom = await new Promise((resolve) => {
    buzzerCreator.emit("create-room", {
      title: "Buzzer Room",
      questions: [{ prompt: "2+2?", type: "short-answer", answer: "4" }],
    }, (ack) => resolve(ack.room));
  });

  log("Race room code:", raceRoom.code, "| Buzzer room code:", buzzerRoom.code);

  // Simulate the hub's dual-peek lookup exactly as public/play/app.js does.
  const [raceCodeIsRace, raceCodeIsBuzzer] = await Promise.all([
    peek(raceLookup, raceRoom.code),
    peek(buzzerLookup, raceRoom.code),
  ]);
  const [buzzerCodeIsRace, buzzerCodeIsBuzzer] = await Promise.all([
    peek(raceLookup, buzzerRoom.code),
    peek(buzzerLookup, buzzerRoom.code),
  ]);
  const [bogusIsRace, bogusIsBuzzer] = await Promise.all([
    peek(raceLookup, "ZZZZ"),
    peek(buzzerLookup, "ZZZZ"),
  ]);

  log("Race code routes to race:", raceCodeIsRace, "| also matches buzzer:", raceCodeIsBuzzer);
  log("Buzzer code routes to buzzer:", buzzerCodeIsBuzzer, "| also matches race:", buzzerCodeIsRace);
  log("Bogus code matches neither:", !bogusIsRace && !bogusIsBuzzer);

  const ok = raceCodeIsRace && !raceCodeIsBuzzer && buzzerCodeIsBuzzer && !buzzerCodeIsRace && !bogusIsRace && !bogusIsBuzzer;

  raceCreator.close(); buzzerCreator.close(); raceLookup.close(); buzzerLookup.close();
  server.close(() => {
    log(ok ? "HUB LOOKUP TEST PASSED" : "HUB LOOKUP TEST FAILED");
    process.exit(ok ? 0 : 1);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });

setTimeout(() => {
  log("TIMEOUT - test did not complete");
  process.exit(1);
}, 15000);
