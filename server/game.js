const { randomBytes, randomUUID } = require("node:crypto");
const Plane = require("./plane");

const TICK_MS = 50;
const EMPTY_TEAM_TIMEOUT_MS = 30_000;

class Game {
  constructor(io) {
    this.io = io;
    this.teams = new Map();
    this.players = new Map();
    this.projectiles = new Map();
    this.emptyTeamTimers = new Map();
  }

  start() {
    this.io.on("connection", (socket) => this.connect(socket));
    const timer = setInterval(() => this.update(), TICK_MS);
    timer.unref();
  }

  connect(socket) {
    socket.on("join", (details = {}) => this.join(socket, details || {}));
    socket.on("input", (input = {}) => this.setInput(socket, input || {}));
    socket.on("interact", (position = {}) => this.interact(socket, position || {}));
    socket.on("build", (position = {}) => this.build(socket, position || {}));
    socket.on("fire", (position = {}) => this.fire(socket, position || {}));
    socket.on("disconnect", () => this.disconnect(socket));
  }

  join(socket, { name, inviteCode } = {}) {
    const existing = this.players.get(socket.id);
    if (existing) {
      socket.emit("joined", this.joinInfo(existing));
      return;
    }

    const teamName = String(name || "Pilot").trim().slice(0, 18) || "Pilot";
    const code = String(inviteCode || "").trim().toUpperCase();
    let team = [...this.teams.values()].find((item) => item.inviteCode === code);
    if (code && !team) {
      socket.emit("join-error", "That team invitation code is not valid.");
      return;
    }
    if (!team) {
      team = {
        id: randomUUID(),
        name: `${teamName}'s crew`,
        inviteCode: randomBytes(3).toString("hex").toUpperCase(),
        score: 0,
        plane: new Plane(this.teams.size),
      };
      this.teams.set(team.id, team);
    }

    clearTimeout(this.emptyTeamTimers.get(team.id));
    this.emptyTeamTimers.delete(team.id);
    const player = {
      id: socket.id,
      name: teamName,
      teamId: team.id,
      x: 2,
      y: 2,
      mountedTileId: null,
      input: {},
      lastShotAt: 0,
    };
    this.players.set(socket.id, player);
    socket.emit("joined", this.joinInfo(player));
    this.broadcastState();
  }

  joinInfo(player) {
    return {
      playerId: player.id,
      teamId: player.teamId,
      inviteCode: this.teams.get(player.teamId)?.inviteCode,
    };
  }

  setInput(socket, input) {
    const player = this.players.get(socket.id);
    if (!player) return;
    player.input = {
      thrust: clamp(input.thrust),
      turn: clamp(input.turn),
      moveX: clamp(input.moveX),
      moveY: clamp(input.moveY),
    };
  }

  interact(socket, position) {
    const player = this.players.get(socket.id);
    const team = player && this.teams.get(player.teamId);
    if (!team) return;

    if (!player.mountedTileId) {
      const x = Math.round(Number(position.x));
      const y = Math.round(Number(position.y));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (Math.hypot(player.x - x, player.y - y) > 1.35) {
        this.notice(player, "Move closer to that tile to interact.");
        return;
      }
      const tile = team.plane.getTile(x, y);
      if (!tile) {
        this.notice(player, "There is no tile here to interact with.");
        return;
      }
      tile.interact(team.plane, player, x, y, (message) => this.notice(player, message));
      return;
    }

    const station = team.plane.findTile(player.mountedTileId);
    if (station) {
      station.tile.interact(
        team.plane,
        player,
        station.x,
        station.y,
        (message) => this.notice(player, message),
      );
    }
  }

  build(socket, position) {
    const player = this.players.get(socket.id);
    const team = player && this.teams.get(player.teamId);
    if (!team) return;
    team.plane.build(
      player,
      Number(position.x),
      Number(position.y),
      String(position.type || ""),
      (message) => this.notice(player, message),
    );
  }

  fire(socket, position) {
    const player = this.players.get(socket.id);
    const team = player && this.teams.get(player.teamId);
    if (!team || !player.mountedTileId || !Number.isFinite(Number(position.x)) || !Number.isFinite(Number(position.y))) return;
    const station = team.plane.findTile(player.mountedTileId);
    if (!station || station.tile.type !== "turret" || Date.now() - player.lastShotAt < 350) return;

    player.lastShotAt = Date.now();
    const start = team.plane.tileToWorld(station.x, station.y);
    const target = team.plane.tileToWorld(Number(position.x), Number(position.y));
    const angle = Math.atan2(target.y - start.y, target.x - start.x);
    this.projectiles.set(randomUUID(), {
      x: start.x,
      y: start.y,
      vx: Math.cos(angle) * 14,
      vy: Math.sin(angle) * 14,
      teamId: team.id,
      expiresAt: Date.now() + 2500,
    });
  }

  disconnect(socket) {
    const player = this.players.get(socket.id);
    if (!player) return;
    const team = this.teams.get(player.teamId);
    if (team && player.mountedTileId) {
      const station = team.plane.findTile(player.mountedTileId);
      if (station) station.tile.mountedBy = null;
    }
    this.players.delete(socket.id);

    if (team && ![...this.players.values()].some((member) => member.teamId === team.id)) {
      const timer = setTimeout(() => {
        this.emptyTeamTimers.delete(team.id);
        if (![...this.players.values()].some((member) => member.teamId === team.id)) {
          this.teams.delete(team.id);
          this.broadcastState();
        }
      }, EMPTY_TEAM_TIMEOUT_MS);
      timer.unref();
      this.emptyTeamTimers.set(team.id, timer);
    }
    this.broadcastState();
  }

  update() {
    const dt = TICK_MS / 1000;
    for (const team of this.teams.values()) {
      team.plane.update(
        dt,
        [...this.players.values()].filter((player) => player.teamId === team.id),
        (message) => {
          for (const player of this.players.values()) {
            if (player.teamId === team.id) this.notice(player, message);
          }
        },
      );
    }

    const now = Date.now();
    for (const [id, shot] of this.projectiles) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (now >= shot.expiresAt) {
        this.projectiles.delete(id);
        continue;
      }
      for (const team of this.teams.values()) {
        if (team.id !== shot.teamId && team.plane.health > 0 && team.plane.contains(shot.x, shot.y)) {
          team.plane.health = Math.max(0, team.plane.health - 8);
          if (team.plane.health === 0) {
            const attacker = this.teams.get(shot.teamId);
            if (attacker) attacker.score++;
          }
          this.projectiles.delete(id);
          break;
        }
      }
    }
    this.broadcastState();
  }

  broadcastState() {
    this.io.emit("state", {
      teams: [...this.teams.values()].map((team) => ({
        id: team.id,
        name: team.name,
        inviteCode: team.inviteCode,
        score: team.score,
        plane: team.plane.snapshot(),
      })),
      players: [...this.players.values()].map(({ id, name, teamId, x, y, mountedTileId }) => ({
        id, name, teamId, x, y, mountedTileId,
      })),
      projectiles: [...this.projectiles.values()].map(({ x, y, teamId }) => ({ x, y, teamId })),
    });
  }

  notice(player, message) {
    this.io.to(player.id).emit("notice", message);
  }
}

function clamp(value) {
  return Math.max(-1, Math.min(1, Number(value) || 0));
}

module.exports = Game;
