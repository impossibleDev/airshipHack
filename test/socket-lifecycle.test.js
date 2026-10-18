const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const Game = require("../server/game");

class FakeSocket extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.sent = [];
  }

  emit(event, ...args) {
    const incoming = ["join", "input", "interact", "build", "fire", "disconnect"];
    if (incoming.includes(event)) return super.emit(event, ...args);
    this.sent.push({ event, args });
    return true;
  }
}

class FakeIO extends EventEmitter {
  emit(event, ...args) {
    if (event === "connection") return super.emit(event, ...args);
    return true;
  }

  to() {
    return { emit: () => true };
  }
}

function connect(game, id) {
  const socket = new FakeSocket(id);
  game.connect(socket);
  return socket;
}

test("disconnect removes the player, frees their station, and allows reconnect", () => {
  const game = new Game(new FakeIO());
  const first = connect(game, "pilot-1");
  first.emit("join", { name: "Pilot One" });
  const joined = first.sent.find((message) => message.event === "joined").args[0];
  const team = game.teams.get(joined.teamId);

  first.emit("interact", { x: 1, y: 2 });
  const seat = team.plane.getTile(1, 2);
  assert.equal(seat.mountedBy, "pilot-1");

  first.emit("disconnect");
  assert.equal(game.players.size, 0);
  assert.equal(seat.mountedBy, null);
  assert.equal(game.teams.get(team.id), team);

  const reconnect = connect(game, "pilot-2");
  reconnect.emit("join", { name: "Pilot One", inviteCode: joined.inviteCode });
  assert.equal(game.players.get("pilot-2").teamId, team.id);
  assert.equal(game.emptyTeamTimers.has(team.id), false);
});

test("repeated join events do not create duplicate players or teams", () => {
  const game = new Game(new FakeIO());
  const socket = connect(game, "pilot-1");
  socket.emit("join", { name: "Pilot One" });
  socket.emit("join", { name: "Pilot One" });
  assert.equal(game.players.size, 1);
  assert.equal(game.teams.size, 1);
});
