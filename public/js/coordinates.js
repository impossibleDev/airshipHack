const TILE_SIZE = 48;
const GRID_WIDTH = 9;
const GRID_HEIGHT = 5;

function screenToPlaneLocal(screenX, screenY, canvas, team) {
  if (!team) return { x: 0, y: 0 };
  const worldX = team.plane.x + (screenX - canvas.clientWidth / 2) / TILE_SIZE;
  const worldY = team.plane.y + (screenY - canvas.clientHeight / 2) / TILE_SIZE;
  const dx = worldX - team.plane.x;
  const dy = worldY - team.plane.y;
  const cos = Math.cos(team.plane.angle);
  const sin = Math.sin(team.plane.angle);
  return {
    x: dx * cos + dy * sin + (GRID_WIDTH - 1) / 2,
    y: -dx * sin + dy * cos + (GRID_HEIGHT - 1) / 2,
  };
}

export { GRID_HEIGHT, GRID_WIDTH, screenToPlaneLocal, TILE_SIZE };
