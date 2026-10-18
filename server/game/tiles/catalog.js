const { randomUUID } = require("node:crypto");

const TILE_COSTS = Object.freeze({ wall: 10, turret: 35, generator: 50 });

function createTile(type, { initialGenerator = false } = {}) {
  const tile = { id: randomUUID(), type, mountedBy: null };
  if (type === "generator") {
    tile.broken = false;
    tile.nextBreakAt = Date.now() + (initialGenerator ? 35_000 : 35_000 + Math.random() * 20_000);
    tile.nextIncomeAt = Date.now() + 1_000;
  }
  return tile;
}

module.exports = { createTile, TILE_COSTS };
