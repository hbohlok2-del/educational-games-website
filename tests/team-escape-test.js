const path = require("path");
process.env.PORT = process.env.PORT || 4008;
const server = require(path.join(__dirname, "..", "server.js"));
const { buildRooms } = require(path.join(__dirname, "..", "server", "games", "teamEscape.js"));
const { buildQuestion, buildQuestions, cleanEscapeSettings } = require(path.join(__dirname, "..", "server", "content", "questions.js"));
const MathExpr = require(path.join(__dirname, "..", "public", "shared", "mathExpr.js"));
const { io } = require("socket.io-client");

const url = `http://localhost:${process.env.PORT}/team-escape`;

let failures = 0;
function check(label, ok) {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures++;
}
const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const connect = (socket) => new Promise((resolve) => socket.on("connect", resolve));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The shown order of an order/match puzzle, solved from its view: the
// server's shuffle is unknown to the test, so it is undone by text.
function solveOrder(view, items) { return items.map((it) => view.items.indexOf(it)).join(","); }
function solveMatch(view, pairs) { return pairs.map((p) => view.right.indexOf(p.right)).join(","); }

const STEPS = ["Name f and g", "Find f' and g'", "Write f g' + g f'", "Simplify"];
const PAIRS = [{ left: "x^2 sin x", right: "x^2 cos x + 2x sin x" }, { left: "x cos x", right: "cos x - x sin x" }, { left: "x e^x", right: "e^x + x e^x" }];
// Vault code 372: room 0 holds a padlock (with a hint) and an expression,
// room 1 an order and a match puzzle, room 2 a graph and a multiple choice.
const QUESTIONS = [
  { room: 0, prompt: "f(x) = x^2 x^3. What is f'(1)?", answer: "5", hint: "Multiply first." },
  { room: 0, type: "expression", prompt: "d/dx [x^2 sin x]", answer: "x^2 cos x + 2x sin x" },
  { room: 1, type: "order", prompt: "Order the Product Rule steps", items: STEPS },
  { room: 1, type: "match", prompt: "Match each function to its derivative", pairs: PAIRS },
  { room: 2, type: "graph", prompt: "Where is the tangent horizontal (x > 0)?", fn: "x^3 - 3x", answer: "1", xmin: -3, xmax: 3 },
  { room: 2, type: "multiple-choice", prompt: "d/dx [tan x] =", choices: ["sec x tan x", "sec^2 x", "-csc^2 x"], answer: 1 },
];
const SETTINGS = { code: "372", teams: 2, minutes: 10, rooms: [{ name: "Product Lab", story: "The door hums." }, { name: "Steps Room" }, {}] };

