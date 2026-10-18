const { randomUUID } = require("node:crypto");

class Tile {
  constructor(type) {
    this.id = randomUUID();
    this.type = type;
    this.mountedBy = null;
  }

  interact(plane, player, x, y, notice) {
    if (player.mountedTileId) {
      if (player.mountedTileId !== this.id) return notice("Leave your current station first.");
      this.mountedBy = null;
      player.mountedTileId = null;
      player.input = {};
      return notice("Station left.");
    }
    notice("Nothing to interact with here.");
  }

  update() {}

  snapshot() {
    return { ...this };
  }
}

module.exports = Tile;
