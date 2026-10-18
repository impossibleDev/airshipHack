const { GRID_HEIGHT, GRID_WIDTH } = require("../constants");

function getTile(team, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  if (y < 0 || y >= GRID_HEIGHT || x < 0 || x >= GRID_WIDTH) return null;
  return team.plane.tiles[y][x];
}

function findTilePosition(team, tileId) {
  for (let y = 0; y < team.plane.tiles.length; y++) {
    const x = team.plane.tiles[y].findIndex((tile) => tile?.id === tileId);
    if (x !== -1) return { x, y, tile: team.plane.tiles[y][x] };
  }
  return null;
}

module.exports = { findTilePosition, getTile };
