const Arena = require("./arena");
const CapturePoint = require("./capture-point");
const Player = require("./player");
const Projectile = require("./projectile");
const Team = require("./team");

const TICK_MS = 50;
const EMPTY_TEAM_TIMEOUT_MS = 30_000;
// Score paid when a crew destroys an enemy plane.
const KILL_SCORE = 200;

// Coordinates multiplayer events and advances the authoritative game state.
class Game {
  // Create shared world state and the initial neutral capture objective.
  constructor(io) {
    this.io = io;
    this.teams = new Map();
    this.players = new Map();
    this.projectiles = new Map();
    this.emptyTeamTimers = new Map();
    this.arena = new Arena();
    this.capturePoint = new CapturePoint(this.arena, this.teams.values());
  }

  // Register connection handling and start the fixed-rate simulation loop.
  start() {
    this.io.on("connection", (socket) => this.connect(socket));
    const timer = setInterval(() => this.update(), TICK_MS);
    timer.unref();
  }

  // Bind one socket's incoming events to the corresponding game actions.
  connect(socket) {
    socket.on("join", (details = {}) => this.join(socket, details || {}));
    socket.on("input", (input = {}) => this.setInput(socket, input || {}));
    socket.on("interact", (position = {}) => this.interact(socket, position || {}));
    socket.on("build", (position = {}) => this.build(socket, position || {}));
    socket.on("fire", (position = {}) => this.fire(socket, position || {}));
    socket.on("disconnect", () => this.disconnect(socket));
  }

  // Validate a crew invitation and add the connecting pilot to a crew.
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
      team = new Team(teamName, this.teams.size);
      this.teams.set(team.id, team);
      this.arena.expandToInclude(team.plane.x, team.plane.y, 4);
      if (this.capturePoint.isNear(
        team.plane.x,
        team.plane.y,
        this.capturePoint.radius + CapturePoint.SPAWN_CLEARANCE,
      )) {
        this.capturePoint = this.createCapturePoint();
      }
    }

    clearTimeout(this.emptyTeamTimers.get(team.id));
    this.emptyTeamTimers.delete(team.id);
    const player = new Player(socket.id, teamName, team.id);
    this.players.set(socket.id, player);
    socket.emit("joined", this.joinInfo(player));
    this.broadcastState();
  }

  // Return the join response expected by the browser client.
  joinInfo(player) {
    return {
      playerId: player.id,
      teamId: player.teamId,
      inviteCode: this.teams.get(player.teamId)?.inviteCode,
    };
  }

  // Place a fresh objective using the current arena and crew locations.
  createCapturePoint() {
    return new CapturePoint(this.arena, this.teams.values());
  }

  // Store validated movement controls for the connected player.
  setInput(socket, input) {
    const player = this.players.get(socket.id);
    if (!player) return;
    player.setInput(input);
  }

  // Interact with a nearby ship tile or leave the player's current station.
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

  // Ask the player's crew plane to place a tile at the requested grid cell.
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

  // Fire only when the player is mounted at a ready turret.
  fire(socket, position) {
    const player = this.players.get(socket.id);
    const team = player && this.teams.get(player.teamId);
    if (!team || !player.mountedTileId || !Number.isFinite(Number(position.x)) || !Number.isFinite(Number(position.y))) return;
    const station = team.plane.findTile(player.mountedTileId);
    const now = Date.now();
    if (!station || station.tile.type !== "turret" || !player.canFire(now)) return;

    player.recordShot(now);
    const start = team.plane.tileToWorld(station.x, station.y);
    const target = team.plane.tileToWorld(Number(position.x), Number(position.y));
    const angle = Math.atan2(target.y - start.y, target.x - start.x);
    const projectile = new Projectile(start.x, start.y, angle, team.id);
    this.projectiles.set(projectile.id, projectile);
  }

  // Free the player's station and schedule removal of an empty crew.
  disconnect(socket) {
    const player = this.players.get(socket.id);
    if (!player) return;
    const team = this.teams.get(player.teamId);
    if (team) player.leaveStation(team.plane);
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

  // Advance planes, capture progress, and projectiles, then publish the state.
  update() {
    const dt = TICK_MS / 1000;
    for (const team of this.teams.values()) {
      team.update(
        dt,
        [...this.players.values()].filter((player) => player.teamId === team.id),
        this.arena,
        (message) => {
          for (const player of this.players.values()) {
            if (player.teamId === team.id) this.notice(player, message);
          }
        },
      );
    }

    this.updateCapturePoint(dt);

    // A destroyed plane awards points once; its later hits are ignored.
    const now = Date.now();
    for (const [id, shot] of this.projectiles) {
      if (!shot.update(dt, now, this.arena)) {
        this.projectiles.delete(id);
        continue;
      }
      for (const team of this.teams.values()) {
        if (team.id !== shot.teamId) {
          const destroyed = team.receiveProjectile(shot, 8);
          if (destroyed === null) continue;
          if (destroyed) {
            const attacker = this.teams.get(shot.teamId);
            if (attacker) attacker.awardScore(KILL_SCORE);
          }
          this.projectiles.delete(id);
          break;
        }
      }
    }
    this.broadcastState();
  }

  // Award completed captures and relocate the objective for the next round.
  updateCapturePoint(dt) {
    const team = this.capturePoint.update(this.teams.values(), dt);
    if (!team) return;

    team.awardScore(CapturePoint.SCORE);
    for (const player of this.players.values()) {
      if (player.teamId === team.id) {
        this.notice(player, `Capture point secured! +${CapturePoint.SCORE} score.`);
      }
    }
    this.capturePoint = this.createCapturePoint();
  }

  // Send serializable entity snapshots rather than server-side objects.
  broadcastState() {
    this.io.emit("state", {
      mapCircle: this.arena.snapshot(),
      capturePoint: this.capturePoint.snapshot(),
      teams: [...this.teams.values()].map((team) => team.snapshot()),
      players: [...this.players.values()].map((player) => player.snapshot()),
      projectiles: [...this.projectiles.values()].map((projectile) => projectile.snapshot()),
    });
  }

  // Send a private status message to one player.
  notice(player, message) {
    this.io.to(player.id).emit("notice", message);
  }
}

// Export the game coordinator for the server entry point.
module.exports = Game;
