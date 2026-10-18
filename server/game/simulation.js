const { GRID_HEIGHT, GRID_WIDTH, TICK_MS } = require("./constants");
const { updateProjectiles } = require("./combat");
const { sendNotice } = require("./tiles");
const { createSnapshot } = require("./snapshot");

function sendNoticeToTeam(io, gameState, teamId, message) {
  for (const player of gameState.players.values()) {
    if (player.teamId === teamId) sendNotice(io, player, message);
  }
}

function stepGame(io, gameState) {
  const now = Date.now();
  const dt = TICK_MS / 1_000;
  for (const team of gameState.teams.values()) {
    const plane = team.plane;
    for (const row of plane.tiles) {
      for (const tile of row) {
        if (!tile || tile.type !== "generator") continue;
        if (!tile.broken && now >= tile.nextBreakAt) {
          tile.broken = true;
          sendNoticeToTeam(io, gameState, team.id, "A generator has broken. Interact with it using E to repair it.");
        }
        if (!tile.broken && now >= tile.nextIncomeAt) {
          plane.resources += 3;
          tile.nextIncomeAt = now + 1_000;
        }
      }
    }

    const pilot = plane.tiles.flat().find((tile) => tile?.type === "pilot" && tile.mountedBy);
    const pilotPlayer = pilot && gameState.players.get(pilot.mountedBy);
    if (pilotPlayer) {
      const input = pilotPlayer.input || {};
      plane.angle += (Number(input.turn) || 0) * 1.7 * dt;
      const thrust = Math.max(-1, Math.min(1, Number(input.thrust) || 0));
      plane.vx += Math.cos(plane.angle) * thrust * 3.2 * dt;
      plane.vy += Math.sin(plane.angle) * thrust * 3.2 * dt;
      plane.vx *= 0.995;
      plane.vy *= 0.995;
      const speed = Math.hypot(plane.vx, plane.vy);
      if (speed > 8) {
        plane.vx = (plane.vx / speed) * 8;
        plane.vy = (plane.vy / speed) * 8;
      }
      plane.x += plane.vx * dt;
      plane.y += plane.vy * dt;
    }

    for (const player of gameState.players.values()) {
      if (player.teamId !== team.id || player.mountedTileId) continue;
      const input = player.input || {};
      const worldX = Number(input.moveX) || 0;
      const worldY = Number(input.moveY) || 0;
      const cos = Math.cos(plane.angle);
      const sin = Math.sin(plane.angle);
      const localX = worldX * cos + worldY * sin;
      const localY = -worldX * sin + worldY * cos;
      player.x = Math.max(0, Math.min(GRID_WIDTH - 1, player.x + localX * dt * 3));
      player.y = Math.max(0, Math.min(GRID_HEIGHT - 1, player.y + localY * dt * 3));
    }
  }

  updateProjectiles(gameState, dt, now);
  io.emit("state", createSnapshot(gameState));
}

module.exports = { stepGame };
