class Player {
  constructor(id, name, teamId) {
    this.id = id;
    this.name = name;
    this.teamId = teamId;
    this.x = 2;
    this.y = 2;
    this.mountedTileId = null;
    this.input = {};
    this.lastShotAt = 0;
  }

  setInput(input) {
    this.input = {
      thrust: clamp(input.thrust),
      turn: clamp(input.turn),
      moveX: clamp(input.moveX),
      moveY: clamp(input.moveY),
    };
  }

  clearInput() {
    this.input = {};
  }

  canFire(now) {
    return now - this.lastShotAt >= Player.FIRE_COOLDOWN;
  }

  recordShot(now) {
    this.lastShotAt = now;
  }

  leaveStation(plane) {
    if (!this.mountedTileId) return;
    const station = plane.findTile(this.mountedTileId);
    if (station) station.tile.mountedBy = null;
    this.mountedTileId = null;
    this.clearInput();
  }

  snapshot() {
    return {
      id: this.id,
      name: this.name,
      teamId: this.teamId,
      x: this.x,
      y: this.y,
      mountedTileId: this.mountedTileId,
    };
  }
}

Player.FIRE_COOLDOWN = 350;

function clamp(value) {
  return Math.max(-1, Math.min(1, Number(value) || 0));
}

module.exports = Player;
