const { EMPTY_TEAM_TIMEOUT_MS } = require("../game/constants");
const { fireTurret } = require("../game/combat");
const { createSnapshot } = require("../game/snapshot");
const { createTeam, findTeamByInvite } = require("../game/teams");
const { findTilePosition, interactWithTile, placeTile, sendNotice } = require("../game/tiles");

function registerSocketHandlers(io, gameState) {
  io.on("connection", (socket) => {
    socket.on("join", (payload = {}) => {
      if (gameState.players.has(socket.id)) {
        const player = gameState.players.get(socket.id);
        socket.emit("joined", {
          playerId: player.id,
          teamId: player.teamId,
          inviteCode: gameState.teams.get(player.teamId)?.inviteCode,
        });
        return;
      }

      const name = String(payload.name || "Pilot").trim().slice(0, 18) || "Pilot";
      let team = findTeamByInvite(gameState, payload.inviteCode);
      if (payload.inviteCode && !team) {
        socket.emit("join-error", "That team invitation code is not valid.");
        return;
      }
      if (!team) team = createTeam(gameState, name);
      clearTimeout(gameState.emptyTeamTimers.get(team.id));
      gameState.emptyTeamTimers.delete(team.id);

      const player = {
        id: socket.id,
        name,
        teamId: team.id,
        x: 2,
        y: 2,
        mountedTileId: null,
        input: {},
        lastShotAt: 0,
      };
      gameState.players.set(socket.id, player);
      socket.emit("joined", {
        playerId: socket.id,
        teamId: team.id,
        inviteCode: team.inviteCode,
      });
      io.emit("state", createSnapshot(gameState));
    });

    socket.on("input", (input = {}) => {
      const player = gameState.players.get(socket.id);
      if (!player) return;
      player.input = {
        thrust: Math.max(-1, Math.min(1, Number(input.thrust) || 0)),
        turn: Math.max(-1, Math.min(1, Number(input.turn) || 0)),
        moveX: Math.max(-1, Math.min(1, Number(input.moveX) || 0)),
        moveY: Math.max(-1, Math.min(1, Number(input.moveY) || 0)),
      };
    });

    socket.on("interact", (payload = {}) => {
      const player = gameState.players.get(socket.id);
      if (!player) return;
      const team = gameState.teams.get(player.teamId);
      if (!team) return;

      if (player.mountedTileId) {
        const position = findTilePosition(team, player.mountedTileId);
        if (position) interactWithTile(io, gameState, player, position.x, position.y);
        return;
      }
      const x = Number(payload.x);
      const y = Number(payload.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const tileX = Math.round(x);
      const tileY = Math.round(y);
      if (Math.hypot(player.x - tileX, player.y - tileY) > 1.35) {
        sendNotice(io, player, "Move closer to that tile to interact.");
        return;
      }
      interactWithTile(io, gameState, player, tileX, tileY);
    });

    socket.on("build", (payload = {}) => {
      const player = gameState.players.get(socket.id);
      if (player) placeTile(io, gameState, player, Number(payload.x), Number(payload.y), String(payload.type || ""));
    });

    socket.on("fire", (payload = {}) => {
      const player = gameState.players.get(socket.id);
      if (player) fireTurret(gameState, player, Number(payload.x), Number(payload.y));
    });

    socket.on("disconnect", () => {
      const player = gameState.players.get(socket.id);
      if (!player) return;

      const team = gameState.teams.get(player.teamId);
      if (team && player.mountedTileId) {
        const position = findTilePosition(team, player.mountedTileId);
        if (position) position.tile.mountedBy = null;
      }
      gameState.players.delete(socket.id);

      if (team && ![...gameState.players.values()].some((member) => member.teamId === team.id)) {
        const timer = setTimeout(() => {
          gameState.emptyTeamTimers.delete(team.id);
          if (![...gameState.players.values()].some((member) => member.teamId === team.id)) {
            gameState.teams.delete(team.id);
            io.emit("state", createSnapshot(gameState));
          }
        }, EMPTY_TEAM_TIMEOUT_MS);
        gameState.emptyTeamTimers.set(team.id, timer);
        timer.unref();
      }
      io.emit("state", createSnapshot(gameState));
    });
  });
}

module.exports = { registerSocketHandlers };
