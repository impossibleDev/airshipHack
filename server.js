const express = require("express");
const http = require("node:http");
const path = require("node:path");
const { Server } = require("socket.io");
const { createGameState } = require("./server/game/state");
const { stepGame } = require("./server/game/simulation");
const { registerSocketHandlers } = require("./server/network/socketHandlers");
const { createSnapshot } = require("./server/game/snapshot");
const { TICK_MS } = require("./server/game/constants");

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const gameState = createGameState();

app.use(express.static(path.join(__dirname, "public")));
registerSocketHandlers(io, gameState);

setInterval(() => {
  stepGame(io, gameState);
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`Airship PvP is running at http://localhost:${PORT}`);
});
