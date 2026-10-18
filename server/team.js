const { randomBytes, randomUUID } = require("node:crypto");
const Plane = require("./plane");

class Team {
  constructor(pilotName, index) {
    this.id = randomUUID();
    this.name = `${pilotName}'s crew`;
    this.inviteCode = randomBytes(3).toString("hex").toUpperCase();
    this.score = 0;
    this.plane = new Plane(index);
  }

  awardScore(points) {
    this.score += points;
  }

  takeDamage(points) {
    if (this.plane.health <= 0) return false;
    this.plane.health = Math.max(0, this.plane.health - points);
    return this.plane.health === 0;
  }

  receiveProjectile(projectile, damage) {
    if (this.plane.health <= 0 || !this.plane.contains(projectile.x, projectile.y)) return null;
    return this.takeDamage(damage);
  }

  update(dt, players, arena, notify) {
    this.plane.update(dt, players, notify, arena);
  }

  snapshot() {
    return {
      id: this.id,
      name: this.name,
      inviteCode: this.inviteCode,
      score: this.score,
      plane: this.plane.snapshot(),
    };
  }
}

module.exports = Team;
