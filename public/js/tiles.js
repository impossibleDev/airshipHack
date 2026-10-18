const TILE_SIZE = 48;
const images = Object.fromEntries(
  Object.entries({
    turretBase: "/images/turretBase.png",
    turretHead: "/images/turretHead.png",
    pilot: "/images/pilotSeat.png",
    generator: "/images/generatorFixed.png",
    generatorBroken: "/images/generatorBroken.png",
  }).map(([name, src]) => {
    const image = new Image();
    image.src = src;
    return [name, image];
  }),
);

function drawImage(ctx, image, x, y) {
  if (!image.complete || !image.naturalWidth) return false;
  ctx.drawImage(image, x, y, TILE_SIZE, TILE_SIZE);
  return true;
}

function drawTile(ctx, tile, x, y, turretAngle = 0) {
  if (tile.type === "turret") {
    drawImage(ctx, images.turretBase, x, y);
    if (images.turretHead.complete && images.turretHead.naturalWidth) {
      ctx.save();
      ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
      ctx.rotate(turretAngle);
      ctx.drawImage(images.turretHead, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
      ctx.restore();
    }
    if (tile.mountedBy) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 19, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }

  const image = tile.type === "pilot"
    ? images.pilot
    : tile.type === "generator"
      ? (tile.broken ? images.generatorBroken : images.generator)
      : null;
  if (image && drawImage(ctx, image, x, y)) {
    if (tile.mountedBy) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 19, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }

  const colors = { pilot: "#f1c360", generator: tile.broken ? "#8a7271" : "#74b994", wall: "#7b8d94" };
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
