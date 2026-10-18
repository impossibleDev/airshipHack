const Tile = require("./tile");

// Provides ship power and periodically needs repairs.
class Generator extends Tile {
  // Initialize the first scheduled breakdown.
  constructor() {
    super("generator");
    this.broken = false;
    this.nextBreakAt = Date.now() + 35_000 + Math.random() * 20_000;
  }

  // Allow crew to repair a broken generator by interacting with it.
  interact(plane, player, x, y, notice) {
    if (player.mountedTileId) return super.interact(plane, player, x, y, notice);
    if (!this.broken) return notice("The generator is running.");
    this.broken = false;
    this.nextBreakAt = Date.now() + 35_000 + Math.random() * 20_000;
    notice("Generator repaired.");
  }

  // Break the generator on schedule.
  update(plane, now, noticeTeam) {
    if (!this.broken && now >= this.nextBreakAt) {
      this.broken = true;
      noticeTeam("A generator broke. Interact with it to repair it.");
    }
  }
}

// Export the resource-producing tile.
module.exports = Generator;
