const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const Game = require("../server/game");
const Player = require("../server/player");
const Team = require("../server/team");

// Socket.IO test double that separates incoming client events from server replies.
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

// Minimal room/broadcast API used by the game coordinator during tests.
class FakeIO extends EventEmitter {
  emit(event, ...args) {
    if (event === "connection") return super.emit(event, ...args);
    return true;
  }

  to() {
    return { emit: () => true };
  }
}

// Connect a fake client and register the game's event handlers.
function connect(game, id) {
  const socket = new FakeSocket(id);
  game.connect(socket);
  return socket;
}

// Disconnect releases occupied stations and allows the same crew to reconnect.
test("disconnect removes the player, frees their station, and allows reconnect", () => {
  const game = new Game(new FakeIO());
  const first = connect(game, "pilot-1");
  first.emit("join", { name: "Pilot One" });
  const joined = first.sent.find((message) => message.event === "joined").args[0];
  const team = game.teams.get(joined.teamId);
  const player = game.players.get("pilot-1");
  assert.ok(team instanceof Team);
  assert.ok(player instanceof Player);

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

// Duplicate join messages for one socket do not create extra game entities.
test("repeated join events do not create duplicate players or teams", () => {
  const game = new Game(new FakeIO());
  const socket = connect(game, "pilot-1");
  socket.emit("join", { name: "Pilot One" });
  socket.emit("join", { name: "Pilot One" });
  assert.equal(game.players.size, 1);
  assert.equal(game.teams.size, 1);
});

// New crews with matching names receive case-insensitively unique crew names.
test("duplicate crew names receive numbered suffixes", () => {
  const game = new Game(new FakeIO());
  const first = connect(game, "pilot-1");
  const second = connect(game, "pilot-2");
  const third = connect(game, "pilot-3");

  first.emit("join", { name: "Pilot" });
  second.emit("join", { name: "Pilot" });
  third.emit("join", { name: "pilot" });

  assert.deepEqual(
    [...game.teams.values()].map((team) => team.name),
    ["Pilot's crew", "Pilot's crew (2)", "pilot's crew (3)"],
  );
});
