const express = require("express");
const http = require("node:http");
const path = require("node:path");
const { Server } = require("socket.io");
const Game = require("./server/game");

// Create the HTTP app and attach Socket.IO to the same server.
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the browser client and start the authoritative game simulation.
app.use(express.static(path.join(__dirname, "public")));
new Game(io).start();

// Use the hosting platform's port when provided, otherwise run locally on 3000.
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Airship PvP is running at http://localhost:${port}`);
});
