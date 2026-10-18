const Tile = require("./tile");

class Turret extends Tile {
  constructor() {
    super("turret");
  }

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

module.exports = Turret;
