const assert = require("node:assert/strict");
const test = require("node:test");
const Arena = require("../server/arena");
const Game = require("../server/game");
const Player = require("../server/player");
const Projectile = require("../server/projectile");
const Team = require("../server/team");

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

test("projectile owns movement, arena bounds, and expiry", () => {
  const arena = new Arena(0, 0, 10);
  const projectile = new Projectile(0, 0, 0, "crew-1", 0);

  assert.equal(projectile.update(0.05, 50, arena), true);
  assert.ok(Math.abs(projectile.x - 0.7) < 1e-10);
  assert.equal(projectile.update(0.05, Projectile.LIFETIME, arena), false);
});

test("team owns damage and reports a single plane destruction", () => {
  const team = new Team("Crew", 0);
  const projectile = { x: team.plane.x, y: team.plane.y };

  assert.equal(team.receiveProjectile(projectile, 90), false);
  assert.equal(team.receiveProjectile(projectile, 10), true);
  assert.equal(team.receiveProjectile(projectile, 10), null);
  assert.equal(team.plane.health, 0);
});

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
