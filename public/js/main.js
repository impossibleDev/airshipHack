import { drawMiniMap, drawWorld, screenToTile } from "./plane.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const miniMap = document.getElementById("mini-map");
const miniMapCtx = miniMap.getContext("2d");
const socket = io();
const state = { teams: [], players: [], projectiles: [], playerId: null, teamId: null };
const keys = new Set();
const pointer = { x: 0, y: 0, inside: false };
const tileOptions = [
  ["turret", 35], ["wall", 10], ["generator", 50],
];
let selectedTile = "turret";
let pilotName = "";
let inviteCode = "";
let hasJoined = false;
let reconnecting = false;
let toastTimeout;

function ownTeam() {
  return state.teams.find((team) => team.id === state.teamId);
}

function ownPlayer() {
  return state.players.find((player) => player.id === state.playerId);
}

function notify(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2200);
}

function showJoinError(message) {
  document.getElementById("join-error").textContent = message;
}

document.getElementById("join-screen").addEventListener("submit", (event) => {
  event.preventDefault();
  pilotName = document.getElementById("pilot-name").value.trim();
  inviteCode = document.getElementById("invite-code").value.trim().toUpperCase();
  socket.emit("join", { name: pilotName, inviteCode });
});

for (const [type, cost] of tileOptions) {
  const button = document.createElement("button");
  button.className = `tile-option${type === selectedTile ? " selected" : ""}`;
  button.textContent = `${type} · ${cost}`;
  button.addEventListener("click", () => {
    selectedTile = type;
    document.querySelectorAll(".tile-option").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
  });
  document.getElementById("tile-options").append(button);
}

socket.on("connect", () => {
  if (hasJoined && !state.playerId) {
    reconnecting = true;
    socket.emit("join", { name: pilotName, inviteCode });
  }
});
socket.on("disconnect", () => {
  if (!hasJoined) return;
  state.playerId = null;
  state.teamId = null;
  state.players = [];
  document.getElementById("join-screen").classList.remove("hidden");
  notify("Disconnected. Reconnecting...");
});
socket.on("join-error", (message) => {
  if (reconnecting && inviteCode) {
    inviteCode = "";
    socket.emit("join", { name: pilotName, inviteCode });
    notify("Crew expired. Started a new crew.");
  } else {
    showJoinError(message);
  }
});
socket.on("joined", ({ playerId, teamId, inviteCode: code }) => {
  state.playerId = playerId;
  state.teamId = teamId;
  inviteCode = code;
  hasJoined = true;
  reconnecting = false;
  showJoinError("");
  document.getElementById("join-screen").classList.add("hidden");
});
socket.on("state", (next) => {
  Object.assign(state, next);
  updateHud();
});
socket.on("notice", notify);

function updateHud() {
  const team = ownTeam();
  const player = ownPlayer();
  if (!team) return;
  const members = state.players.filter((item) => item.teamId === team.id).length;
  document.getElementById("team-banner").textContent =
    `${team.name} · invite ${team.inviteCode} · ${members} ${members === 1 ? "player" : "players"}`;
  const leaderboard = document.getElementById("leaderboard-list");
  leaderboard.replaceChildren();
  for (const item of [...state.teams].sort((a, b) => b.score - a.score)) {
    const row = document.createElement("div");
    row.className = "crew-row";
    const name = document.createElement("span");
    name.textContent = item.name;
    const score = document.createElement("span");
    score.textContent = `${item.score} ★`;
    row.append(name, score);
    leaderboard.append(row);
  }
  const tile = player && team.plane.tiles.flat().find((item) => item?.id === player.mountedTileId);
  const role = tile?.type === "pilot" ? "piloting" : tile?.type === "turret" ? "turret" : "walking";
  document.getElementById("status-bar").textContent =
    `${role} · plane ${Math.ceil(team.plane.health)} HP · ${team.plane.resources} resources`;
}

function interact() {
  const player = ownPlayer();
  if (player) socket.emit("interact", { x: player.x, y: player.y });
}

function build() {
  const team = ownTeam();
  if (!team) return;
  const tile = screenToTile(pointer.x || canvas.clientWidth / 2, pointer.y || canvas.clientHeight / 2, canvas, team.plane);
  socket.emit("build", { x: Math.round(tile.x), y: Math.round(tile.y), type: selectedTile });
}

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.inside = true;
});
canvas.addEventListener("pointerleave", () => { pointer.inside = false; });
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const player = ownPlayer();
  const team = ownTeam();
  const tile = player && team && team.plane.tiles.flat().find((item) => item?.id === player.mountedTileId);
  if (tile?.type === "turret") {
    socket.emit("fire", screenToTile(pointer.x, pointer.y, canvas, team.plane));
  }
});
window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  const key = event.key.toLowerCase();
  keys.add(key);
  if (key === "e" && !event.repeat) interact();
  if (key === "f" && !event.repeat) build();
  if (key === "1") document.querySelectorAll(".tile-option")[0].click();
  if (key === "2") document.querySelectorAll(".tile-option")[1].click();
  if (key === "3") document.querySelectorAll(".tile-option")[2].click();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

setInterval(() => {
  const player = ownPlayer();
  const team = ownTeam();
  if (!player || !team) return;
  const station = team.plane.tiles.flat().find((tile) => tile?.id === player.mountedTileId);
  const input = { moveX: 0, moveY: 0, thrust: 0, turn: 0 };
  if (station?.type === "pilot") {
    input.thrust = Number(keys.has("w")) - Number(keys.has("s"));
    input.turn = Number(keys.has("d")) - Number(keys.has("a"));
  } else if (!station) {
    input.moveX = Number(keys.has("d")) - Number(keys.has("a"));
    input.moveY = Number(keys.has("s")) - Number(keys.has("w"));
  }
  socket.emit("input", input);
}, 50);

function resize() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = canvas.clientHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  miniMap.width = miniMap.clientWidth * ratio;
  miniMap.height = miniMap.clientHeight * ratio;
  miniMapCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function frame() {
  drawWorld(ctx, state, canvas, pointer);
  drawMiniMap(miniMapCtx, state, miniMap, canvas);
  requestAnimationFrame(frame);
}
frame();
