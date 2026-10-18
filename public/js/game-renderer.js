import { GRID_HEIGHT, GRID_WIDTH, screenToPlaneLocal, TILE_SIZE } from "./coordinates.js";

const COLORS = ["#e9ab54", "#db6f58", "#86a6e7", "#64bb9b", "#bd8ad1", "#d4a15d"];

function createGameRenderer(canvas, state, pointer) {
  const ctx = canvas.getContext("2d");

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * ratio);
    canvas.height = Math.floor(canvas.clientHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  function drawCloud(x, y, scale) {
    ctx.beginPath();
    ctx.ellipse(x, y, 44 * scale, 13 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 17 * scale, y - 5 * scale, 22 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 13 * scale, y - 8 * scale, 23 * scale, 17 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBackground(width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#a9d3d8");
    gradient.addColorStop(1, "#e4d4ad");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,.22)";
    for (let i = 0; i < 9; i++) {
      const x = ((i * 217 + 70) % (width + 160)) - 80;
      const y = 90 + ((i * 131) % Math.max(120, height - 170));
      drawCloud(x, y, 0.55 + (i % 3) * 0.18);
    }
  }

  function drawTile(tile, x, y) {
    const pad = 5;
    const colors = { pilot: "#f1c360", turret: "#e67854", generator: tile.broken ? "#8a7271" : "#74b994", wall: "#7b8d94" };
    ctx.fillStyle = colors[tile.type] || "#7b8d94";
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2, 7);
    ctx.fill();
    ctx.fillStyle = "#183440";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 19px sans-serif";
    const symbols = { pilot: "⌖", turret: "✦", generator: tile.broken ? "!" : "ϟ", wall: "▤" };
    ctx.fillText(symbols[tile.type], x + TILE_SIZE / 2, y + TILE_SIZE / 2);
    if (tile.mountedBy) {
      ctx.strokeStyle = "#fff6da";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 19, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (tile.type === "generator" && tile.broken) {
      ctx.fillStyle = "#a9443a";
      ctx.font = "600 8px 'DM Mono', monospace";
      ctx.fillText("BROKEN", x + TILE_SIZE / 2, y + TILE_SIZE - 2);
    }
  }

  function drawPlane(team, index, camera, width, height) {
    const plane = team.plane;
    const x = width / 2 + (plane.x - camera.x) * TILE_SIZE;
    const y = height / 2 + (plane.y - camera.y) * TILE_SIZE;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(plane.angle);
    const planeWidth = GRID_WIDTH * TILE_SIZE;
    const planeHeight = GRID_HEIGHT * TILE_SIZE;
    ctx.fillStyle = "rgba(23,47,57,.18)";
    ctx.beginPath();
    ctx.roundRect(-planeWidth / 2 + 5, -planeHeight / 2 + 7, planeWidth, planeHeight, 10);
    ctx.fill();
    ctx.fillStyle = "#ede8d9";
    ctx.strokeStyle = COLORS[index % COLORS.length];
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-planeWidth / 2, -planeHeight / 2, planeWidth, planeHeight, 9);
    ctx.fill();
    ctx.stroke();

    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        const tile = plane.tiles[row][col];
        const tileX = -planeWidth / 2 + col * TILE_SIZE;
        const tileY = -planeHeight / 2 + row * TILE_SIZE;
        ctx.strokeStyle = "rgba(41,63,67,.16)";
        ctx.lineWidth = 1;
        ctx.strokeRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        if (tile) drawTile(tile, tileX, tileY);
      }
    }
    for (const player of state.players.filter((item) => item.teamId === team.id && !item.mountedTileId)) {
      const px = -planeWidth / 2 + (player.x + .5) * TILE_SIZE;
      const py = -planeHeight / 2 + (player.y + .5) * TILE_SIZE;
      ctx.fillStyle = COLORS[index % COLORS.length];
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#17303d";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(player.name.slice(0, 10), px, py - 11);
    }
    ctx.restore();

    ctx.textAlign = "center";
    ctx.font = "600 12px 'Space Grotesk', sans-serif";
    ctx.fillStyle = "#203845";
    ctx.fillText(team.name, x, y - planeHeight / 2 - 16);
    const healthWidth = 110;
    ctx.fillStyle = "rgba(20,40,54,.24)";
    ctx.fillRect(x - healthWidth / 2, y + planeHeight / 2 + 8, healthWidth, 5);
    ctx.fillStyle = plane.health > 35 ? "#4aa57d" : "#d46954";
    ctx.fillRect(x - healthWidth / 2, y + planeHeight / 2 + 8, healthWidth * (plane.health / plane.maxHealth), 5);
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);
    drawBackground(width, height);
    const team = state.teams.find((item) => item.id === state.teamId);
    const camera = team ? { x: team.plane.x, y: team.plane.y } : { x: 0, y: 0 };
    state.teams.forEach((item, index) => drawPlane(item, index, camera, width, height));

    for (const shot of state.projectiles) {
      const x = width / 2 + (shot.x - camera.x) * TILE_SIZE;
      const y = height / 2 + (shot.y - camera.y) * TILE_SIZE;
      ctx.fillStyle = "#fff2a6";
      ctx.shadowColor = "#f0a650";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const player = state.players.find((item) => item.id === state.playerId);
    if (player && team && !player.mountedTileId && pointer.inside) {
      const local = screenToPlaneLocal(pointer.x, pointer.y, canvas, team);
      const px = width / 2 + (team.plane.x - camera.x) * TILE_SIZE;
      const py = height / 2 + (team.plane.y - camera.y) * TILE_SIZE;
      const tileCol = Math.round(local.x);
      const tileRow = Math.round(local.y);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(team.plane.angle);
      ctx.strokeStyle = "rgba(246,198,91,.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        (tileCol - (GRID_WIDTH - 1) / 2) * TILE_SIZE - TILE_SIZE / 2,
        (tileRow - (GRID_HEIGHT - 1) / 2) * TILE_SIZE - TILE_SIZE / 2,
        TILE_SIZE,
        TILE_SIZE,
      );
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
  return { resize };
}

export { createGameRenderer };
