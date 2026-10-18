const assert = require("node:assert/strict");
const test = require("node:test");
const CapturePoint = require("../server/capture-point");
const Game = require("../server/game");
const Team = require("../server/team");

// Create a game with the minimal broadcast interface needed by simulation tests.
function createGame() {
  return new Game({ emit() {} });
}

// Random objective placement must stay within the circular world boundary.
test("capture points spawn inside the circular map", () => {
  const game = createGame();
  const distance = Math.hypot(
    game.capturePoint.x - game.arena.x,
    game.capturePoint.y - game.arena.y,
  );

  assert.ok(distance <= game.arena.radius - game.capturePoint.radius);
});

// A single crew holding the point for its full duration earns the reward.
test("holding a capture point awards 50 score and moves the point", () => {
  const game = createGame();
  const team = new Team("Crew", 0);
  game.teams.set(team.id, team);
  const oldPoint = game.capturePoint.snapshot();
  team.plane.x = oldPoint.x;
  team.plane.y = oldPoint.y;

  for (let tick = 0; tick < 59; tick++) game.update();
  assert.equal(team.score, 0);

  game.update();
  assert.equal(team.score, 50);
  assert.notDeepEqual(game.capturePoint, oldPoint);
});

// Multiple crews in range contest the objective and prevent progress.
test("contested capture points do not award score", () => {
  const game = createGame();
  const point = game.capturePoint;
  const firstTeam = new Team("First", 0);
  const secondTeam = new Team("Second", 1);
  firstTeam.plane.x = point.x;
  firstTeam.plane.y = point.y;
  secondTeam.plane.x = point.x + 1;
  secondTeam.plane.y = point.y;
  game.teams.set(firstTeam.id, firstTeam);
  game.teams.set(secondTeam.id, secondTeam);

  for (let tick = 0; tick < 80; tick++) game.update();

  assert.equal(firstTeam.score, 0);
  assert.equal(secondTeam.score, 0);
  assert.equal(game.capturePoint.progress, 0);
});
