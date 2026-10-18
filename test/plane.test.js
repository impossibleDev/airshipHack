const assert = require("node:assert/strict");
const test = require("node:test");
const Arena = require("../server/arena");
const Plane = require("../server/plane");
const Player = require("../server/player");
const { createTile } = require("../server/tiles");

// The server-selected skin is part of the shared plane snapshot.
test("plane snapshot includes its server-selected skin", () => {
  const plane = new Plane();

  assert.ok(plane.skin >= 1 && plane.skin <= 3);
  assert.equal(plane.snapshot().skin, plane.skin);
});

// Player movement is world-relative even when the ship itself is rotated.
test("world-down movement stays world-down on a rotated plane", () => {
  const plane = new Plane();
  plane.angle = Math.PI / 4;
  const player = new Player("pilot-1", "Pilot", "crew-1");
  player.x = 2;
  player.y = 1;
  player.setInput({ moveX: 0, moveY: 1 });

  plane.update(0.05, [player], () => {});

  const localX = player.x - 2;
  const localY = player.y - 1;
  const worldX = localX * Math.cos(plane.angle) - localY * Math.sin(plane.angle);
  const worldY = localX * Math.sin(plane.angle) + localY * Math.cos(plane.angle);
  assert.ok(Math.abs(worldX) < 1e-10);
  assert.ok(worldY > 0);
});

// A broken generator disables powered flight but leaves crew movement available.
test("broken generators disable flight and stop the plane", () => {
  const plane = new Plane();
  const pilotSeat = plane.getTile(1, 2);
  const generator = plane.getTile(2, 2);
  const player = new Player("pilot-1", "Pilot", "crew-1");
  pilotSeat.mountedBy = player.id;
  player.mountedTileId = pilotSeat.id;
  player.setInput({ thrust: 1, turn: 1 });
  generator.broken = true;
  plane.vx = 2;

  plane.update(0.05, [player], () => {});

  assert.equal(plane.hasPower(), false);
  assert.equal(plane.x, 0);
  assert.equal(plane.angle, 0);
  assert.equal(plane.vx, 0);

  player.mountedTileId = null;
  player.setInput({ moveX: 1 });
  plane.update(0.05, [player], () => {});
  assert.ok(player.x > 2);
});

// Wall tiles reflect pellets and are destroyed after their tenth impact.
test("wall pellets reflect and reduce wall durability", () => {
  const plane = new Plane();
  const wall = createTile("wall");
  plane.tiles[1][2] = wall;
  const projectile = {
    previousX: -1,
    previousY: 0,
    x: 1,
    y: 0,
    vx: 2,
    vy: 0,
  };

  assert.equal(plane.receiveProjectile(projectile), true);
  assert.equal(wall.durability, 9);
  assert.ok(projectile.vx < 0);
  assert.ok(projectile.x < 0);

  for (let hit = 0; hit < 9; hit++) {
    projectile.previousX = -1;
    projectile.previousY = 0;
    projectile.x = 1;
    projectile.y = 0;
    projectile.vx = 2;
    projectile.vy = 0;
    assert.equal(plane.receiveProjectile(projectile), true);
  }
  assert.equal(plane.getTile(2, 1), null);
});

// Arena collision keeps the hull inside the circle and reflects outward speed.
test("plane hull stays inside the circular map and bounces off the edge", () => {
  const plane = new Plane();
  plane.x = 10;
  plane.y = 0;
  plane.vx = 1;

  plane.update(0, [], () => {}, new Arena(0, 0, 10));

  const hullRadius = Math.hypot(2.5, 1.5);
  assert.ok(Math.abs(plane.x - (10 - hullRadius)) < 1e-10);
  assert.ok(Math.abs(plane.y) < 1e-10);
  assert.ok(plane.vx < 0);
});

// Overlapping hulls are separated and their closing velocity is bounced.
test("colliding planes are separated and report their impact speed", () => {
  const first = new Plane();
  const second = new Plane();
  first.x = 0;
  second.x = 4.8;
  first.vx = 1;
  second.vx = -1;

  assert.equal(first.collide(second), 2);
  assert.ok(second.x - first.x >= 5);
  assert.ok(first.vx < 0);
  assert.ok(second.vx > 0);
});
