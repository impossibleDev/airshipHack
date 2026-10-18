const { randomUUID } = require("node:crypto");

// Base behavior shared by all ship tiles.
class Tile {
  // Give each tile a stable id and an initially empty station slot.
  constructor(type) {
    this.id = randomUUID();
    this.type = type;
    this.mountedBy = null;
  }

  // Leave this tile when mounted, or report that generic tiles do nothing.
  interact(plane, player, x, y, notice) {
    if (player.mountedTileId) {
      if (player.mountedTileId !== this.id) return notice("Leave your current station first.");
      this.mountedBy = null;
      player.mountedTileId = null;
      player.clearInput();
      return notice("Station left.");
    }
    notice("Nothing to interact with here.");
  }

  // Specialized tiles override this hook for periodic behavior.
  update() {}

  // Copy tile state into a plain object for socket snapshots.
  snapshot() {
    return { ...this };
  }
}

// Export the base class used by tile subclasses.
module.exports = Tile;
