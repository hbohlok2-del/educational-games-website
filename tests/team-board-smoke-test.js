const path = require("path");
process.env.PORT = process.env.PORT || 4005;
const server = require(path.join(__dirname, "..", "server.js"));
const { buildBoard } = require(path.join(__dirname, "..", "server", "games", "teamBoard.js"));
const { buildQuestions } = require(path.join(__dirname, "..", "server", "content", "questions.js"));
const { io } = require("socket.io-client");

const url = `http://localhost:${process.env.PORT}/team-board`;

let failures = 0;
function check(label, ok) {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures++;
}

function emit(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

// Resolves with the next room-update that satisfies pred.
function nextUpdate(socket, pred) {
  return new Promise((resolve) => {
    function handler(room) {
      if (pred(room)) { socket.off("room-update", handler); resolve(room); }
    }
    socket.on("room-update", handler);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const QUESTIONS = [
  { category: "Math", points: 200, prompt: "5 x 5?", type: "short-answer", answer: "SECRET25" },
  { category: "Math", points: 100, prompt: "Pick two", type: "multiple-choice", choices: ["one", "SECRETtwo", "three"], answer: 1 },
  { category: "Science", points: 300, prompt: "What is H2O?", type: "open", answer: "SECRETwater" },
];

async function main() {
  // --- Board layout and question rules ---
  const built = buildQuestions(QUESTIONS, { board: true });
  const board = buildBoard(built);
  check("board groups categories in first-use order", JSON.stringify(board.categories) === '["Math","Science"]');
  check("each column is sorted by points", board.cells.map((c) => c.points).join(",") === "100,200,300");
  check("open questions are dropped outside board games", buildQuestions(QUESTIONS).length === 2);
  check("unknown point values fall back to 100", buildQuestions([{ prompt: "x", answer: "1", points: 999 }], { board: true })[0].points === 100);

  // --- Live match ---
  const host = io(url);
  const a = io(url);
  const b = io(url);
  const display = io(url);
  const seenByTeams = [];
  [a, b].forEach((s) => s.onAny((event, payload) => seenByTeams.push(event + ":" + JSON.stringify(payload || null))));
  const judgeQueues = [];
  display.on("judge-queue", (q) => judgeQueues.push(q));
  await Promise.all([host, a, b, display].map((s) => new Promise((r) => s.on("connect", r))));

  const created = await emit(host, "create-room", { title: "Board Test", questions: QUESTIONS, settings: { penalty: true } });
  check("board room created with 3 cells and penalty on", created.ok && created.room.cells.length === 3 && created.room.penalty === true);
  const code = created.room.code;

  await emit(a, "join-room", { code, team: "A" });
  await emit(b, "join-room", { code, team: "B" });
  await emit(display, "join-room", { code, team: null });

  a.emit("start-match");
  await nextUpdate(a, (r) => r.status === "active");
  const early = await emit(a, "pick-cell", { cell: 0 });
  check("no picking during the start countdown", early.ok === false);
  await wait(3100);

  // Cell 0 = Math 100, multiple choice. Red has control; Blue may not pick.
  const bluePick = await emit(b, "pick-cell", { cell: 0 });
  check("only the team in control can pick", bluePick.ok === false && bluePick.error === "not-your-pick");
  const opened = nextUpdate(a, (r) => r.phase === "question");
  await emit(a, "pick-cell", { cell: 0 });
  const q0 = await opened;
  check("question opens with its category and points", q0.question.category === "Math" && q0.question.points === 100);

  const wrongA = await emit(a, "answer", { cell: 0, input: "0" });
  check("wrong multiple-choice answer is marked wrong", wrongA.ok && wrongA.correct === false);
  const retryA = await emit(a, "answer", { cell: 0, input: "1" });
  check("a team gets one attempt per question", retryA.ok === false && retryA.error === "already-answered");
  const revealed0 = nextUpdate(a, (r) => r.phase === "reveal");
  const rightB = await emit(b, "answer", { cell: 0, input: "1" });
  const r0 = await revealed0;
  check("other team can still answer and win the cell", rightB.correct === true && r0.cellWinner === "B");
  check("penalty applied to the wrong team, points to the right one", r0.scores.A === -100 && r0.scores.B === 100);
  check("winner of the cell takes control", r0.control === "B");
  check("answer is revealed once the question closes", r0.answerText === "SECRETtwo");

  // Cell 1 = Math 200, short answer, nobody gets it.
  await nextUpdate(a, (r) => r.phase === "board");
  const redPickNow = await emit(a, "pick-cell", { cell: 1 });
  check("control really moved (Red can no longer pick)", redPickNow.ok === false);
  const opened1 = nextUpdate(a, (r) => r.phase === "question" && r.currentCell === 1);
  await emit(display, "pick-cell", { cell: 1 });
  await opened1;
  check("the host can pick from the Big Screen", true);
  const usedPick = await emit(display, "pick-cell", { cell: 0 });
  check("a used cell cannot be picked again", usedPick.ok === false);
  const revealed1 = nextUpdate(a, (r) => r.phase === "reveal" && r.currentCell === 1);
  await emit(a, "answer", { cell: 1, input: "24" });
  await emit(b, "answer", { cell: 1, input: "26" });
  const r1 = await revealed1;
  check("both wrong: no winner, control stays, both penalised", r1.cellWinner === null && r1.control === "B" && r1.scores.A === -300 && r1.scores.B === -100);

  // Cell 2 = Science 300, open answer judged by the host.
  await nextUpdate(a, (r) => r.phase === "board");
  const opened2 = nextUpdate(a, (r) => r.phase === "question" && r.currentCell === 2);
  await emit(b, "pick-cell", { cell: 2 });
  await opened2;
  const pendingA = await emit(a, "answer", { cell: 2, input: "ice" });
  const midway = await nextUpdate(b, (r) => r.attempts.A.answered);
  check("open answer waits for the host", pendingA.pending === true);
  check("a pending answer text is hidden from the other team", midway.attempts.A.input === null);
  const judging = nextUpdate(a, (r) => r.phase === "judging");
  await emit(b, "answer", { cell: 2, input: "water" });
  await judging;
  await wait(100);
  const q = judgeQueues[judgeQueues.length - 1];
  check("host gets both answers in arrival order with the expected answer",
    q && q.expected === "SECRETwater" && q.pending.map((p) => p.team).join("") === "AB");
  const outOfOrder = await emit(display, "judge", { team: "B", correct: true });
  check("host must judge in arrival order", outOfOrder.ok === false);
  const teamJudge = await emit(a, "judge", { team: "A", correct: true });
  check("teams cannot judge", teamJudge.ok === false);
  await emit(display, "judge", { team: "A", correct: false });
  const finished = nextUpdate(a, (r) => r.status === "finished");
  await emit(display, "judge", { team: "B", correct: true });
  const end = await finished;
  check("board empty ends the match with the top scorer winning", end.winner === "B" && end.scores.B === 200 && end.scores.A === -600);

  check("no answer reached a team before its question closed",
    !seenByTeams.some((e) => e.startsWith("room-update") && /SECRET(25|water)/.test(e) && !/"phase":"reveal"/.test(e)));
  check("teams never receive the host judging feed", !seenByTeams.some((e) => e.startsWith("judge-queue")));

  // Rematch resets the board.
  const rematched = nextUpdate(a, (r) => r.round === 2);
  a.emit("rematch");
  const r2 = await rematched;
  check("rematch clears the board and scores", r2.cells.every((c) => !c.used) && r2.scores.A === 0 && r2.scores.B === 0 && r2.control === "A");

  [host, a, b, display].forEach((s) => s.close());
  server.close(() => {
    console.log(failures ? `TEAM BOARD SMOKE TEST FAILED (${failures})` : "TEAM BOARD SMOKE TEST PASSED");
    process.exit(failures ? 1 : 0);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });

setTimeout(() => {
  console.log("TIMEOUT - test did not complete");
  process.exit(1);
}, 30000);
