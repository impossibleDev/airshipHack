const assert = require("node:assert/strict");
const test = require("node:test");
const Arena = require("../server/arena");
const Game = require("../server/game");
const Player = require("../server/player");
const Projectile = require("../server/projectile");
const Team = require("../server/team");
const { createTile } = require("../server/tiles");

// Inputs are clamped and snapshots expose only the client's required fields.
test("player owns input normalization and exports a client snapshot", () => {
  const player = new Player("pilot-1", "Pilot", "crew-1");
  player.setInput({ thrust: 4, turn: -2, moveX: 0.5 });

  assert.deepEqual(player.input, { thrust: 1, turn: -1, moveX: 0.5, moveY: 0 });
  assert.deepEqual(player.snapshot(), {
    id: "pilot-1",
    name: "Pilot",
    teamId: "crew-1",
    x: 2,
    y: 2,
    mountedTileId: null,
  });
});

// Shots move through the arena and expire after their configured lifetime.
test("projectile owns movement, arena bounds, and expiry", () => {
  const arena = new Arena(0, 0, 10);
  const projectile = new Projectile(0, 0, 0, "crew-1", 0);

  assert.equal(projectile.update(0.05, 50, arena), true);
  assert.ok(Math.abs(projectile.x - 0.7) < 1e-10);
  assert.equal(projectile.update(0.05, Projectile.LIFETIME, arena), false);
});

// Plane damage reports its destruction only once.
test("team owns damage and reports a single plane destruction", () => {
  const team = new Team("Crew", 0);
  const projectile = { x: team.plane.x, y: team.plane.y };

  assert.equal(team.receiveProjectile(projectile, 90), false);
  assert.equal(team.receiveProjectile(projectile, 10), true);
  assert.equal(team.receiveProjectile(projectile, 10), null);
  assert.equal(team.plane.health, 0);
});

// The final hit awards the attacking crew the configured kill score.
test("destroying an enemy plane awards the attacker 200 score", () => {
  const game = new Game({ emit() {} });
  const attacker = new Team("Attacker", 0);
  const defender = new Team("Defender", 1);
  defender.plane.health = 8;
  game.teams.set(attacker.id, attacker);
  game.teams.set(defender.id, defender);

  const target = { x: defender.plane.x, y: defender.plane.y };
  const shot = new Projectile(target.x - 0.7, target.y, 0, attacker.id);
  game.projectiles.set(shot.id, shot);
  game.update();

  assert.equal(defender.plane.health, 0);
  assert.equal(attacker.score, 200);
});

// High-speed plane collisions damage both crews and award the destroying crew.
test("colliding planes take impact damage and award a kill", () => {
  const game = new Game({ emit() {} });
  const attacker = new Team("Attacker", 0);
  const defender = new Team("Defender", 1);
  attacker.plane.x = 10;
  defender.plane.x = 14.8;
  attacker.plane.vx = 1;
  defender.plane.vx = -1;
  defender.plane.health = 4;
  game.teams.set(attacker.id, attacker);
  game.teams.set(defender.id, defender);

  game.update();

  assert.equal(attacker.plane.health, 96);
  assert.equal(defender.plane.health, 0);
  assert.equal(attacker.score, 200);
  assert.ok(defender.plane.x - attacker.plane.x >= 5);
});

// A dead crew can respawn its plane without losing crew identity or score.
test("respawning restores a destroyed plane and resets its crew", () => {
  const game = new Game({ emit() {} });
  const team = new Team("Crew", 2);
  const player = new Player("pilot-1", "Pilot", team.id);
  const oldPlane = team.plane;
  const pilotSeat = oldPlane.getTile(1, 2);
  pilotSeat.mountedBy = player.id;
  player.mountedTileId = pilotSeat.id;
  player.setInput({ thrust: 1 });
  player.x = 4;
  team.plane.health = 0;
  team.score = 75;
  game.teams.set(team.id, team);
  game.players.set(player.id, player);

  game.respawn({ id: player.id });

  assert.notEqual(team.plane, oldPlane);
  assert.equal(team.plane.health, 100);
  assert.equal(team.score, 75);
  assert.equal(player.mountedTileId, null);
  assert.deepEqual(player.input, {});
  assert.equal(player.x, 2);
  assert.equal(player.y, 2);
});

// Turrets cannot fire without generator power and the pilot gets an explanation.
test("broken generators disable turret fire", () => {
  const notices = [];
  const game = new Game({
    emit() {},
    to() {
      return { emit: (event, message) => notices.push(message) };
    },
  });
  const team = new Team("Crew", 0);
  const player = new Player("pilot-1", "Pilot", team.id);
  const turret = createTile("turret");
  team.plane.tiles[1][3] = turret;
  team.plane.getTile(2, 2).broken = true;
  turret.mountedBy = player.id;
  player.mountedTileId = turret.id;
  game.teams.set(team.id, team);
  game.players.set(player.id, player);

  game.fire({ id: player.id }, { x: 4, y: 1 });

  assert.equal(game.projectiles.size, 0);
  assert.deepEqual(notices, ["Weapons offline. Repair a generator to restore ship power."]);
});

// The simulation tick reflects pellets before they can damage the ship behind a wall.
test("game tick reflects incoming pellets from a ship wall", () => {
  const game = new Game({ emit() {} });
  const defender = new Team("Defender", 0);
  defender.plane.x = 30;
  const wall = createTile("wall");
  defender.plane.tiles[1][2] = wall;
  const shot = new Projectile(29, 0, 0, "attacker");
  game.teams.set(defender.id, defender);
  game.projectiles.set(shot.id, shot);

  game.update();

  assert.equal(wall.durability, 9);
  assert.ok(shot.vx < 0);
  assert.equal(defender.plane.health, 100);
  assert.equal(game.projectiles.has(shot.id), true);
});
