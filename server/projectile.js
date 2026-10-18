const { randomUUID } = require("node:crypto");

// Represents a single moving shot fired by a crew's turret.
class Projectile {
  // Convert a firing angle into velocity and set the projectile lifetime.
  constructor(x, y, angle, teamId, now = Date.now()) {
    this.id = randomUUID();
    this.x = x;
    this.y = y;
    this.previousX = x;
    this.previousY = y;
    this.vx = Math.cos(angle) * Projectile.SPEED;
    this.vy = Math.sin(angle) * Projectile.SPEED;
    this.teamId = teamId;
    this.expiresAt = now + Projectile.LIFETIME;
  }

  // Advance the shot and report whether it remains active in the arena.
  update(dt, now, arena) {
    this.previousX = this.x;
    this.previousY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    return now < this.expiresAt && arena.contains(this.x, this.y);
  }

  // Serialize the visual and ownership data needed by clients.
  snapshot() {
    return { x: this.x, y: this.y, teamId: this.teamId };
  }
}

// Projectile tuning values are shared by all shots.
Projectile.SPEED = 14;
Projectile.LIFETIME = 2500;

// Export the projectile entity.
module.exports = Projectile;
