const { randomBytes, randomUUID } = require("node:crypto");
const { GRID_HEIGHT, GRID_WIDTH } = require("./constants");
const { createTile } = require("./tiles/catalog");

function createGrid() {
  const grid = Array.from({ length: GRID_HEIGHT }, () =>
    Array(GRID_WIDTH).fill(null),
  );
  grid[2][1] = createTile("pilot");
  grid[2][2] = createTile("generator", { initialGenerator: true });
  return grid;
}

function createTeam(gameState, name) {
  const id = randomUUID();
  const team = {
    id,
    name: `${name}'s crew`,
    inviteCode: randomBytes(3).toString("hex").toUpperCase(),
    score: 0,
    plane: {
      id: randomUUID(),
      x: (gameState.teams.size % 6) * 12,
      y: Math.floor(gameState.teams.size / 6) * 12,
      angle: 0,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      resources: 100,
      tiles: createGrid(),
    },
  };
  gameState.teams.set(id, team);
  return team;
}

function findTeamByInvite(gameState, inviteCode) {
  const normalized = String(inviteCode || "").trim().toUpperCase();
  if (!normalized) return null;
  return [...gameState.teams.values()].find((team) => team.inviteCode === normalized) || null;
}

module.exports = { createTeam, findTeamByInvite };
