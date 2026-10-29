const path = require("path");
process.env.PORT = process.env.PORT || 4007;
const server = require(path.join(__dirname, "..", "server.js"));
const { buildStations } = require(path.join(__dirname, "..", "server", "games", "teamRally.js"));
const { buildQuestions, cleanRallySettings } = require(path.join(__dirname, "..", "server", "content", "questions.js"));
const { io } = require("socket.io-client");

const url = `http://localhost:${process.env.PORT}/team-rally`;

let failures = 0;
function check(label, ok) {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures++;
}
const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const connect = (socket) => new Promise((resolve) => socket.on("connect", resolve));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Word CAT: station 0 has two questions (one with a hint), stations 1 and 2 one each.
const QUESTIONS = [
  { station: 0, prompt: "2+2", answer: "SECRET4", hint: "Count on." },
  { station: 0, prompt: "Pick B", type: "multiple-choice", choices: ["a", "SECRETb"], answer: 1 },
  { station: 1, prompt: "3+3", answer: "SECRET6" },
  { station: 2, prompt: "5+5", answer: "SECRET10" },
];
const SETTINGS = { word: "cat", teams: 2, minutes: 10, clues: ["Look under the mat.", "", "Last one!"] };

async function main() {
  // --- Rules without a server ---
  const s = cleanRallySettings({ word: "Ma-trix 9", minutes: 7, teams: 5 });
  check("the word keeps letters only, upper-cased", s.word === "MATRIX");
  check("an unlisted time falls back to 20 minutes and odd team counts are dropped", s.minutes === 20 && s.teams === undefined);
  const qs = buildQuestions(QUESTIONS, { rally: true });
  check("rally questions keep their station and hint", qs[0].station === 0 && qs[0].hint === "Count on." && qs[3].station === 2);
  const stations = buildStations(qs, cleanRallySettings(SETTINGS));
  const sorted = (letters) => letters.slice().sort().join("");
  check("one station per letter of the word, two questions at station 1", sorted(stations.map((st) => st.letter)) === "ACT" && stations[0].questions.length === 2);
  const deals = Array.from({ length: 200 }, () => buildStations(qs, cleanRallySettings(SETTINGS)).map((st) => st.letter).join(""));
  check("letters are dealt scrambled: never in word order, in more than one order", deals.every((d) => d !== "CAT" && sorted(Array.from(d)) === "ACT") && new Set(deals).size > 1);
  const winner = buildQuestions([0, 1, 2, 3, 4, 5].map((st) => ({ station: st, prompt: "x", answer: "1" })), { rally: true });
  check("a word with a repeated letter is never dealt in order either", Array.from({ length: 300 }, () => buildStations(winner, cleanRallySettings({ word: "winner" })).map((st) => st.letter).join("")).every((d) => d !== "WINNER"));
  check("a word of one repeated letter still builds", buildStations(winner.slice(0, 3), cleanRallySettings({ word: "aaa" })).map((st) => st.letter).join("") === "AAA");
  check("a station with no questions makes the rally unplayable", buildStations(qs.slice(0, 3), cleanRallySettings(SETTINGS)) === null);
  const six = Array.from({ length: 7 }, () => ({ station: 0, prompt: "x", answer: "1" }))
    .concat([1, 2].map((st) => ({ station: st, prompt: "y", answer: "1" })));
  check("a station keeps at most 5 questions", buildStations(buildQuestions(six, { rally: true }), cleanRallySettings({ word: "abc" }))[0].questions.length === 5);
  check("three teams are kept", cleanRallySettings({ word: "abc", teams: 3 }).teams === 3);

  // --- A full rally over sockets ---
  const host = io(url), red = io(url), blue = io(url);
  await Promise.all([connect(host), connect(red), connect(blue)]);
  const bad = await emit(host, "create-room", { title: "Bad", questions: QUESTIONS.slice(0, 3), settings: SETTINGS });
  check("a rally missing a station's questions is refused", !bad.ok && bad.error === "rally-incomplete");
  const created = await emit(host, "create-room", { title: "Fractions Rally", questions: QUESTIONS, settings: SETTINGS });
  check("rally room created with 3 stations and 4 questions", created.ok && created.room.stationCount === 3 && created.room.questionCount === 4);
  const code = created.room.code;
  const lookup = await (await fetch(`http://localhost:${process.env.PORT}/api/rooms/${code}`)).json();
  check("the room lookup knows rally rooms", lookup.ok && lookup.gameType === "team-rally");
  await emit(red, "join-room", { code, team: "A" });
  await emit(blue, "join-room", { code, team: "B" });
  host.emit("start-match");
  await wait(3200);

  let st = (await emit(red, "my-state")).state;
  const bst = (await emit(blue, "my-state")).state;
  check("every team starts at station 1", st.station === 0 && bst.station === 0);
  check("the device gets the question but never the answer", st.question.prompt === "2+2" && !JSON.stringify(st).includes("SECRET"));
  check("the hint stays hidden until asked for", st.question.hasHint && st.hint === undefined);

  const wrong = await emit(red, "answer", { input: "5" });
  check("a wrong answer locks the team for about 5 seconds", wrong.ok && !wrong.correct && wrong.lockUntil - Date.now() > 4000);
  const locked = await emit(red, "answer", { input: "SECRET4" });
  check("answers are refused during the lock", !locked.ok && locked.error === "locked");

  const hint = await emit(red, "hint");
  const again = await emit(red, "hint");
  const peek = await emit(host, "peek-room", { code });
  check("a hint costs 30 seconds, once per question", hint.ok && hint.hint === "Count on." && again.ok && peek.room.progress.A.penalty === 30);

  await wait(5100);
  const right1 = await emit(red, "answer", { input: "secret4" });
  check("a right answer moves to the next question of the station", right1.correct && !right1.cleared && right1.state.q === 1);
  const right2 = await emit(red, "answer", { input: "1" });
  check("the last question clears the station and gives its letter and clue", right2.cleared && "CAT".includes(right2.cleared.letter) && right2.cleared.clue === "Look under the mat.");
  check("the team moves on to its next station", right2.state.station === 1);

  // The teacher skips Blue past its station.
  const skip = await emit(host, "skip", { team: "B" });
  const peek2 = await emit(host, "peek-room", { code });
  check("a teacher skip costs 120 seconds and still gives the letter", skip.ok && peek2.room.progress.B.penalty === 120 && peek2.room.progress.B.letters.join("") === right2.cleared.letter);
  const teamSkip = await emit(red, "skip", { team: "B" });
  check("only the Big Screen can skip", !teamSkip.ok);

  await emit(red, "answer", { input: "SECRET6" });
  const last = await emit(red, "answer", { input: "SECRET10" });
  check("after the last station the team reaches the finale", last.cleared && last.state.phase === "finale" && sorted(last.state.letters) === "ACT" && last.state.letters.join("") !== "CAT");

  const badWord = await emit(red, "solve", { word: "ACT" });
  check("a wrong word locks like a wrong answer", badWord.ok && !badWord.correct);
  await wait(5100);
  const finished = new Promise((resolve) => host.on("room-update", (room) => { if (room.status === "finished") resolve(room); }));
  const solved = await emit(red, "solve", { word: "c a t" });
  const end = await finished;
  check("solving the word wins the rally", solved.correct && end.winner === "A" && end.ranking[0] === "A");
  check("results carry stations, time and penalties", end.progress.A.cleared === 3 && end.progress.A.penalty === 30 && end.progress.A.time >= 30);

  [host, red, blue].forEach((s2) => s2.close());
}

main()
  .catch((err) => { console.error(err); failures++; })
  .finally(() => {
    console.log(failures ? `TEAM RALLY TEST FAILED (${failures})` : "TEAM RALLY TEST PASSED");
    server.close();
    process.exit(failures ? 1 : 0);
  });
