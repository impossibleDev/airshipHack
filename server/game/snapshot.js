function createSnapshot(gameState) {
  return {
    teams: [...gameState.teams.values()].map((team) => ({
      id: team.id,
      name: team.name,
      inviteCode: team.inviteCode,
      score: team.score,
      plane: {
        ...team.plane,
        tiles: team.plane.tiles.map((row) => row.map((tile) => tile && { ...tile })),
      },
    })),
    players: [...gameState.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      x: player.x,
      y: player.y,
      mountedTileId: player.mountedTileId,
    })),
    projectiles: [...gameState.projectiles.values()].map(({ x, y, teamId }) => ({ x, y, teamId })),
  };
}

module.exports = { createSnapshot };
