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

// ─── Profile Sidebar ───────────────────────────────────────────────────────────

function toggleProfileSidebar() {
  const sidebar = document.getElementById("screen-profile");
  if (!sidebar) return;
  sidebar.classList.toggle("hidden");
  if (!sidebar.classList.contains("hidden")) {
    document.getElementById("profile-name").textContent = state.name || "User";
    document.getElementById("profile-email").textContent = localStorage.getItem("ref_user_email") || "";
    document.getElementById("dark-mode-toggle").checked = document.documentElement.getAttribute("data-dark-mode") === "true";
  }
}

function toggleDarkMode(event) {
  const isDark = event.target.checked;
  if (isDark) {
    document.documentElement.setAttribute("data-dark-mode", "true");
    localStorage.setItem("ref_dark_mode", "true");
  } else {
    document.documentElement.removeAttribute("data-dark-mode");
    localStorage.removeItem("ref_dark_mode");
  }
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
// Initialize dark mode from localStorage
if (localStorage.getItem("ref_dark_mode") === "true") {
  document.documentElement.setAttribute("data-dark-mode", "true");
}
load();
restoreSession();