async function main() {
  // --- Rules without a server ---
  const s = cleanEscapeSettings({ code: "4a5-1", minutes: 9, teams: 5, rooms: [{ name: "  A  ", story: "x".repeat(400) }] });
  check("the vault code keeps digits only", s.code === "451" && s.rooms.length === 3);
  check("room names are trimmed and stories capped at 240", s.rooms[0].name === "A" && s.rooms[0].story.length === 240 && s.rooms[2].name === "");
  check("an unlisted time falls back to 20 minutes and odd team counts are dropped", s.minutes === 20 && s.teams === undefined);

  const qs = buildQuestions(QUESTIONS, { escape: true });
  check("all six puzzle types build", qs.length === 6 && qs.map((q) => q.type).join() === "short-answer,expression,order,match,graph,multiple-choice");
  check("a whole-number answer becomes a padlock with one dial per digit", qs[0].view.lock && qs[0].view.lock.digits === 1);
  check("a padlock takes the number in any form", qs[0].checkAnswer("5") && qs[0].checkAnswer("05") && !qs[0].checkAnswer("-5"));
  check("expressions are checked by equivalence", qs[1].checkAnswer("2x sin(x) + x^2cos x") && !qs[1].checkAnswer("2x cos x"));
  check("the order puzzle is shuffled and never starts solved", qs[2].view.items.join() !== STEPS.join() && qs[2].checkAnswer(solveOrder(qs[2].view, STEPS)));
  const right = solveOrder(qs[2].view, STEPS).split(",");
  check("a wrong order is refused", !qs[2].checkAnswer([right[1], right[0]].concat(right.slice(2)).join(",")) && !qs[2].checkAnswer("0,0,1,2"));
  check("the match puzzle is checked pair by pair", qs[3].checkAnswer(solveMatch(qs[3].view, PAIRS)) && !qs[3].checkAnswer("0,0,0"));
  check("graph answers allow a small tolerance only", qs[4].checkAnswer("1.05") && qs[4].checkAnswer("0.9") && !qs[4].checkAnswer("1.4") && !qs[4].checkAnswer("-1"));
  check("views never carry answers", Object.keys(qs[1].view).length === 0 && qs.every((q) => !("answer" in q.view)) && !JSON.stringify(qs[4].view).includes("\"1\""));
  check("bad puzzles are dropped", buildQuestion({ type: "graph", prompt: "p", fn: "x^", answer: "1" }, { escape: true }) === null &&
    buildQuestion({ type: "graph", prompt: "p", fn: "x", answer: "9", xmin: 0, xmax: 5 }, { escape: true }) === null &&
    buildQuestion({ type: "order", prompt: "p", items: ["a", "b"] }, { escape: true }) === null &&
    buildQuestion({ type: "expression", prompt: "p", answer: "2+" }, { escape: true }) === null);
  check("puzzle types stay out of other games", buildQuestion({ type: "order", prompt: "p", items: STEPS }, {}) === null);
  const rooms = buildRooms(qs, cleanEscapeSettings(SETTINGS));
  check("rooms follow the code, one digit each", rooms.map((r) => r.digit).join("") === "372" && rooms[0].name === "Product Lab" && rooms[1].questions.length === 2);
  check("a room with no puzzles makes the escape unplayable", buildRooms(qs.slice(0, 4), cleanEscapeSettings(SETTINGS)) === null);
  check("the parser refuses anything that is not math", !MathExpr.parse("alert(1)").ok && !MathExpr.parse("constructor").ok);

  // --- A full escape over sockets ---
  const host = io(url), red = io(url), blue = io(url);
  await Promise.all([connect(host), connect(red), connect(blue)]);
  const bad = await emit(host, "create-room", { title: "Bad", questions: QUESTIONS.slice(0, 4), settings: SETTINGS });
  check("an escape room missing a room's puzzles is refused", !bad.ok && bad.error === "escape-incomplete");
  const created = await emit(host, "create-room", { title: "Lesson 2.3", questions: QUESTIONS, settings: SETTINGS });
  check("escape room created with 3 rooms and 6 puzzles", created.ok && created.room.roomCount === 3 && created.room.questionCount === 6);
  const code = created.room.code;
  const lookup = await (await fetch(`http://localhost:${process.env.PORT}/api/rooms/${code}`)).json();
  check("the room lookup knows escape rooms", lookup.ok && lookup.gameType === "team-escape");
  const open = await (await fetch(`http://localhost:${process.env.PORT}/api/rooms`)).json();
  check("the open-games list shows escape rooms", open.rooms.some((r) => r.code === code && r.gameType === "team-escape"));
  await emit(red, "join-room", { code, team: "A" });
  await emit(blue, "join-room", { code, team: "B" });
  host.emit("start-match");
  await wait(3200);

  let st = (await emit(red, "my-state")).state;
  const bst = (await emit(blue, "my-state")).state;
  check("every team starts in room 1", st.room === 0 && bst.room === 0);
  check("the device gets the room's story and its puzzle, never the answer", st.story === "The door hums." && st.question.lock.digits === 1 && !JSON.stringify(st).includes("\"answer"));
  const peek0 = await emit(host, "peek-room", { code });
  check("the projector never sees a digit", !JSON.stringify(peek0.room).includes("372") && peek0.room.roomNames[0] === "Product Lab");

  const wrong = await emit(red, "answer", { input: "6" });
  check("a wrong answer sets off a 5-second alarm", wrong.ok && !wrong.correct && wrong.lockUntil - Date.now() > 4000);
  const locked = await emit(red, "answer", { input: "5" });
  check("answers are refused during the alarm", !locked.ok && locked.error === "locked");
  const hint = await emit(red, "hint");
  const again = await emit(red, "hint");
  const peek = await emit(host, "peek-room", { code });
  check("a hint costs 30 seconds, once per puzzle", hint.ok && hint.hint === "Multiply first." && again.ok && peek.room.progress.A.penalty === 30);

  await wait(5100);
  const r1 = await emit(red, "answer", { input: "5" });
  check("the padlock opens and the expression puzzle follows", r1.correct && !r1.opened && r1.state.question.type === "expression");
  const r2 = await emit(red, "answer", { input: "2x sin x + x^2 cos x" });
  check("clearing the room opens its door and reveals its digit", r2.opened && r2.opened.digit === "3" && r2.opened.name === "Product Lab");
  check("the team moves on to its next room with a streak of 2", r2.state.room === 1 && r2.state.streak === 2 && r2.state.found[0].digit === "3");

  st = r2.state;
  const r3 = await emit(red, "answer", { input: solveOrder(st.question, STEPS) });
  const r4 = await emit(red, "answer", { input: solveMatch(r3.state.question, PAIRS) });
  check("order and match puzzles open the second door", r3.correct && r4.opened && r4.opened.digit === "7");

  // The teacher opens Blue's door.
  const skip = await emit(host, "skip", { team: "B" });
  const peek2 = await emit(host, "peek-room", { code });
  check("a teacher skip costs 2 minutes and still opens the door", skip.ok && peek2.room.progress.B.penalty === 120 && peek2.room.progress.B.clearedRooms.join() === "0");
  check("only the Big Screen can skip", !(await emit(red, "skip", { team: "B" })).ok);

  const r5 = await emit(red, "answer", { input: "1.02" });
  const r6 = await emit(red, "answer", { input: "1" });
  check("after the last room the team reaches the vault with all three digits", r5.correct && r6.opened && r6.state.phase === "vault" && r6.state.found.map((f) => f.digit).join("") === "372");

  const badCode = await emit(red, "vault", { code: "273" });
  check("a wrong vault code sets off the alarm", badCode.ok && !badCode.correct);
  await wait(5100);
  const finished = new Promise((resolve) => host.on("room-update", (room) => { if (room.status === "finished") resolve(room); }));
  const solved = await emit(red, "vault", { code: "372" });
  const end = await finished;
  check("cracking the vault wins the escape", solved.correct && end.winner === "A" && end.ranking[0] === "A");
  check("results carry rooms, time, penalty and best streak", end.progress.A.cleared === 3 && end.progress.A.penalty === 30 && end.progress.A.stats.best === 6);

  [host, red, blue].forEach((s2) => s2.close());
}

main()
  .catch((err) => { console.error(err); failures++; })
  .finally(() => {
    console.log(failures ? `TEAM ESCAPE TEST FAILED (${failures})` : "TEAM ESCAPE TEST PASSED");
    server.close();
    process.exit(failures ? 1 : 0);
  });
