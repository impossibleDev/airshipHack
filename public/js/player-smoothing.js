const PLANE_WIDTH = 5;
const PLANE_HEIGHT = 3;
const WALK_SPEED = 3;
const CORRECTION_RATE = 0.25;

class PlayerSmoothing {
  constructor() {
    this.positions = new Map();
  }

  reconcile(players, localPlayerId) {
    const activeIds = new Set();
    for (const player of players) {
      activeIds.add(player.id);
      const position = this.positions.get(player.id);
      if (!position) {
        this.positions.set(player.id, {
          x: player.x,
          y: player.y,
          mountedTileId: player.mountedTileId,
        });
        continue;
      }

      if (player.id !== localPlayerId || position.mountedTileId !== player.mountedTileId) {
        position.x = player.x;
        position.y = player.y;
      } else {
        position.x += (player.x - position.x) * CORRECTION_RATE;
        position.y += (player.y - position.y) * CORRECTION_RATE;
      }
      position.mountedTileId = player.mountedTileId;
    }

    for (const id of this.positions.keys()) {
      if (!activeIds.has(id)) this.positions.delete(id);
    }
  }

  predictLocal(dt, state, input) {
    const player = state.players.find((item) => item.id === state.playerId);
    const team = state.teams.find((item) => item.id === state.teamId);
    const position = player && this.positions.get(player.id);
    if (!player || !team || !position || player.mountedTileId) return;

    const cos = Math.cos(team.plane.angle);
    const sin = Math.sin(team.plane.angle);
    const localX = input.moveX * cos + input.moveY * sin;
    const localY = -input.moveX * sin + input.moveY * cos;
    position.x = Math.max(0, Math.min(PLANE_WIDTH - 1, position.x + localX * dt * WALK_SPEED));
    position.y = Math.max(0, Math.min(PLANE_HEIGHT - 1, position.y + localY * dt * WALK_SPEED));
  }

  apply(players) {
    return players.map((player) => {
      const position = this.positions.get(player.id);
      return position ? { ...player, x: position.x, y: position.y } : player;
    });
  }

  clear() {
    this.positions.clear();
  }
}

export { PlayerSmoothing };
