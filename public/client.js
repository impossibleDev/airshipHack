import { createGameInput } from "./js/game-input.js";
import { createGameRenderer } from "./js/game-renderer.js";
import { createGameUI } from "./js/game-ui.js";

const socket = io();
const canvas = document.getElementById("game");
const state = {
  teams: [],
  players: [],
  projectiles: [],
  playerId: null,
  teamId: null,
  pilotName: "",
  inviteCode: "",
  hasJoined: false,
  reconnecting: false,
};

let selectedTile = "turret";
const ui = createGameUI(
  (credentials) => {
    state.pilotName = credentials.name.trim() || "Pilot";
    state.inviteCode = credentials.inviteCode.trim().toUpperCase();
    socket.emit("join", { name: state.pilotName, inviteCode: state.inviteCode });
  },
  (type) => { selectedTile = type; },
);
const input = createGameInput(canvas, state, socket, {
  ...ui,
  selectedTile: () => selectedTile,
});
createGameRenderer(canvas, state, input.pointer);

socket.on("connect", () => {
  if (!state.hasJoined || state.playerId) return;
  state.reconnecting = true;
  socket.emit("join", { name: state.pilotName, inviteCode: state.inviteCode });
});

socket.on("disconnect", () => {
  if (!state.hasJoined) return;
  state.playerId = null;
  state.teamId = null;
  state.players = [];
  ui.showJoinScreen();
  ui.showToast("Connection lost. Reconnecting…");
});

socket.on("join-error", (message) => {
  if (state.reconnecting && state.inviteCode) {
    state.inviteCode = "";
    ui.showToast("Your crew expired while disconnected. Starting a new crew.");
    socket.emit("join", { name: state.pilotName, inviteCode: "" });
    return;
  }
  ui.showJoinError(message);
});

socket.on("joined", ({ playerId, teamId, inviteCode }) => {
  state.playerId = playerId;
  state.teamId = teamId;
  state.inviteCode = inviteCode;
  state.hasJoined = true;
  state.reconnecting = false;
  ui.hideJoinScreen();
  ui.showJoinError("");
});

socket.on("state", (next) => {
  state.teams = next.teams;
  state.players = next.players;
  state.projectiles = next.projectiles;
  ui.updateHud(state);
});

socket.on("notice", ui.showToast);
