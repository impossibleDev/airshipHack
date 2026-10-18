const assert = require("node:assert/strict");
const test = require("node:test");
const Arena = require("../server/arena");
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
