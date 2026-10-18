const Generator = require("./generator");
const PilotSeat = require("./pilot");
const Tile = require("./tile");
const Turret = require("./turret");
const Wall = require("./wall");

// Resource cost for each player-buildable tile.
const TILE_COSTS = Object.freeze({ wall: 10, turret: 35, generator: 50 });
// Map each supported tile name to its specialized implementation.
const TYPES = { pilot: PilotSeat, turret: Turret, generator: Generator, wall: Wall };

// Construct the matching tile subclass, falling back to a generic tile type.
function createTile(type) {
  const TileType = TYPES[type] || Tile;
  return TileType === Tile ? new Tile(type) : new TileType();
}

// Share tile construction and costs with the plane model.
module.exports = { createTile, TILE_COSTS };
