const { randomUUID } = require("node:crypto");

class Projectile {
  constructor(x, y, angle, teamId, now = Date.now()) {
    this.id = randomUUID();
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * Projectile.SPEED;
    this.vy = Math.sin(angle) * Projectile.SPEED;
    this.teamId = teamId;
    this.expiresAt = now + Projectile.LIFETIME;
  }

  update(dt, now, arena) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    return now < this.expiresAt && arena.contains(this.x, this.y);
  }

  snapshot() {
    return { x: this.x, y: this.y, teamId: this.teamId };
  }
}

Projectile.SPEED = 14;
Projectile.LIFETIME = 2500;

module.exports = Projectile;
