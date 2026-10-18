const { randomUUID } = require("node:crypto");
const { GRID_HEIGHT, GRID_WIDTH } = require("./constants");

function localToWorld(team, localX, localY) {
  const plane = team.plane;
  const x = localX - (GRID_WIDTH - 1) / 2;
  const y = localY - (GRID_HEIGHT - 1) / 2;
  const cos = Math.cos(plane.angle);
  const sin = Math.sin(plane.angle);
  return { x: plane.x + x * cos - y * sin, y: plane.y + x * sin + y * cos };
}

function fireTurret(gameState, player, aimX, aimY) {
  const team = gameState.teams.get(player.teamId);
  if (!team || !player.mountedTileId || !Number.isFinite(aimX) || !Number.isFinite(aimY)) return;
  let tilePosition = null;
  for (let y = 0; y < team.plane.tiles.length && !tilePosition; y++) {
    const x = team.plane.tiles[y].findIndex((tile) => tile?.id === player.mountedTileId);
    if (x !== -1) tilePosition = { x, y, tile: team.plane.tiles[y][x] };
  }
  if (!tilePosition || tilePosition.tile.type !== "turret") return;

  const now = Date.now();
  if (now - (player.lastShotAt || 0) < 350) return;
  player.lastShotAt = now;
  const origin = localToWorld(team, tilePosition.x, tilePosition.y);
  const target = localToWorld(team, aimX, aimY);
  const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
  const speed = 14;
  gameState.projectiles.set(randomUUID(), {
    x: origin.x,
    y: origin.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    teamId: team.id,
    expiresAt: now + 2_500,
  });
}

function updateProjectiles(gameState, dt, now) {
  for (const [id, shot] of gameState.projectiles) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (now >= shot.expiresAt) {
      gameState.projectiles.delete(id);
      continue;
    }
    for (const team of gameState.teams.values()) {
      if (team.id === shot.teamId || team.plane.health <= 0) continue;
      const dx = shot.x - team.plane.x;
      const dy = shot.y - team.plane.y;
      const cos = Math.cos(team.plane.angle);
      const sin = Math.sin(team.plane.angle);
      const localX = dx * cos + dy * sin;
      const localY = -dx * sin + dy * cos;
      if (Math.abs(localX) <= GRID_WIDTH / 2 && Math.abs(localY) <= GRID_HEIGHT / 2) {
        team.plane.health = Math.max(0, team.plane.health - 8);
        if (team.plane.health === 0) {
          const attacker = gameState.teams.get(shot.teamId);
          if (attacker) attacker.score += 1;
        }
        gameState.projectiles.delete(id);
        break;
      }
    }
  }
}

module.exports = { fireTurret, updateProjectiles };
