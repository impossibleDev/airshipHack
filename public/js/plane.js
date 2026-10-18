import { drawTile, TILE_SIZE } from "./tiles.js";

// Local airship dimensions and the palette used for crew indicators.
const WIDTH = 5;
const HEIGHT = 3;
const COLORS = ["#e9ab54", "#db6f58", "#86a6e7", "#64bb9b", "#bd8ad1", "#d4a15d"];
const deckImages = [1, 2, 3].map((skin) => {
  const image = new Image();
  image.src = `/images/planeDeck${skin}.png`;
  return image;
});
const cloudImages = [1, 2, 3].map((cloud) => {
  const image = new Image();
  image.src = `/images/cloud${cloud}.png`;
  return image;
});
const cloudLayers = [
  { parallax: 0.12, opacity: 0.35, drift: 0.003 },
  { parallax: 0.28, opacity: 0.5, drift: 0.006 },
  { parallax: 0.5, opacity: 0.65, drift: 0.01 },
].map((layer) => ({
  ...layer,
  clouds: Array.from({ length: 18 }, () => ({
    x: Math.random(),
    y: Math.random(),
    image: cloudImages[Math.floor(Math.random() * cloudImages.length)],
  })),
}));

function wrap(value, length) {
  return ((value % length) + length) % length;
}

// Draw persistent randomized cloud fields with a different camera rate per depth.
function drawCloudBackground(ctx, canvas, camera) {
  const width = Math.max(canvas.clientWidth * 2, 1800);
  const height = Math.max(canvas.clientHeight * 2, 1200);
  const now = performance.now();

  for (const layer of cloudLayers) {
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    for (const cloud of layer.clouds) {
      if (!cloud.image.complete || !cloud.image.naturalWidth) continue;
      const x = wrap(cloud.x * width - camera.x * TILE_SIZE * layer.parallax + now * layer.drift, width);
      const y = wrap(cloud.y * height - camera.y * TILE_SIZE * layer.parallax + now * layer.drift * 0.35, height);
      for (const offsetX of [-width, 0, width]) {
        for (const offsetY of [-height, 0, height]) {
          ctx.drawImage(cloud.image, x + offsetX, y + offsetY);
        }
      }
    }
    ctx.restore();
  }
}

// Convert a canvas point into a tile coordinate, undoing the plane's rotation.
function screenToTile(x, y, canvas, plane) {
  const dx = (x - canvas.clientWidth / 2) / TILE_SIZE;
  const dy = (y - canvas.clientHeight / 2) / TILE_SIZE;
  return {
    x: dx * Math.cos(plane.angle) + dy * Math.sin(plane.angle) + (WIDTH - 1) / 2,
    y: -dx * Math.sin(plane.angle) + dy * Math.cos(plane.angle) + (HEIGHT - 1) / 2,
  };
}

