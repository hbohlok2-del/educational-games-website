const path = require("path");
const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const tugOfWar = require("./server/games/tugOfWar");
const teamRace = require("./server/games/teamRace");
const teamBuzzer = require("./server/games/teamBuzzer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use("/vendor/katex", express.static(path.join(__dirname, "node_modules", "katex", "dist")));
app.use("/lessons", require("./server/routes/lessons"));

const { rooms: tugRooms } = tugOfWar.attach(io);
const { rooms: raceRooms } = teamRace.attach(io);
const { rooms: buzzerRooms } = teamBuzzer.attach(io);

function capitalize(word) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

function lobbyEntries(gameType, roomMap, defaultTitle) {
  const entries = [];
  for (const room of roomMap.values()) {
    if (room.status === "finished") continue;
    entries.push({
      gameType,
      code: room.code,
      title: room.title || (defaultTitle + (room.difficulty ? " — " + capitalize(room.difficulty) : "")),
      status: room.status,
      teamA: !!room.teams.A,
      teamB: !!room.teams.B,
    });
  }
  return entries;
}

app.get("/api/rooms", (req, res) => {
  const rooms = [
    ...lobbyEntries("tug-of-war", tugRooms, "Number Haul"),
    ...lobbyEntries("team-race", raceRooms, "Class Race"),
    ...lobbyEntries("team-buzzer", buzzerRooms, "Class Buzzer"),
  ];
  res.json({ rooms });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Educational games website running at http://localhost:${PORT}`);
});

module.exports = server;
