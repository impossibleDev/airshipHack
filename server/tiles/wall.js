const Tile = require("./tile");

class Wall extends Tile {
  constructor() {
    super("wall");
  }
}

module.exports = Wall;
