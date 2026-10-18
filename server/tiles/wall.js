const Tile = require("./tile");

// A basic buildable tile with the shared base-tile behavior.
class Wall extends Tile {
  // Register this tile with the wall type.
  constructor() {
    super("wall");
    this.durability = Wall.MAX_DURABILITY;
    this.maxDurability = Wall.MAX_DURABILITY;
  }
}

Wall.MAX_DURABILITY = 10;

// Export the wall tile implementation.
module.exports = Wall;
