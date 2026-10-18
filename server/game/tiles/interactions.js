const { getTile } = require("./grid");

function sendNotice(io, player, message) {
  io.to(player.id).emit("notice", message);
}

function interactWithTile(io, gameState, player, tileX, tileY) {
  const team = gameState.teams.get(player.teamId);
  if (!team) return;
  const tile = getTile(team, tileX, tileY);
  if (!tile) {
    sendNotice(io, player, "There is no tile here to interact with.");
    return;
  }

  if (player.mountedTileId) {
    if (player.mountedTileId !== tile.id) {
      sendNotice(io, player, "Press E near your station to leave it first.");
      return;
    }
    tile.mountedBy = null;
    player.mountedTileId = null;
    player.input = {};
    sendNotice(io, player, "You left the station.");
    return;
  }

  if (tile.type === "generator") {
    if (!tile.broken) {
      sendNotice(io, player, "The generator is running.");
      return;
    }
    const repairCost = 15;
    if (team.plane.resources < repairCost) {
      sendNotice(io, player, `Repairing the generator costs ${repairCost} resources.`);
      return;
    }
    team.plane.resources -= repairCost;
    tile.broken = false;
    tile.nextBreakAt = Date.now() + 35_000 + Math.random() * 20_000;
    tile.nextIncomeAt = Date.now() + 1_000;
    sendNotice(io, player, "Generator repaired. Production resumed.");
    return;
  }

  if (tile.type !== "pilot" && tile.type !== "turret") {
    sendNotice(io, player, "This tile has nothing to interact with.");
    return;
  }
  if (tile.mountedBy) {
    sendNotice(io, player, "Someone is already using that station.");
    return;
  }

  tile.mountedBy = player.id;
  player.mountedTileId = tile.id;
  player.x = tileX;
  player.y = tileY;
  sendNotice(io, player, tile.type === "pilot" ? "Pilot station occupied." : "Turret station occupied.");
}

module.exports = { interactWithTile, sendNotice };
