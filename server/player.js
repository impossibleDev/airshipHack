// Stores one connected pilot's identity, movement, and station state.
class Player {
  // Initialize the player at the standard starting position on their plane.
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

  // Clamp client controls so malformed values cannot exceed normal input range.
  setInput(input) {
    this.input = {
      thrust: clamp(input.thrust),
      turn: clamp(input.turn),
      moveX: clamp(input.moveX),
      moveY: clamp(input.moveY),
    };
  }

  // Clear held controls when the player leaves a station.
  clearInput() {
    this.input = {};
  }

  // Enforce the firing cooldown before accepting another turret shot.
  canFire(now) {
    return now - this.lastShotAt >= Player.FIRE_COOLDOWN;
  }

  // Remember when a shot was accepted.
  recordShot(now) {
    this.lastShotAt = now;
  }

  // Release an occupied station and reset this player's control state.
  leaveStation(plane) {
    if (!this.mountedTileId) return;
    const station = plane.findTile(this.mountedTileId);
    if (station) station.tile.mountedBy = null;
    this.mountedTileId = null;
    this.clearInput();
  }

  // Send only the public fields required by the client.
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

// Minimum delay between successive shots from this player.
Player.FIRE_COOLDOWN = 350;

// Normalize numeric controls to the supported -1..1 range.
function clamp(value) {
  return Math.max(-1, Math.min(1, Number(value) || 0));
}

// Export the player entity for server logic and tests.
module.exports = Player;
