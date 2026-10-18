// Owns the circular world boundary and keeps entities inside it.
class Arena {
  // Set the center and starting radius of the playable map.
  constructor(x = 30, y = 0, radius = 40) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  // Grow the arena when a newly created crew spawns beyond its current edge.
  expandToInclude(x, y, margin = 0) {
    this.radius = Math.max(this.radius, Math.hypot(x - this.x, y - this.y) + margin);
  }

  // Test whether a world coordinate is inside the arena.
  contains(x, y) {
    return Math.hypot(x - this.x, y - this.y) <= this.radius;
  }

  // Keep the whole plane hull inside the edge and reflect outward velocity.
  constrainPlane(plane, hullRadius) {
    const dx = plane.x - this.x;
    const dy = plane.y - this.y;
    const distance = Math.hypot(dx, dy);
    const maxCenterDistance = this.radius - hullRadius;
    if (distance <= maxCenterDistance) return;

    const normalX = dx / distance;
    const normalY = dy / distance;
    plane.x = this.x + normalX * maxCenterDistance;
    plane.y = this.y + normalY * maxCenterDistance;
    const outwardSpeed = plane.vx * normalX + plane.vy * normalY;
    if (outwardSpeed > 0) {
      plane.vx -= 1.35 * outwardSpeed * normalX;
      plane.vy -= 1.35 * outwardSpeed * normalY;
    }
  }

  // Return plain data suitable for sending to browser clients.
  snapshot() {
    return { x: this.x, y: this.y, radius: this.radius };
  }
}

// Export the arena entity for the game and tests.
module.exports = Arena;
