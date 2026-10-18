import { drawTile, TILE_SIZE } from "./tiles.js";

const WIDTH = 9;
const HEIGHT = 5;
const COLORS = ["#e9ab54", "#db6f58", "#86a6e7", "#64bb9b", "#bd8ad1", "#d4a15d"];

function screenToTile(x, y, canvas, plane) {
  const dx = (x - canvas.clientWidth / 2) / TILE_SIZE;
  const dy = (y - canvas.clientHeight / 2) / TILE_SIZE;
  return {
    x: dx * Math.cos(plane.angle) + dy * Math.sin(plane.angle) + (WIDTH - 1) / 2,
    y: -dx * Math.sin(plane.angle) + dy * Math.cos(plane.angle) + (HEIGHT - 1) / 2,
  };
}

function drawPlane(ctx, team, index, camera, canvas, players) {
  const plane = team.plane;
  const x = canvas.clientWidth / 2 + (plane.x - camera.x) * TILE_SIZE;
  const y = canvas.clientHeight / 2 + (plane.y - camera.y) * TILE_SIZE;
  const width = WIDTH * TILE_SIZE;
  const height = HEIGHT * TILE_SIZE;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(plane.angle);
  ctx.fillStyle = "#ede8d9";
  ctx.strokeStyle = COLORS[index % COLORS.length];
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -height / 2, width, height, 7);
  ctx.fill();
  ctx.stroke();

  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      const tile = plane.tiles[row][col];
      const tileX = -width / 2 + col * TILE_SIZE;
      const tileY = -height / 2 + row * TILE_SIZE;
      ctx.strokeStyle = "#293f4328";
      ctx.lineWidth = 1;
      ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
      if (tile) drawTile(ctx, tile, tileX, tileY);
    }
  }
  for (const player of players.filter((item) => item.teamId === team.id && !item.mountedTileId)) {
    const px = -width / 2 + (player.x + 0.5) * TILE_SIZE;
    const py = -height / 2 + (player.y + 0.5) * TILE_SIZE;
    ctx.fillStyle = COLORS[index % COLORS.length];
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#182b35";
    ctx.font = "10px system-ui";
    ctx.fillText(player.name, px, py - 10);
  }
  ctx.restore();

  ctx.fillStyle = "#182b35";
  ctx.textAlign = "center";
  ctx.font = "12px system-ui";
  ctx.fillText(team.name, x, y - height / 2 - 10);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - 45, y + height / 2 + 5, 90, 4);
  ctx.fillStyle = plane.health > 35 ? "#4aa57d" : "#d46954";
  ctx.fillRect(x - 45, y + height / 2 + 5, 90 * plane.health / plane.maxHealth, 4);
}

function drawWorld(ctx, state, canvas, pointer) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight);
  gradient.addColorStop(0, "#a9d3d8");
  gradient.addColorStop(1, "#e4d4ad");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const ownTeam = state.teams.find((team) => team.id === state.teamId);
  const camera = ownTeam ? ownTeam.plane : { x: 0, y: 0 };
  state.teams.forEach((team, index) => drawPlane(ctx, team, index, camera, canvas, state.players));

  for (const shot of state.projectiles) {
    ctx.fillStyle = "#fff2a6";
    ctx.beginPath();
    ctx.arc(
      canvas.clientWidth / 2 + (shot.x - camera.x) * TILE_SIZE,
      canvas.clientHeight / 2 + (shot.y - camera.y) * TILE_SIZE,
      4, 0, Math.PI * 2,
    );
    ctx.fill();
  }
  if (ownTeam && pointer.inside) {
    const tile = screenToTile(pointer.x, pointer.y, canvas, ownTeam.plane);
    const x = canvas.clientWidth / 2 + (ownTeam.plane.x - camera.x) * TILE_SIZE;
    const y = canvas.clientHeight / 2 + (ownTeam.plane.y - camera.y) * TILE_SIZE;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ownTeam.plane.angle);
    ctx.strokeStyle = "#bd762b";
    ctx.strokeRect(
      (Math.round(tile.x) - (WIDTH - 1) / 2) * TILE_SIZE - TILE_SIZE / 2,
      (Math.round(tile.y) - (HEIGHT - 1) / 2) * TILE_SIZE - TILE_SIZE / 2,
      TILE_SIZE, TILE_SIZE,
    );
    ctx.restore();
  }
}

export { drawWorld, screenToTile, TILE_SIZE };
