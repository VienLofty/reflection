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
  "screen-history",
  "screen-templates",
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
    document.getElementById("dark-mode-toggle").checked =
      document.documentElement.getAttribute("data-dark-mode") === "true";
  }
}

async function showHistory() {
  show("screen-history");
  const list = document.getElementById("history-list");
  list.innerHTML = '<p style="font-size:13px;color:var(--stone)">Loading…</p>';
  const entries = await fbLoadHistory();
  if (!entries.length) {
    list.innerHTML = '<p style="font-size:13px;color:var(--stone)">No saved sessions yet.</p>';
    return;
  }
  list.innerHTML = "";
  entries.forEach((e) => {
    const dt = new Date(e.savedAt);
    const date = dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    const time = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const div = document.createElement("div");
    div.className = "game-card";
    div.innerHTML = `
      <div class="game-card-title">${esc(e.gameName)}</div>
      <div style="font-size:12px;color:var(--stone);margin-top:4px">${esc(e.nameA)} &amp; ${esc(e.nameB)}</div>
      <div style="font-size:11px;color:var(--stone);margin-top:2px">${date} &middot; ${time}</div>
    `;
    div.onclick = () => viewHistoryEntry(e);
    list.appendChild(div);
  });
}

function viewHistoryEntry(entry) {
  const room = {
    game: { questions: entry.questions || [], name: entry.gameName || "", title: entry.gameName || "" },
    answersA: entry.answersA || [],
    answersB: entry.answersB || [],
    nameA: entry.nameA || "",
    nameB: entry.nameB || "",
  };
  showComparison(room);
  const footer = document.getElementById("compare-footer");
  if (footer) footer.style.display = "none";
  const backRow = document.getElementById("compare-back-row");
  if (backRow) backRow.style.display = "";
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
