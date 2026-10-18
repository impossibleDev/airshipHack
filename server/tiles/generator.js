const Tile = require("./tile");

// Produces plane resources over time and periodically needs repairs.
class Generator extends Tile {
  // Initialize production and the first scheduled breakdown.
  constructor() {
    super("generator");
    this.broken = false;
    this.nextBreakAt = Date.now() + 35_000 + Math.random() * 20_000;
    this.nextIncomeAt = Date.now() + 1_000;
  }

  // Allow crew to repair a broken generator by spending resources.
  interact(plane, player, x, y, notice) {
    if (player.mountedTileId) return super.interact(plane, player, x, y, notice);
    if (!this.broken) return notice("The generator is running.");
    if (plane.resources < 15) return notice("Repairing the generator costs 15 resources.");
    plane.resources -= 15;
    this.broken = false;
    this.nextBreakAt = Date.now() + 35_000 + Math.random() * 20_000;
    this.nextIncomeAt = Date.now() + 1_000;
    notice("Generator repaired.");
  }

  // Break the generator on schedule and add resources while it is running.
  update(plane, now, noticeTeam) {
    if (!this.broken && now >= this.nextBreakAt) {
      this.broken = true;
      noticeTeam("A generator broke. Interact with it to repair it.");
    }
    if (!this.broken && now >= this.nextIncomeAt) {
      plane.resources += 3;
      this.nextIncomeAt = now + 1_000;
    }
  }
}

// Export the resource-producing tile.
module.exports = Generator;
