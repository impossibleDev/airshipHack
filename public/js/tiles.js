const TILE_SIZE = 48;

function drawTile(ctx, tile, x, y) {
  const colors = { pilot: "#f1c360", turret: "#e67854", generator: tile.broken ? "#8a7271" : "#74b994", wall: "#7b8d94" };
  const symbols = { pilot: "⌖", turret: "✦", generator: tile.broken ? "!" : "ϟ", wall: "▤" };
  ctx.fillStyle = colors[tile.type] || "#7b8d94";
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10, 5);
  ctx.fill();
  ctx.fillStyle = "#183440";
  ctx.font = "bold 19px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbols[tile.type] || "?", x + TILE_SIZE / 2, y + TILE_SIZE / 2);
  if (tile.mountedBy) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 19, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export { drawTile, TILE_SIZE };
