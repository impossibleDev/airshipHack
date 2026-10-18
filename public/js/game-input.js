import { screenToPlaneLocal } from "./coordinates.js";

function createGameInput(canvas, state, socket, ui) {
  const keys = new Set();
  const pointer = { x: 0, y: 0, inside: false };

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.inside = true;
  }

  function interact() {
    const player = state.players.find((item) => item.id === state.playerId);
    if (!player) return;
    if (player.mountedTileId) {
      socket.emit("interact", {});
      return;
    }
    socket.emit("interact", { x: player.x, y: player.y });
  }

  function build() {
    const team = state.teams.find((item) => item.id === state.teamId);
    const point = screenToPlaneLocal(
      pointer.x || canvas.clientWidth / 2,
      pointer.y || canvas.clientHeight / 2,
      canvas,
      team,
    );
    socket.emit("build", {
      x: Math.round(point.x),
      y: Math.round(point.y),
      type: ui.selectedTile(),
    });
  }

  canvas.addEventListener("pointermove", canvasPoint);
  canvas.addEventListener("pointerleave", () => { pointer.inside = false; });
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    canvasPoint(event);
    const team = state.teams.find((item) => item.id === state.teamId);
    const player = state.players.find((item) => item.id === state.playerId);
    if (!player || !team) return;
    const mountedTile = team.plane.tiles.flat().find((tile) => tile?.id === player.mountedTileId);
    if (mountedTile?.type === "turret") {
      socket.emit("fire", screenToPlaneLocal(pointer.x, pointer.y, canvas, team));
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
    keys.add(key);
    if (key === "e" && !event.repeat) interact();
    if (key === "f" && !event.repeat) build();
    if (key === "1") ui.selectTile("turret");
    if (key === "2") ui.selectTile("wall");
    if (key === "3") ui.selectTile("generator");
  });
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  for (const button of document.querySelectorAll("[data-key]")) {
    const key = button.dataset.key;
    button.addEventListener("pointerdown", (event) => { event.preventDefault(); keys.add(key); });
    for (const type of ["pointerup", "pointerleave", "pointercancel"]) {
      button.addEventListener(type, () => keys.delete(key));
    }
  }
  document.getElementById("touch-interact").addEventListener("click", interact);

  const inputTimer = setInterval(() => {
    const player = state.players.find((item) => item.id === state.playerId);
    const team = state.teams.find((item) => item.id === state.teamId);
    if (!player || !team) return;
    const mounted = team.plane.tiles.flat().find((tile) => tile?.id === player.mountedTileId);
    const input = { moveX: 0, moveY: 0, thrust: 0, turn: 0 };
    if (mounted?.type === "pilot") {
      input.thrust = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
      input.turn = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    } else if (!mounted) {
      input.moveX = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      input.moveY = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
    }
    socket.emit("input", input);
  }, 50);

  return {
    pointer,
    dispose() {
      clearInterval(inputTimer);
    },
  };
}

export { createGameInput };
