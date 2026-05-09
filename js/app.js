// ─── Screen Management ────────────────────────────────────────────────────────

const ALL_SCREENS = [
  "screen-landing",
  "screen-library",
  "screen-room",
  "screen-waiting-start",
  "screen-question",
  "screen-waiting-partner",
  "screen-compare",
  "screen-game-editor",
  "screen-question-editor",
];

function show(id) {
  ALL_SCREENS.forEach((s) => {
    const el = document.getElementById(s);
    if (el) el.classList.add("hidden");
  });
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

// ─── Landing Screen ───────────────────────────────────────────────────────────

function goToRoom() {
  const n = document.getElementById("name-input").value.trim();
  if (!n) {
    document.getElementById("name-input").focus();
    return;
  }
  state.name = n;
  save();
  showLibrary();
}

// Allow Enter key on name input
document.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("name-input");
  if (nameInput) {
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") goToRoom();
    });
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

load();
document.getElementById("name-input").value = state.name || "";
show("screen-landing");
