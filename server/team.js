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
    this.spawnIndex = index;
    this.plane = new Plane(index);
    this.spawnProtectedUntil = Date.now() + Team.SPAWN_PROTECTION_MS;
  }

  // Whether this crew is still inside its temporary post-spawn shield window.
  isSpawnProtected(now = Date.now()) {
    return now < this.spawnProtectedUntil;
  }

  // Add points earned from captures or destroying another crew's plane.
  awardScore(points) {
    this.score += points;
  }

  // Apply damage and report whether this hit destroyed the plane.
  takeDamage(points) {
    if (this.plane.health <= 0 || this.isSpawnProtected()) return false;
    this.plane.health = Math.max(0, this.plane.health - points);
    return this.plane.health === 0;
  }

  // Ignore friendly or missed shots; otherwise return the result of the hit.
  receiveProjectile(projectile, damage) {
    if (this.plane.health <= 0 || !this.plane.contains(projectile.x, projectile.y)) return null;
    if (this.isSpawnProtected()) return "protected";
    return this.takeDamage(damage);
  }

  // Replace a destroyed airship while preserving its crew identity and score.
  respawn() {
    if (this.plane.health > 0) return false;
    this.plane = new Plane(this.spawnIndex);
    this.spawnProtectedUntil = Date.now() + Team.SPAWN_PROTECTION_MS;
    return true;
  }

  // Advance this crew's plane and notify its members of tile events.
  update(dt, players, arena, notify) {
    if (this.plane.health <= 0) return;
    this.plane.update(dt, players, notify, arena);
  }

  // Build the public crew state sent to connected clients.
  snapshot() {
    return {
      id: this.id,
      name: this.name,
      inviteCode: this.inviteCode,
      score: this.score,
      spawnProtected: this.isSpawnProtected(),
      plane: this.plane.snapshot(),
    };
  }
}

Team.SPAWN_PROTECTION_MS = 5_000;

// Export the team entity.
module.exports = Team;
