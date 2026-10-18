const Tile = require("./tile");

// A station that lets a crew member control ship heading and thrust.
class PilotSeat extends Tile {
  // Register this tile with the pilot station type.
  constructor() {
    super("pilot");
  }

  // Mount an available seat, or delegate station exit to the base tile.
  interact(plane, player, x, y, notice) {
    if (player.mountedTileId) return super.interact(plane, player, x, y, notice);
    if (this.mountedBy) return notice("Someone is already piloting.");
    this.mountedBy = player.id;
    player.mountedTileId = this.id;
    player.x = x;
    player.y = y;
    notice("You are piloting.");
  }
}

// Export the pilot station implementation.
module.exports = PilotSeat;
