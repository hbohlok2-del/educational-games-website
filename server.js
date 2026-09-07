const path = require("path");
const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const tugOfWar = require("./server/games/tugOfWar");
const teamRace = require("./server/games/teamRace");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use("/vendor/katex", express.static(path.join(__dirname, "node_modules", "katex", "dist")));

tugOfWar.attach(io);
teamRace.attach(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Educational games website running at http://localhost:${PORT}`);
});

module.exports = server;
