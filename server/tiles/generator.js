const Tile = require("./tile");

class Generator extends Tile {
  constructor() {
    super("generator");
    this.broken = false;
    this.nextBreakAt = Date.now() + 35_000 + Math.random() * 20_000;
    this.nextIncomeAt = Date.now() + 1_000;
  }

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

module.exports = Generator;
