// ─── Join with Code (from Landing Screen) ─────────────────────────────────────────

async function submitJoinCode() {
  const code = document.getElementById("join-code-input").value.trim().toUpperCase();
  const errEl = document.getElementById("join-code-error");

  if (code.length !== 6) {
    errEl.textContent = "Code needs to be 6 letters.";
    errEl.classList.remove("hidden");
    return;
  }

  errEl.classList.add("hidden");

  // Look up the room
  const room = await readRoom(code);
  if (!room) {
    errEl.textContent = "Room not found. Double-check the code?";
    errEl.classList.remove("hidden");
    return;
  }

  if (room.nameB) {
    errEl.textContent = "This room already has two people.";
    errEl.classList.remove("hidden");
    return;
  }

  // Join the room
  state.roomCode = code;
  state.role = "B";
  state.selectedGame = room.game;
  state.answers = (state.selectedGame?.questions || []).map(() => ({
    chips: [],
    custom: "",
  }));

  room.nameB = state.name;
  await writeRoom(code, room);
  save();

  // Show waiting screen
  document.getElementById("display-code").textContent = code;
  document.getElementById("wait-status").textContent = "You're in! Waiting for them…";
  document.getElementById("start-btn-area").classList.remove("hidden");
  show("screen-waiting-start");
  pollForPartner();
}
