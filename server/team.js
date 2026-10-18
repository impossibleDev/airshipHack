const { randomBytes, randomUUID } = require("node:crypto");
const Plane = require("./plane");

// Groups pilots around a shared airship and team score.
class Team {
  // Create the crew identity and spawn its plane in the next available slot.
  constructor(pilotName, index) {
    this.id = randomUUID();
    this.name = `${pilotName}'s crew`;
    this.inviteCode = randomBytes(3).toString("hex").toUpperCase();
    this.score = 0;
    this.plane = new Plane(index);
  }

  // Add points earned from captures or destroying another crew's plane.
  awardScore(points) {
    this.score += points;
  }

  // Apply damage and report whether this hit destroyed the plane.
  takeDamage(points) {
    if (this.plane.health <= 0) return false;
    this.plane.health = Math.max(0, this.plane.health - points);
    return this.plane.health === 0;
  }

  // Ignore friendly or missed shots; otherwise return the result of the hit.
  receiveProjectile(projectile, damage) {
    if (this.plane.health <= 0 || !this.plane.contains(projectile.x, projectile.y)) return null;
    return this.takeDamage(damage);
  }

  // Advance this crew's plane and notify its members of tile events.
  update(dt, players, arena, notify) {
    this.plane.update(dt, players, notify, arena);
  }

  // Build the public crew state sent to connected clients.
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

// Export the team entity.
module.exports = Team;
