const express = require("express");
const http = require("node:http");
const path = require("node:path");
const { Server } = require("socket.io");
const Game = require("./server/game");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
new Game(io).start();

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Airship PvP is running at http://localhost:${port}`);
});
