const { GRID_HEIGHT, GRID_WIDTH } = require("../constants");
const { createTile, TILE_COSTS } = require("./catalog");
const { getTile } = require("./grid");
const { sendNotice } = require("./interactions");

function placeTile(io, gameState, player, tileX, tileY, type) {
  const team = gameState.teams.get(player.teamId);
  if (!team || player.mountedTileId) return;
  if (!Object.hasOwn(TILE_COSTS, type)) {
    sendNotice(io, player, "Select a buildable tile first.");
    return;
  }
  if (!Number.isInteger(tileX) || !Number.isInteger(tileY) ||
      tileX < 0 || tileX >= GRID_WIDTH || tileY < 0 || tileY >= GRID_HEIGHT) {
    sendNotice(io, player, "That placement is outside your plane.");
    return;
  }
  if (getTile(team, tileX, tileY)) {
    sendNotice(io, player, "That tile is already occupied.");
    return;
  }
  const cost = TILE_COSTS[type];
  if (team.plane.resources < cost) {
    sendNotice(io, player, `You need ${cost} resources to build a ${type}.`);
    return;
  }

  team.plane.resources -= cost;
  team.plane.tiles[tileY][tileX] = createTile(type);
}

module.exports = { placeTile };
