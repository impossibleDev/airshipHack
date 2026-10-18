const { randomUUID } = require("node:crypto");
const { createTile, TILE_COSTS } = require("./tiles");

const WIDTH = 9;
const HEIGHT = 5;

// Adjust these to tune how the plane handles.
const TURN_SPEED = 1.7;
const THRUST_ACCELERATION = 6;
const DRAG = 0.98;
const MAX_SPEED = 8;
const PLAYER_WALK_SPEED = 3;

class Plane {
  constructor(index = 0) {
    this.id = randomUUID();
    this.x = (index % 6) * 12;
    this.y = Math.floor(index / 6) * 12;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.resources = 100;
    this.tiles = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null));
    this.tiles[2][1] = createTile("pilot");
    this.tiles[2][2] = createTile("generator");
  }

  getTile(x, y) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return null;
    return this.tiles[y][x];
  }

  findTile(id) {
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const tile = this.tiles[y][x];
        if (tile?.id === id) return { tile, x, y };
      }
    }
    return null;
  }

  build(player, x, y, type, notice) {
    const cost = TILE_COSTS[type];
    if (!cost) return notice("Choose a tile from the build menu.");
    if (player.mountedTileId) return;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
      return notice("That placement is outside your plane.");
    }
    if (this.getTile(x, y)) return notice("That tile is already occupied.");
    if (this.resources < cost) return notice(`You need ${cost} resources to build a ${type}.`);
    this.resources -= cost;
    this.tiles[y][x] = createTile(type);
  }

  update(dt, players, noticeTeam) {
    const now = Date.now();
    for (const row of this.tiles) {
      for (const tile of row) {
        if (tile) tile.update(this, now, noticeTeam);
      }
    }

    const pilot = this.tiles.flat().find((tile) => tile?.type === "pilot" && tile.mountedBy);
    const pilotPlayer = players.find((player) => player.id === pilot?.mountedBy);
    if (pilotPlayer) {
      this.angle += (Number(pilotPlayer.input.turn) || 0) * TURN_SPEED * dt;
      const thrust = Number(pilotPlayer.input.thrust) || 0;
      this.vx += Math.cos(this.angle) * thrust * THRUST_ACCELERATION * dt;
      this.vy += Math.sin(this.angle) * thrust * THRUST_ACCELERATION * dt;
      this.vx *= DRAG;
      this.vy *= DRAG;
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > MAX_SPEED) {
        this.vx = (this.vx / speed) * MAX_SPEED;
        this.vy = (this.vy / speed) * MAX_SPEED;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    for (const player of players) {
      if (player.mountedTileId) continue;
      const moveX = Number(player.input.moveX) || 0;
      const moveY = Number(player.input.moveY) || 0;
      const localX = moveX * cos + moveY * sin;
      const localY = -moveX * sin + moveY * cos;
      player.x = Math.max(0, Math.min(WIDTH - 1, player.x + localX * dt * PLAYER_WALK_SPEED));
      player.y = Math.max(0, Math.min(HEIGHT - 1, player.y + localY * dt * PLAYER_WALK_SPEED));
    }
  }

  tileToWorld(x, y) {
    const localX = x - (WIDTH - 1) / 2;
    const localY = y - (HEIGHT - 1) / 2;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    return {
      x: this.x + localX * cos - localY * sin,
      y: this.y + localX * sin + localY * cos,
    };
  }

  contains(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    const localX = dx * Math.cos(this.angle) + dy * Math.sin(this.angle);
    const localY = -dx * Math.sin(this.angle) + dy * Math.cos(this.angle);
    return Math.abs(localX) <= WIDTH / 2 && Math.abs(localY) <= HEIGHT / 2;
  }

  snapshot() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: this.angle,
      health: this.health,
      maxHealth: this.maxHealth,
      resources: this.resources,
      tiles: this.tiles.map((row) => row.map((tile) => tile?.snapshot() || null)),
    };
  }
}

module.exports = Plane;
