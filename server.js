const path = require("path");
const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const tugOfWar = require("./server/games/tugOfWar");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

tugOfWar.attach(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Educational games website running at http://localhost:${PORT}`);
});

module.exports = server;
