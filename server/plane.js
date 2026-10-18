const { randomInt, randomUUID } = require("node:crypto");
const { createTile, TILE_COSTS } = require("./tiles");

const WIDTH = 5;
const HEIGHT = 3;
const HALF_WIDTH = WIDTH / 2;
const HALF_HEIGHT = HEIGHT / 2;
const COLLISION_SEPARATION = 0.001;

// Shared flight and on-deck movement tuning.
const TURN_SPEED = 1.7;
const THRUST_ACCELERATION = 6;
const DRAG = 0.98;
const MAX_SPEED = 8;
const PLAYER_WALK_SPEED = 3;

// Owns one airship's movement, tile grid, health, and resources.
class Plane {
  // Create a plane at its crew's spawn slot with the required starter stations.
  constructor(index = 0) {
    this.id = randomUUID();
    this.skin = randomInt(1, 4);
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

  // Return a tile only for an integer coordinate within the ship's grid.
  getTile(x, y) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return null;
    return this.tiles[y][x];
  }

  // Find a mounted station by its unique tile id.
  findTile(id) {
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const tile = this.tiles[y][x];
        if (tile?.id === id) return { tile, x, y };
      }
    }
    return null;
  }

  // Ship controls and weapons require at least one running generator.
  hasPower() {
    return this.tiles.flat().some((tile) => tile?.type === "generator" && !tile.broken);
  }

  // Reflect a swept pellet from the first wall it crosses, removing walls after ten hits.
  receiveProjectile(projectile) {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const toLocal = (x, y) => ({
      x: (x - this.x) * cos + (y - this.y) * sin + (WIDTH - 1) / 2,
      y: -(x - this.x) * sin + (y - this.y) * cos + (HEIGHT - 1) / 2,
    });
    const start = toLocal(projectile.previousX, projectile.previousY);
    const end = toLocal(projectile.x, projectile.y);
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    let hit = null;

    for (let row = 0; row < HEIGHT; row++) {
      for (let col = 0; col < WIDTH; col++) {
        const wall = this.tiles[row][col];
        if (wall?.type !== "wall") continue;

        let entry = 0;
        let exit = 1;
        let normalX = 0;
        let normalY = 0;
        for (const [position, delta, minimum, maximum, axis] of [
          [start.x, deltaX, col - 0.5, col + 0.5, "x"],
          [start.y, deltaY, row - 0.5, row + 0.5, "y"],
        ]) {
          if (Math.abs(delta) < 1e-10) {
            if (position < minimum || position > maximum) {
              entry = Infinity;
              break;
            }
            continue;
          }

          let near = (minimum - position) / delta;
          let far = (maximum - position) / delta;
          let normal = -1;
          if (near > far) {
            [near, far] = [far, near];
            normal = 1;
          }
          if (near >= entry) {
            entry = near;
            normalX = axis === "x" ? normal : 0;
            normalY = axis === "y" ? normal : 0;
          }
          exit = Math.min(exit, far);
        }
        if (entry > exit || entry < 0 || entry > 1 || (!normalX && !normalY)) continue;
        if (!hit || entry < hit.entry) hit = { entry, normalX, normalY, wall, row, col };
      }
    }
    if (!hit) return false;

    hit.wall.durability -= 1;
    if (hit.wall.durability <= 0) this.tiles[hit.row][hit.col] = null;

    const hitX = start.x + deltaX * hit.entry;
    const hitY = start.y + deltaY * hit.entry;
    const worldNormalX = hit.normalX * cos - hit.normalY * sin;
    const worldNormalY = hit.normalX * sin + hit.normalY * cos;
    projectile.x = this.x + (hitX - (WIDTH - 1) / 2) * cos
      - (hitY - (HEIGHT - 1) / 2) * sin + worldNormalX * 0.01;
    projectile.y = this.y + (hitX - (WIDTH - 1) / 2) * sin
      + (hitY - (HEIGHT - 1) / 2) * cos + worldNormalY * 0.01;
    const normalSpeed = projectile.vx * worldNormalX + projectile.vy * worldNormalY;
    projectile.vx -= 2 * normalSpeed * worldNormalX;
    projectile.vy -= 2 * normalSpeed * worldNormalY;
    return true;
  }

  // Validate a placement and charge the crew before creating its tile.
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

  // Update ship systems, pilot-controlled flight, and walking crew members.
  update(dt, players, noticeTeam, arena = null) {
    const now = Date.now();
    for (const row of this.tiles) {
      for (const tile of row) {
        if (tile) tile.update(this, now, noticeTeam);
      }
    }

    const hasPower = this.hasPower();
    const pilot = this.tiles.flat().find((tile) => tile?.type === "pilot" && tile.mountedBy);
    const pilotPlayer = players.find((player) => player.id === pilot?.mountedBy);
    if (pilotPlayer && hasPower) {
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
    } else if (!hasPower) {
      this.vx = 0;
      this.vy = 0;
    }

    if (arena) arena.constrainPlane(this, Math.hypot(WIDTH / 2, HEIGHT / 2));

    // Convert local movement input through the ship's rotation into world motion.
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

  // Convert a tile coordinate into its rotated world-space position.
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

  // Test a world coordinate against the rotated rectangular hull.
  contains(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    const localX = dx * Math.cos(this.angle) + dy * Math.sin(this.angle);
    const localY = -dx * Math.sin(this.angle) + dy * Math.cos(this.angle);
    return Math.abs(localX) <= HALF_WIDTH && Math.abs(localY) <= HALF_HEIGHT;
  }

  // Separate overlapping hulls and return their closing speed before impact.
  collide(other) {
    const axes = [
      [Math.cos(this.angle), Math.sin(this.angle)],
      [-Math.sin(this.angle), Math.cos(this.angle)],
      [Math.cos(other.angle), Math.sin(other.angle)],
      [-Math.sin(other.angle), Math.cos(other.angle)],
    ];
    let minimumOverlap = Infinity;
    let collisionNormal = null;
    const centerX = other.x - this.x;
    const centerY = other.y - this.y;

    for (const [axisX, axisY] of axes) {
      const thisRadius = HALF_WIDTH * Math.abs(Math.cos(this.angle) * axisX + Math.sin(this.angle) * axisY)
        + HALF_HEIGHT * Math.abs(-Math.sin(this.angle) * axisX + Math.cos(this.angle) * axisY);
      const otherRadius = HALF_WIDTH * Math.abs(Math.cos(other.angle) * axisX + Math.sin(other.angle) * axisY)
        + HALF_HEIGHT * Math.abs(-Math.sin(other.angle) * axisX + Math.cos(other.angle) * axisY);
      const distance = centerX * axisX + centerY * axisY;
      const overlap = thisRadius + otherRadius - Math.abs(distance);
      if (overlap <= 0) return null;
      if (overlap < minimumOverlap) {
        minimumOverlap = overlap;
        const direction = distance < 0 ? -1 : 1;
        collisionNormal = [axisX * direction, axisY * direction];
      }
    }

    const [normalX, normalY] = collisionNormal;
    const correction = (minimumOverlap + COLLISION_SEPARATION) / 2;
    this.x -= normalX * correction;
    this.y -= normalY * correction;
    other.x += normalX * correction;
    other.y += normalY * correction;

    const relativeVelocityX = other.vx - this.vx;
    const relativeVelocityY = other.vy - this.vy;
    const closingSpeed = -(relativeVelocityX * normalX + relativeVelocityY * normalY);
    if (closingSpeed > 0) {
      const impulse = closingSpeed * 0.75;
      this.vx -= normalX * impulse;
      this.vy -= normalY * impulse;
      other.vx += normalX * impulse;
      other.vy += normalY * impulse;
    }
    return Math.max(0, closingSpeed);
  }

  // Return a network-safe copy of the plane and its tile grid.
  snapshot() {
    return {
      id: this.id,
      skin: this.skin,
      x: this.x,
      y: this.y,
      angle: this.angle,
      health: this.health,
      maxHealth: this.maxHealth,
      resources: this.resources,
      powered: this.hasPower(),
      tiles: this.tiles.map((row) => row.map((tile) => tile?.snapshot() || null)),
    };
  }
}

// Export the airship model.
module.exports = Plane;
