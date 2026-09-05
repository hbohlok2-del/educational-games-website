const screens = {
  home: document.getElementById("screen-home"),
  create: document.getElementById("screen-create"),
  join: document.getElementById("screen-join"),
  waiting: document.getElementById("screen-waiting"),
  play: document.getElementById("screen-play"),
  gameover: document.getElementById("screen-gameover"),
};

let currentScreen = "home";
function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.add("hidden"));
  screens[name].classList.remove("hidden");
  currentScreen = name;
}

const levelOptions = document.getElementById("level-options");
LEVELS.forEach((lvl, i) => {
  const label = document.createElement("label");
  label.innerHTML = `<input type="radio" name="difficulty" value="${lvl.id}" ${i === 0 ? "checked" : ""}> ${lvl.label}`;
  levelOptions.appendChild(label);
});

const socket = io("/tug-of-war");

const state = { code: null, team: null, difficulty: "early", position: 0, lockedOut: false };
let currentProblem = null;
let problemShownAt = 0;

const ropeMarker = document.getElementById("rope-marker");
function updateRope(position) {
  ropeMarker.style.left = `${50 + position / 2}%`;
}

const problemText = document.getElementById("problem-text");
const answerInput = document.getElementById("answer-input");
const playFeedback = document.getElementById("play-feedback");
const playStatus = document.getElementById("play-status");
const playYou = document.getElementById("play-you");

function newProblem() {
  currentProblem = generateProblem(state.difficulty);
  problemText.textContent = currentProblem.text;
  answerInput.value = "";
  answerInput.disabled = false;
  document.getElementById("btn-submit").disabled = false;
  playFeedback.textContent = "";
  playFeedback.className = "feedback";
  answerInput.focus();
  problemShownAt = Date.now();
}

function submitAnswer() {
  if (state.lockedOut || !currentProblem) return;
  const correct = currentProblem.checkAnswer(answerInput.value);
  const timeMs = Date.now() - problemShownAt;
  socket.emit("submit-answer", { correct, timeMs });

  if (correct) {
    playFeedback.textContent = "Nice! ";
    playFeedback.className = "feedback good";
    setTimeout(newProblem, 250);
  } else {
    playFeedback.textContent = "Not quite - try again in a moment.";
    playFeedback.className = "feedback gentle";
    state.lockedOut = true;
    answerInput.disabled = true;
    document.getElementById("btn-submit").disabled = true;
    setTimeout(() => {
      state.lockedOut = false;
      newProblem();
    }, 1500);
  }
}

function startPlay() {
  playYou.textContent = `You are Team ${state.team}`;
  updateRope(state.position);
  showScreen("play");
  newProblem();
}

document.getElementById("btn-create").onclick = () => showScreen("create");
document.getElementById("btn-create-back").onclick = () => showScreen("home");
document.getElementById("btn-join").onclick = () => {
  document.getElementById("join-error").textContent = "";
  showScreen("join");
};
document.getElementById("btn-join-back").onclick = () => showScreen("home");

document.getElementById("btn-create-confirm").onclick = () => {
  const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  socket.emit("create-room", { difficulty }, (ack) => {
    if (!ack.ok) return;
    state.code = ack.code;
    state.team = ack.team;
    state.difficulty = ack.difficulty;
    state.position = ack.position;
    document.getElementById("waiting-code").textContent = ack.code;
    document.getElementById("waiting-status").textContent = "You are Team A";
    showScreen("waiting");
  });
};

function joinAs(team) {
  const code = document.getElementById("join-code").value.trim().toUpperCase();
  const errorEl = document.getElementById("join-error");
  if (!code) { errorEl.textContent = "Enter a room code."; return; }
  socket.emit("join-room", { code, team }, (ack) => {
    if (!ack.ok) { errorEl.textContent = ack.error; return; }
    state.code = ack.code;
    state.team = ack.team;
    state.difficulty = ack.difficulty;
    state.position = ack.position;
    startPlay();
  });
}
document.getElementById("btn-join-a").onclick = () => joinAs("A");
document.getElementById("btn-join-b").onclick = () => joinAs("B");

document.getElementById("btn-submit").onclick = submitAnswer;
answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitAnswer();
});

document.getElementById("btn-play-again").onclick = () => location.reload();

socket.on("player-joined", ({ team }) => {
  if (currentScreen === "waiting" && team !== state.team) startPlay();
});

socket.on("state", ({ position }) => {
  state.position = position;
  updateRope(position);
});

socket.on("game-over", ({ winner }) => {
  document.getElementById("gameover-title").textContent = winner === state.team ? "You did it!" : "Good game!";
  document.getElementById("gameover-message").textContent = `Team ${winner} pulled the rope all the way to their side.`;
  showScreen("gameover");
});

socket.on("opponent-left", ({ team }) => {
  playStatus.textContent = `Team ${team} disconnected.`;
});
