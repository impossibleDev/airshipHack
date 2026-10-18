const Tile = require("./tile");

// A mounted station that allows its user to fire at enemy planes.
class Turret extends Tile {
  // Register this tile with the turret type.
  constructor() {
    super("turret");
  }

  // Mount an available turret, or let the base class handle leaving it.
  interact(plane, player, x, y, notice) {
    if (player.mountedTileId) return super.interact(plane, player, x, y, notice);
    if (this.mountedBy) return notice("Someone is already using that turret.");
    this.mountedBy = player.id;
    player.mountedTileId = this.id;
    player.x = x;
    player.y = y;
    notice("Turret ready. Click to fire.");
  }
}

// Export the turret station implementation.
module.exports = Turret;
