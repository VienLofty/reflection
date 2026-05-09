// ─── Screen Management ────────────────────────────────────────────────────────

const ALL_SCREENS = [
  "screen-signin",
  "screen-signup",
  "screen-library",
  "screen-join-code",
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

// ─── Allow Enter key on auth + code input fields ────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("signin-password")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSignIn();
  });
  document.getElementById("signup-confirm")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSignUp();
  });
  document.getElementById("join-code-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitJoinCode();
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

load();
restoreSession();
