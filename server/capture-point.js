// A neutral arena objective that crews can hold to earn score.
class CapturePoint {
  // Start a new objective at a safe random location within the arena.
  constructor(arena, teams = []) {
    // Capture eligibility is measured from the point's center.
    this.radius = CapturePoint.RADIUS;
    // The crew currently accumulating capture progress, if any.
    this.capturingTeamId = null;
    // Capture progress ranges from zero to one.
    this.progress = 0;
    this.relocate(arena, teams);
  }

  // Pick a location away from existing crews, then clear any previous capture.
  relocate(arena, teams) {
    const crewList = [...teams];
    for (let attempt = 0; attempt < 32; attempt++) {
      // Polar coordinates provide a random position inside the arena.
      const angle = Math.random() * Math.PI * 2;
      // Square-root scaling keeps points evenly distributed by area.
      const distance = Math.sqrt(Math.random()) * (arena.radius - this.radius);
      this.x = arena.x + Math.cos(angle) * distance;
      this.y = arena.y + Math.sin(angle) * distance;
      // Stop early when the candidate has enough room around nearby planes.
      if (crewList.every((team) =>
        Math.hypot(team.plane.x - this.x, team.plane.y - this.y) > this.radius + CapturePoint.SPAWN_CLEARANCE
      )) break;
    }
    // A relocated point always needs to be captured from scratch.
    this.capturingTeamId = null;
    this.progress = 0;
  }

  // Return whether a world position is within the requested distance of the point.
  isNear(x, y, distance) {
    return Math.hypot(x - this.x, y - this.y) <= distance;
  }

  // Advance capture progress and return the capturing crew when it completes.
  update(teams, dt) {
    // Count distinct nearby crews so multiple crews contest rather than capture.
    const nearbyTeams = [...teams].filter((team) => this.isNear(
      team.plane.x,
      team.plane.y,
      this.radius,
    ));

    // No crew or multiple crews present: clear progress and require a fresh hold.
    if (nearbyTeams.length !== 1) {
      this.capturingTeamId = null;
      this.progress = 0;
      return null;
    }

    const team = nearbyTeams[0];
    // A different crew taking over starts its own capture from zero.
    if (this.capturingTeamId !== team.id) {
      this.capturingTeamId = team.id;
      this.progress = 0;
    }
    // Convert elapsed seconds into a fraction of the required capture duration.
    this.progress += dt / CapturePoint.DURATION;
    if (this.progress < 1) return null;

    // Report the winning crew; the game awards points and relocates the objective.
    this.progress = 1;
    return team;
  }

  // Expose only the objective state needed by clients for rendering.
  snapshot() {
    return {
      x: this.x,
      y: this.y,
      radius: this.radius,
      capturingTeamId: this.capturingTeamId,
      progress: this.progress,
    };
  }
}

// Gameplay tuning: objective size, spawn spacing, hold time, and reward.
CapturePoint.RADIUS = 5;
CapturePoint.SPAWN_CLEARANCE = 4;
CapturePoint.DURATION = 10;
CapturePoint.SCORE = 150;

// Export the class for use by the game server.
module.exports = CapturePoint;
