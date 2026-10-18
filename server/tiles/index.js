const Generator = require("./generator");
const PilotSeat = require("./pilot");
const Tile = require("./tile");
const Turret = require("./turret");
const Wall = require("./wall");

const TILE_COSTS = Object.freeze({ wall: 10, turret: 35, generator: 50 });
const TYPES = { pilot: PilotSeat, turret: Turret, generator: Generator, wall: Wall };

function createTile(type) {
  const TileType = TYPES[type] || Tile;
  return TileType === Tile ? new Tile(type) : new TileType();
}

module.exports = { createTile, TILE_COSTS };