// Render one crew's ship, its tiles, walking players, label, and health bar.
function drawPlane(ctx, team, index, camera, canvas, players, pointer, playerId, ownTeamId) {
  const plane = team.plane;
  const deckImage = deckImages[plane.skin - 1] || deckImages[0];
  const x = canvas.clientWidth / 2 + (plane.x - camera.x) * TILE_SIZE;
  const y = canvas.clientHeight / 2 + (plane.y - camera.y) * TILE_SIZE;
  const width = WIDTH * TILE_SIZE;
  const height = HEIGHT * TILE_SIZE;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(plane.angle);
  if (deckImage.complete && deckImage.naturalWidth) {
    ctx.drawImage(deckImage, -width / 2, -height / 2, width, height);
  } else {
    ctx.fillStyle = "#ede8d9";
    ctx.fillRect(-width / 2, -height / 2, width, height);
  }

  // Only the local crew needs a live aim target for its mounted turret.
  const localAim = team.id === ownTeamId && pointer.inside
    ? screenToTile(pointer.x, pointer.y, canvas, plane)
    : null;
  const controlledTurretId = players.find(
    (player) => player.id === playerId && player.mountedTileId,
  )?.mountedTileId;

  // Draw each grid cell and its installed tile in the ship's local coordinates.
  for (let row = 0; row < HEIGHT; row++) {
    for (let col = 0; col < WIDTH; col++) {
      const tile = plane.tiles[row][col];
      const tileX = -width / 2 + col * TILE_SIZE;
      const tileY = -height / 2 + row * TILE_SIZE;
      ctx.strokeStyle = "#293f4328";
      ctx.lineWidth = 1;
      ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
      if (tile) {
        const turretAngle = tile.id === controlledTurretId && localAim
          ? Math.atan2(localAim.y - row - 0.5, localAim.x - col - 0.5)
          : 0;
        drawTile(ctx, tile, tileX, tileY, turretAngle);
      }
    }
  }
  // Walking crew members are positioned relative to the ship deck.
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

// Draw the arena, all crews, the objective, projectiles, and the build target.
function drawWorld(ctx, state, canvas, pointer) {
  ctx.fillStyle = "#7da9b4";
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const ownTeam = state.teams.find((team) => team.id === state.teamId);
  const camera = ownTeam ? ownTeam.plane : { x: 0, y: 0 };
  // Clip the playable background visually to the server-defined circular arena.
  if (state.mapCircle) {
    const circle = state.mapCircle;
    const x = canvas.clientWidth / 2 + (circle.x - camera.x) * TILE_SIZE;
    const y = canvas.clientHeight / 2 + (circle.y - camera.y) * TILE_SIZE;
    const radius = circle.radius * TILE_SIZE;
    const gradient = ctx.createLinearGradient(0, y - radius, 0, y + radius);
    gradient.addColorStop(0, "#a9d3d8");
    gradient.addColorStop(1, "#e4d4ad");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  drawCloudBackground(ctx, canvas, camera);

  // Render teams in world coordinates relative to the local crew's camera.
  state.teams.forEach((team, index) =>
    drawPlane(ctx, team, index, camera, canvas, state.players, pointer, state.playerId, state.teamId),
  );

  // Draw active shots before overlays so objective indicators remain visible.
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
  // Show the capture radius and team-colored progress ring.
  if (state.capturePoint) {
    const point = state.capturePoint;
    const x = canvas.clientWidth / 2 + (point.x - camera.x) * TILE_SIZE;
    const y = canvas.clientHeight / 2 + (point.y - camera.y) * TILE_SIZE;
    ctx.save();
    ctx.fillStyle = "#e9ab5422";
    ctx.strokeStyle = "#bd762b";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(x, y, point.radius * TILE_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f2b54a";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fffef0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
    if (point.progress > 0) {
      const teamIndex = state.teams.findIndex((team) => team.id === point.capturingTeamId);
      ctx.strokeStyle = COLORS[(teamIndex < 0 ? 0 : teamIndex) % COLORS.length];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * point.progress);
      ctx.stroke();
    }
    ctx.fillStyle = "#182b35";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("CAPTURE · +150", x, y - 20);
    ctx.restore();
  }
  // Outline the map edge over the arena background and other world objects.
  if (state.mapCircle) {
    const circle = state.mapCircle;
    const x = canvas.clientWidth / 2 + (circle.x - camera.x) * TILE_SIZE;
    const y = canvas.clientHeight / 2 + (circle.y - camera.y) * TILE_SIZE;
    ctx.save();
    ctx.strokeStyle = "#183d4b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, circle.radius * TILE_SIZE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#f7e9c8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, circle.radius * TILE_SIZE - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // Preview the tile cell that a build command will target.
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

// Draw a top-down overview scaled to the minimap's circular viewport.
function drawMiniMap(ctx, state, miniMap, gameCanvas) {
  const width = miniMap.clientWidth;
  const height = miniMap.clientHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#183d4b";
  ctx.fillRect(0, 0, width, height);

  const circle = state.mapCircle;
  if (!circle) return;

  const radius = Math.min((width - 12) / 2, (height - 12) / 2);
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = radius / circle.radius;
  const mapX = (x) => centerX + (x - circle.x) * scale;
  const mapY = (y) => centerY + (y - circle.y) * scale;

  // Clip grid lines and markers to the circle so nothing leaks outside the map.
  ctx.fillStyle = "#b9d4ca";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "#426b6b55";
  ctx.lineWidth = 1;
  for (let x = Math.ceil((circle.x - circle.radius) / 12) * 12; x < circle.x + circle.radius; x += 12) {
    ctx.beginPath();
    ctx.moveTo(mapX(x), centerY - radius);
    ctx.lineTo(mapX(x), centerY + radius);
    ctx.stroke();
  }
  for (let y = Math.ceil((circle.y - circle.radius) / 12) * 12; y < circle.y + circle.radius; y += 12) {
    ctx.beginPath();
    ctx.moveTo(centerX - radius, mapY(y));
    ctx.lineTo(centerX + radius, mapY(y));
    ctx.stroke();
  }

  // Outline the portion of the world currently visible in the main canvas.
  const ownTeam = state.teams.find((team) => team.id === state.teamId);
  if (ownTeam) {
    const viewWidth = gameCanvas.clientWidth / TILE_SIZE;
    const viewHeight = gameCanvas.clientHeight / TILE_SIZE;
    ctx.strokeStyle = "#fffef0";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mapX(ownTeam.plane.x - viewWidth / 2),
      mapY(ownTeam.plane.y - viewHeight / 2),
      viewWidth * scale,
      viewHeight * scale,
    );
  }

  // Place the capture objective and its current progress ring.
  if (state.capturePoint) {
    const point = state.capturePoint;
    const pointX = mapX(point.x);
    const pointY = mapY(point.y);
    ctx.strokeStyle = "#bd762b";
    ctx.fillStyle = "#f2b54a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pointX, pointY, Math.max(3, point.radius * scale), 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pointX, pointY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (point.progress > 0) {
      const teamIndex = state.teams.findIndex((team) => team.id === point.capturingTeamId);
      ctx.strokeStyle = COLORS[(teamIndex < 0 ? 0 : teamIndex) % COLORS.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pointX, pointY, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * point.progress);
      ctx.stroke();
    }
  }

  // Draw crew arrows using plane heading and highlight the local crew.
  state.teams.forEach((team, index) => {
    const plane = team.plane;
    ctx.save();
    ctx.translate(mapX(plane.x), mapY(plane.y));
    ctx.rotate(plane.angle);
    ctx.fillStyle = COLORS[index % COLORS.length];
    ctx.strokeStyle = team.id === state.teamId ? "#fffef0" : "#183d4b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-4, -3.5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-4, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

// Share rendering and coordinate helpers with the game controller.
export { drawMiniMap, drawWorld, screenToTile, TILE_SIZE };
