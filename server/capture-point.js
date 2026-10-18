class CapturePoint {
  constructor(arena, teams = []) {
    this.radius = CapturePoint.RADIUS;
    this.capturingTeamId = null;
    this.progress = 0;
    this.relocate(arena, teams);
  }

  relocate(arena, teams) {
    const crewList = [...teams];
    for (let attempt = 0; attempt < 32; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * (arena.radius - this.radius);
      this.x = arena.x + Math.cos(angle) * distance;
      this.y = arena.y + Math.sin(angle) * distance;
      if (crewList.every((team) =>
        Math.hypot(team.plane.x - this.x, team.plane.y - this.y) > this.radius + CapturePoint.SPAWN_CLEARANCE
      )) break;
    }
    this.capturingTeamId = null;
    this.progress = 0;
  }

  isNear(x, y, distance) {
    return Math.hypot(x - this.x, y - this.y) <= distance;
  }

  update(teams, dt) {
    const nearbyTeams = [...teams].filter((team) => this.isNear(
      team.plane.x,
      team.plane.y,
      this.radius,
    ));

    if (nearbyTeams.length !== 1) {
      this.capturingTeamId = null;
      this.progress = 0;
      return null;
    }

    const team = nearbyTeams[0];
    if (this.capturingTeamId !== team.id) {
      this.capturingTeamId = team.id;
      this.progress = 0;
    }
    this.progress += dt / CapturePoint.DURATION;
    if (this.progress < 1) return null;

    this.progress = 1;
    return team;
  }

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

CapturePoint.RADIUS = 8;
CapturePoint.SPAWN_CLEARANCE = 4;
CapturePoint.DURATION = 15;
CapturePoint.SCORE = 150;

module.exports = CapturePoint;
