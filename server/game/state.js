function createGameState() {
  return {
    teams: new Map(),
    players: new Map(),
    projectiles: new Map(),
    emptyTeamTimers: new Map(),
  };
}

module.exports = { createGameState };
