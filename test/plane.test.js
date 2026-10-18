const assert = require("node:assert/strict");
const test = require("node:test");
const Plane = require("../server/plane");

test("world-down movement stays world-down on a rotated plane", () => {
  const plane = new Plane();
  plane.angle = Math.PI / 4;
  const player = {
    x: 4,
    y: 2,
    mountedTileId: null,
    input: { moveX: 0, moveY: 1 },
  };

  plane.update(0.05, [player], () => {});

  const localX = player.x - 4;
  const localY = player.y - 2;
  const worldX = localX * Math.cos(plane.angle) - localY * Math.sin(plane.angle);
  const worldY = localX * Math.sin(plane.angle) + localY * Math.cos(plane.angle);
  assert.ok(Math.abs(worldX) < 1e-10);
  assert.ok(worldY > 0);
});
