const Tile = require("./tile");

class PilotSeat extends Tile {
  constructor() {
    super("pilot");
  }

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

module.exports = PilotSeat;
