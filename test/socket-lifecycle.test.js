const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const { createGameState } = require("../server/game/state");
const { registerSocketHandlers } = require("../server/network/socketHandlers");

class FakeSocket extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.sent = [];
  }

  emit(event, ...args) {
    if (!["connection", "join", "input", "interact", "build", "fire", "disconnect"].includes(event)) {
      this.sent.push({ event, args });
    }
    return super.emit(event, ...args);
  }
}

class FakeIO extends EventEmitter {
  constructor() {
    super();
    this.broadcasts = [];
  }

  emit(event, ...args) {
    if (event === "connection") return super.emit(event, ...args);
    this.broadcasts.push({ event, args });
    return true;
  }

  to(id) {
    return { emit: (event, ...args) => this.broadcasts.push({ id, event, args }) };
  }
}

function connect(io, id) {
  const socket = new FakeSocket(id);
  io.emit("connection", socket);
  return socket;
}

test("joining and disconnecting clears players and releases mounted tiles", () => {
  const io = new FakeIO();
  const gameState = createGameState();
  registerSocketHandlers(io, gameState);

  const first = connect(io, "pilot-1");
  first.emit("join", { name: "Pilot One" });
  const joined = first.sent.find((message) => message.event === "joined").args[0];
  const team = gameState.teams.get(joined.teamId);

  first.emit("interact", { x: 1, y: 2 });
  const pilotSeat = team.plane.tiles[2][1];
  assert.equal(pilotSeat.mountedBy, "pilot-1");
  assert.equal(gameState.players.size, 1);

  first.emit("disconnect");
  assert.equal(gameState.players.size, 0);
  assert.equal(pilotSeat.mountedBy, null);
  assert.equal(gameState.teams.get(team.id), team);
  assert.ok(gameState.emptyTeamTimers.has(team.id));

  const reconnect = connect(io, "pilot-2");
  reconnect.emit("join", { name: "Pilot One", inviteCode: joined.inviteCode });
  assert.equal(gameState.players.size, 1);
  assert.equal(gameState.players.get("pilot-2").teamId, team.id);
  assert.equal(gameState.emptyTeamTimers.has(team.id), false);
});

test("repeated join events for one connection do not create ghost players or teams", () => {
  const io = new FakeIO();
  const gameState = createGameState();
  registerSocketHandlers(io, gameState);

  const socket = connect(io, "pilot-1");
  socket.emit("join", { name: "Pilot One" });
  socket.emit("join", { name: "Pilot One" });

  assert.equal(gameState.players.size, 1);
  assert.equal(gameState.teams.size, 1);
});
