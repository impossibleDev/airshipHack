const BUILD_ITEMS = [
  { type: "turret", label: "Turret", cost: 35, icon: "✦" },
  { type: "wall", label: "Wall", cost: 10, icon: "▰" },
  { type: "generator", label: "Generator", cost: 50, icon: "⚡" },
];
const COLORS = ["#e9ab54", "#db6f58", "#86a6e7", "#64bb9b", "#bd8ad1", "#d4a15d"];

function createGameUI(onJoin, onSelectTile) {
  const joinScreen = document.getElementById("join-screen");
  const joinError = document.getElementById("join-error");
  const tileOptions = document.getElementById("tile-options");
  const statusBar = document.getElementById("status-bar");
  const toast = document.getElementById("toast");
  const tileButtons = new Map();
  let selectedType = "turret";
  let toastTimeout = null;

  for (const item of BUILD_ITEMS) {
    const button = document.createElement("button");
    button.className = "tile-option";
    button.type = "button";
    button.innerHTML = `<span class="tile-icon">${item.icon}</span><span>${item.label}</span><span class="tile-cost">${item.cost}</span>`;
    button.addEventListener("click", () => selectTile(item.type));
    tileOptions.append(button);
    tileButtons.set(item.type, button);
  }
  selectTile(selectedType);

  document.getElementById("join-form").addEventListener("submit", (event) => {
    event.preventDefault();
    joinError.textContent = "";
    onJoin({
      name: document.getElementById("pilot-name").value,
      inviteCode: document.getElementById("invite-code").value,
    });
  });

  function selectTile(type) {
    selectedType = type;
    for (const [itemType, button] of tileButtons) button.classList.toggle("selected", itemType === type);
    onSelectTile(type);
  }

  function updateHud(state) {
    const team = state.teams.find((item) => item.id === state.teamId);
    if (!team) return;
    const player = state.players.find((item) => item.id === state.playerId);
    const members = state.players.filter((item) => item.teamId === team.id).length;
    document.getElementById("team-banner").textContent =
      `${team.name}  ·  INVITE ${team.inviteCode}  ·  ${members} PILOT${members === 1 ? "" : "S"}`;
    const rows = [...state.teams].sort((a, b) => b.score - a.score);
    const board = document.getElementById("leaderboard-list");
    board.replaceChildren();
    rows.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "crew-row";
      const dot = document.createElement("span");
      dot.className = "crew-dot";
      dot.style.background = COLORS[index % COLORS.length];
      const name = document.createElement("span");
      name.className = "crew-name";
      name.textContent = item.name;
      const count = state.players.filter((member) => member.teamId === item.id).length;
      const meta = document.createElement("span");
      meta.className = "crew-meta";
      meta.textContent = `${item.score} ★ · ${count}`;
      row.append(dot, name, meta);
      board.append(row);
    });
    const mountedTile = player && team.plane.tiles.flat().find((tile) => tile?.id === player.mountedTileId);
    const role = mountedTile ? (mountedTile.type === "pilot" ? "PILOTING" : "TURRET") : "ON DECK";
    statusBar.textContent = `${role}  ·  ${Math.ceil(team.plane.health)} / ${team.plane.maxHealth} PLANE HP  ·  ${team.plane.resources} RESOURCES`;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2400);
  }

  function showJoinError(message) {
    joinError.textContent = message;
  }

  function showJoinScreen() {
    joinScreen.classList.remove("hidden");
  }

  function hideJoinScreen() {
    joinScreen.classList.add("hidden");
  }

  return {
    hideJoinScreen,
    selectTile,
    selectedTile: () => selectedType,
    showJoinError,
    showJoinScreen,
    showToast,
    updateHud,
  };
}

export { createGameUI };
