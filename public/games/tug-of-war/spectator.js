const socket = io("/tug-of-war");
const ropeMarker = document.getElementById("rope-marker");

function updateRope(position) {
  ropeMarker.style.left = `${50 + position / 2}%`;
}

document.getElementById("btn-watch").onclick = () => {
  const code = document.getElementById("join-code").value.trim().toUpperCase();
  const errorEl = document.getElementById("join-error");
  if (!code) { errorEl.textContent = "Enter a room code."; return; }
  socket.emit("join-room", { code }, (ack) => {
    if (!ack.ok) { errorEl.textContent = ack.error; return; }
    document.getElementById("watch-code").textContent = ack.code;
    updateRope(ack.position);
    document.getElementById("screen-join").classList.add("hidden");
    document.getElementById("screen-watch").classList.remove("hidden");
  });
};

socket.on("state", ({ position }) => updateRope(position));
socket.on("game-over", ({ winner }) => {
  document.getElementById("watch-status").textContent = `Team ${winner} wins!`;
});
