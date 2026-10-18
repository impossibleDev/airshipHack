const assert = require("node:assert/strict");
const test = require("node:test");
const Arena = require("../server/arena");
const Plane = require("../server/plane");
const Player = require("../server/player");

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
