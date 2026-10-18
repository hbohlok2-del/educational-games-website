const fs = require("fs");
const os = require("os");
const path = require("path");

// Isolated throwaway database and a known passcode, set before the server loads.
const dbFile = path.join(os.tmpdir(), `question-sets-test-${process.pid}.db`);
process.env.TURSO_DATABASE_URL = `file:${dbFile}`;
delete process.env.TURSO_AUTH_TOKEN;
process.env.TEACHER_PASSCODE = "test-passcode";
process.env.PORT = process.env.PORT || 4004;

const server = require(path.join(__dirname, "..", "server.js"));
const { initDb } = require(path.join(__dirname, "..", "server", "db.js"));
const { sweepUnclaimedRooms, UNCLAIMED_ROOM_TTL_MS } = require(path.join(__dirname, "..", "server", "games", "roomSweep.js"));
const { io } = require("socket.io-client");

const base = `http://localhost:${process.env.PORT}`;
const api = `${base}/api/question-sets`;
const GOOD = { "X-Teacher-Passcode": "test-passcode" };
const BAD = { "X-Teacher-Passcode": "wrong" };
const JSON_HEADERS = { "Content-Type": "application/json" };

let failures = 0;
function check(label, ok) {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures++;
}

async function call(method, url, { headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { ...(body ? JSON_HEADERS : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, text, json: JSON.parse(text) };
}

function emit(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

const raceQuiz = {
  title: "Capitals",
  mechanic: "race",
  theme: "rocket",
  questions: [
    { prompt: "Capital of France?", type: "short-answer", answer: "SecretParis" },
    { prompt: "Pick 2", type: "multiple-choice", choices: ["one", "two", "three"], answer: 1 },
  ],
};
const buzzerQuiz = {
  title: "Buzz",
  mechanic: "buzzer",
  theme: "spotlight",
  questions: [{ prompt: "Capital of Japan?", type: "short-answer", answer: "SecretTokyo" }],
};

async function main() {
  await initDb();

  // --- Library writes and full reads need the passcode ---
  const noPass = await call("POST", api, { body: raceQuiz });
  check("save without passcode is rejected (401)", noPass.status === 401 && noPass.json.error === "bad-passcode");
  const badPass = await call("POST", api, { headers: BAD, body: raceQuiz });
  check("save with wrong passcode is rejected (401)", badPass.status === 401);

  const savedRace = await call("POST", api, { headers: GOOD, body: raceQuiz });
  const savedBuzzer = await call("POST", api, { headers: GOOD, body: buzzerQuiz });
  check("save with passcode succeeds", savedRace.json.ok && savedBuzzer.json.ok);
  const raceId = savedRace.json.set.id;
  const buzzerId = savedBuzzer.json.set.id;

  const checkOk = await call("POST", `${api}/check-passcode`, { headers: GOOD });
  const checkBad = await call("POST", `${api}/check-passcode`, { headers: BAD });
  check("check-passcode accepts right, rejects wrong", checkOk.json.ok === true && checkBad.status === 401);

  const readNoPass = await call("GET", `${api}/${raceId}`);
  check("full quiz read without passcode is rejected", readNoPass.status === 401 && !readNoPass.text.includes("SecretParis"));
  const readPass = await call("GET", `${api}/${raceId}`, { headers: GOOD });
  check("full quiz read with passcode includes answers", readPass.json.ok && readPass.text.includes("SecretParis"));

  const putNoPass = await call("PUT", `${api}/${raceId}`, { body: { ...raceQuiz, title: "Hijacked" } });
  check("edit without passcode is rejected", putNoPass.status === 401);
  const delNoPass = await call("DELETE", `${api}/${raceId}`);
  check("delete without passcode is rejected", delNoPass.status === 401);

  // --- Public list: titles and counts only ---
  const list = await call("GET", api);
  const listed = list.json.sets.find((s) => s.id === raceId);
  check("public list includes the saved quiz", !!listed && listed.questionCount === 2 && listed.title === "Capitals");
  check("public list carries no questions or answers",
    !list.text.includes("SecretParis") && !list.text.includes("SecretTokyo") && !list.text.includes("Capital of France"));

  // --- Launch a race quiz: code back, answers never leave the server ---
  const launchRace = await call("POST", `${api}/${raceId}/launch`);
  check("launching a race quiz returns a room code", launchRace.json.ok && launchRace.json.gameType === "team-race" && /^[A-Z]{4}$/.test(launchRace.json.code));
  check("launch response carries no answers or questions", !launchRace.text.includes("Secret") && !launchRace.text.includes("Capital of France"));

  const rooms = await call("GET", `${base}/api/rooms`);
  check("launched room shows in Active Games", rooms.json.rooms.some((r) => r.code === launchRace.json.code && r.title === "Capitals"));

  const a = io(`${base}/team-race`);
  const b = io(`${base}/team-race`);
  const seen = [];
  [a, b].forEach((s) => s.onAny((event, payload) => seen.push(JSON.stringify(payload || null))));
  const joinA = await emit(a, "join-room", { code: launchRace.json.code, team: "A" });
  const joinB = await emit(b, "join-room", { code: launchRace.json.code, team: "B" });
  check("both teams can join the launched room", joinA.ok && joinB.ok && joinA.room.theme === "rocket");
  a.emit("start-match");
  await new Promise((r) => setTimeout(r, 200));
  const q0 = await emit(a, "get-question", { index: 0 });
  check("launched room serves the saved questions", q0.ok && q0.prompt === "Capital of France?");
  check("question payload has no answer field", !("answer" in q0) && !JSON.stringify(q0).includes("SecretParis"));
  const wrong = await emit(a, "submit-answer", { index: 0, input: "Lyon" });
  const right = await emit(a, "submit-answer", { index: 0, input: "secretparis" });
  check("server still checks answers itself", wrong.ok && wrong.correct === false && right.correct === true);
  check("no answer reached any race client event", !seen.some((p) => p.includes("SecretParis")));
  a.close(); b.close();

  // --- Launch a buzzer quiz ---
  const launchBuzzer = await call("POST", `${api}/${buzzerId}/launch`);
  check("launching a buzzer quiz routes to the buzzer game", launchBuzzer.json.ok && launchBuzzer.json.gameType === "team-buzzer");
  const c = io(`${base}/team-buzzer`);
  const cSeen = [];
  c.onAny((event, payload) => cSeen.push(JSON.stringify(payload || null)));
  const joinC = await emit(c, "join-room", { code: launchBuzzer.json.code, team: "A" });
  check("buzzer room joinable and answer-free", joinC.ok && !JSON.stringify(joinC).includes("SecretTokyo") && !cSeen.some((p) => p.includes("SecretTokyo")));
  c.close();

  // --- Board quizzes: settings persist, launch routes to the board game ---
  const boardQuiz = {
    title: "Board", mechanic: "board", theme: "classic", settings: { penalty: true, timeLimit: 90, teams: 3 },
    questions: [{ category: "Science", points: 300, prompt: "What is H2O?", type: "open", answer: "SecretWater" }],
  };
  const savedBoard = await call("POST", api, { headers: GOOD, body: boardQuiz });
  check("board quiz with an open question saves", savedBoard.json.ok && savedBoard.json.set.mechanic === "board");
  const boardFull = await call("GET", `${api}/${savedBoard.json.set.id}`, { headers: GOOD });
  check("board settings and category survive the round trip",
    boardFull.json.set.settings.penalty === true && boardFull.json.set.settings.timeLimit === 90 && boardFull.json.set.questions[0].category === "Science");
  check("a saved quiz no longer stores a team count", !("teams" in boardFull.json.set.settings));
  const boardId = savedBoard.json.set.id;
  const launchBoard = await call("POST", `${api}/${boardId}/launch`);
  check("launching a board quiz routes to the board game", launchBoard.json.ok && launchBoard.json.gameType === "team-board" && !launchBoard.text.includes("Secret"));

  // --- Team count chosen at launch ---
  async function seats(ns, body, id = boardId) {
    const launched = await call("POST", `${api}/${id}/launch`, body ? { body } : {});
    if (!launched.json.ok) return launched;
    const peek = io(`${base}/${ns}`);
    const peeked = await emit(peek, "peek-room", { code: launched.json.code });
    peek.close();
    return peeked.room.teamSlots.join("");
  }
  check("a board launched with no choice keeps its default of 4 seats", (await seats("team-board")) === "ABCD");
  check("a board launched for 3 teams offers 3 seats", (await seats("team-board", { teams: 3 })) === "ABC");
  check("a board launched for 2 teams offers 2 seats", (await seats("team-board", { teams: 2 })) === "AB");
  const tooMany = await call("POST", `${api}/${boardId}/launch`, { body: { teams: 5 } });
  const notNumber = await call("POST", `${api}/${boardId}/launch`, { body: { teams: "lots" } });
  check("a team count outside 2 to 4 is refused (400)", tooMany.status === 400 && tooMany.json.error === "invalid-teams" && notNumber.status === 400);
  check("a rocket race launched for 4 teams opens 4 lanes", (await seats("team-race", { teams: 4 }, raceId)) === "ABCD");
  check("a rocket race launched with no choice opens 2 lanes", (await seats("team-race", null, raceId)) === "AB");
  const ropeSaved = await call("POST", api, { headers: GOOD, body: { ...raceQuiz, title: "Rope", theme: "rope" } });
  check("the rope stays at 2 teams whatever is sent", (await seats("team-race", { teams: 4 }, ropeSaved.json.set.id)) === "AB");
  const rallySaved = await call("POST", api, { headers: GOOD, body: {
    title: "Rally", mechanic: "rally", theme: "island", settings: { word: "CAT", minutes: 10, teams: 4 },
    questions: [0, 1, 2].map((station) => ({ prompt: "Q" + station, type: "short-answer", answer: "x", station })),
  } });
  check("a saved rally drops its team count too", rallySaved.json.ok && !("teams" in rallySaved.json.set.settings));
  check("a rally launched for 3 teams offers 3 seats", (await seats("team-rally", { teams: 3 }, rallySaved.json.set.id)) === "ABC");

  // A quiz saved before the change still has a count: the list shows it (to
  // pre-select the choice) and a launch with no choice uses it.
  const { client } = require(path.join(__dirname, "..", "server", "db.js"));
  await client.execute({ sql: "UPDATE question_sets SET settings = ? WHERE id = ?", args: [JSON.stringify({ penalty: false, timeLimit: 30, teams: 3 }), boardId] });
  const oldList = await call("GET", api);
  check("the list shows an older quiz's saved team count", oldList.json.sets.find((s) => s.id === boardId).teams === 3);
  check("the list leaves teams out for new quizzes", !("teams" in oldList.json.sets.find((s) => s.id === raceId)));
  check("an older quiz launched with no choice uses its saved count", (await seats("team-board")) === "ABC");
  check("a choice at launch overrides an older quiz's saved count", (await seats("team-board", { teams: 2 })) === "AB");
  const raceWithOpen = await call("POST", api, { headers: GOOD, body: { ...boardQuiz, mechanic: "race" } });
  check("open questions are refused outside board quizzes", raceWithOpen.status === 400);

  const launchMissing = await call("POST", `${api}/does-not-exist/launch`);
  check("launching an unknown quiz is a 404", launchMissing.status === 404);

  // --- Passcode not configured: locked, not open ---
  delete process.env.TEACHER_PASSCODE;
  const locked = await call("POST", api, { headers: GOOD, body: raceQuiz });
  check("with no passcode configured, saving stays locked (503)", locked.status === 503 && locked.json.error === "passcode-not-configured");
  process.env.TEACHER_PASSCODE = "test-passcode";

  // --- Edit and delete with passcode ---
  const put = await call("PUT", `${api}/${raceId}`, { headers: GOOD, body: { ...raceQuiz, title: "Capitals v2" } });
  check("edit with passcode succeeds", put.json.ok && put.json.set.title === "Capitals v2");
  const del = await call("DELETE", `${api}/${buzzerId}`, { headers: GOOD });
  const afterDel = await call("GET", api);
  check("delete with passcode removes the quiz", del.json.ok && !afterDel.json.sets.some((s) => s.id === buzzerId));

  // --- Unclaimed launched rooms get swept; occupied or connected ones do not ---
  const old = Date.now() - UNCLAIMED_ROOM_TTL_MS - 1;
  const fakeRooms = new Map([
    ["AAAA", { code: "AAAA", status: "waiting", teams: { A: null, B: null }, createdAt: old }],
    ["BBBB", { code: "BBBB", status: "waiting", teams: { A: "sock", B: null }, createdAt: old }],
    ["CCCC", { code: "CCCC", status: "waiting", teams: { A: null, B: null }, createdAt: Date.now() }],
    ["DDDD", { code: "DDDD", status: "waiting", teams: { A: null, B: null }, createdAt: old }],
  ]);
  const fakeNsp = { adapter: { rooms: new Map([["DDDD", new Set(["display-socket"])]]) } };
  sweepUnclaimedRooms(fakeNsp, fakeRooms);
  check("sweep drops only old, empty, unconnected rooms",
    !fakeRooms.has("AAAA") && fakeRooms.has("BBBB") && fakeRooms.has("CCCC") && fakeRooms.has("DDDD"));

  server.close(() => {
    try { fs.unlinkSync(dbFile); } catch (e) { /* temp file, best effort */ }
    console.log(failures ? `QUESTION SETS TEST FAILED (${failures})` : "QUESTION SETS TEST PASSED");
    process.exit(failures ? 1 : 0);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });

setTimeout(() => {
  console.log("TIMEOUT - test did not complete");
  process.exit(1);
}, 20000);
