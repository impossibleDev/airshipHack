const Tile = require("./tile");

// A basic buildable tile with the shared base-tile behavior.
class Wall extends Tile {
  // Register this tile with the wall type.
  constructor() {
    super("wall");
  }
}

// Export the wall tile implementation.
module.exports = Wall;
