// ─── Room Setup ───────────────────────────────────────────────────────────────

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array(6)
    .fill(0)
    .map(() => c[Math.floor(Math.random() * c.length)])
    .join("");
}

async function createRoom() {
  const code = genCode();
  state.roomCode = code;
  state.role = "A";
  const ok = await writeRoom(code, {
    createdAt: Date.now(),
    nameA: state.name,
    nameB: "",
    game: state.selectedGame,
    answersA: null,
    answersB: null,
    doneA: false,
    doneB: false,
  });
  if (!ok) {
    showError("Couldn't create a room right now. Try again?");
    return;
  }
  save();
  document.getElementById("display-code").textContent = code;
  show("screen-waiting-start");
  pollForPartner();
}

async function joinRoom() {
  const code = document.getElementById("join-code").value.trim().toUpperCase();
  if (code.length !== 6) {
    showError("Needs to be 6 letters.");
    return;
  }
  const room = await readRoom(code);
  if (!room) {
    showError("Room not found. Double-check the code?");
    return;
  }
  if (room.nameB) {
    showError("This room already has two people.");
    return;
  }

  state.roomCode = code;
  state.role = "B";
  state.selectedGame = room.game;
  state.answers = (state.selectedGame?.questions || []).map(() => ({ chips: [], custom: "" }));

  room.nameB = state.name;
  await writeRoom(code, room);
  save();

  document.getElementById("display-code").textContent = code;
  document.getElementById("wait-status").textContent = "You're in! Ready when you are.";
  document.getElementById("start-btn-area").classList.remove("hidden");
  show("screen-waiting-start");
}

function showError(msg) {
  const el = document.getElementById("room-error");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4500);
}

function pollForPartner() {
  clearPoll();
  pollTimer = setInterval(async () => {
    const room = await readRoom(state.roomCode);
    if (!room) return;
    if (room.nameB) {
      clearPoll();
      document.getElementById("wait-status").textContent = esc(room.nameB) + " just joined!";
      document.getElementById("start-btn-area").classList.remove("hidden");
    }
  }, 3000);
}

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ─── Questions ────────────────────────────────────────────────────────────────

function startQuestions() {
  clearPoll();
  state.currentQ = 0;
  save();
  renderQuestion(0);
  show("screen-question");
}

function renderQuestion(i) {
  const questions = state.selectedGame?.questions || [];
  const q = questions[i];
  const a = state.answers[i] || { chips: [], custom: "" };
  const total = questions.length;

  document.getElementById("q-num").textContent = "Question " + (i + 1);
  document.getElementById("q-index").textContent = i + 1;
  document.getElementById("q-total").textContent = total;
  document.getElementById("q-title").textContent = q.title;

  const descEl = document.getElementById("q-desc");
  descEl.textContent = q.desc || "";
  descEl.style.display = q.desc ? "" : "none";

  document.getElementById("progress-fill").style.width = ((i + 1) / total) * 100 + "%";
  document.getElementById("custom-textarea").value = a.custom || "";
  document.getElementById("btn-back").disabled = i === 0;
  document.getElementById("btn-next").textContent = i === total - 1 ? "Finish ✓" : "Next →";

  const chipsContainer = document.getElementById("chips-container");
  const customSection = document.getElementById("custom-section");
  const customLabelEl = document.getElementById("custom-label-text");

  chipsContainer.innerHTML = "";

  if (q.type === "text") {
    // Free text only — hide chips, relabel textarea
    chipsContainer.style.display = "none";
    customSection.style.display = "";
    customLabelEl.textContent = "Your answer";
    document.getElementById("custom-textarea").placeholder = "Write your answer here…";
  } else {
    // Chips (multi) or single choice
    chipsContainer.style.display = "";
    customSection.style.display = "";
    customLabelEl.textContent = "Anything to add?";
    document.getElementById("custom-textarea").placeholder = "Your own words, if the options don't quite fit…";

    (q.opts || []).forEach((opt) => {
      const ch = document.createElement("button");
      ch.className = "chip" + (a.chips.includes(opt) ? " selected" : "");
      ch.textContent = opt;
      ch.onclick = () => {
        if (q.type === "single") {
          // Deselect all, then select this one (toggle)
          state.answers[i].chips = state.answers[i].chips.includes(opt) ? [] : [opt];
        } else {
          const cur = state.answers[i].chips;
          const idx = cur.indexOf(opt);
          if (idx >= 0) cur.splice(idx, 1);
          else cur.push(opt);
        }
        chipsContainer.querySelectorAll(".chip").forEach((c, ci) => {
          c.classList.toggle("selected", state.answers[i].chips.includes(q.opts[ci]));
        });
        save();
      };
      chipsContainer.appendChild(ch);
    });
  }
}

function prevQuestion() {
  saveCustom();
  if (state.currentQ > 0) {
    state.currentQ--;
    save();
    renderQuestion(state.currentQ);
  }
}

function nextQuestion() {
  saveCustom();
  const total = state.selectedGame?.questions?.length || 0;
  if (state.currentQ < total - 1) {
    state.currentQ++;
    save();
    renderQuestion(state.currentQ);
  } else {
    finishAnswering();
  }
}

function saveCustom() {
  state.answers[state.currentQ].custom = document.getElementById("custom-textarea").value;
  save();
}

// ─── Finishing & Comparison ───────────────────────────────────────────────────

async function finishAnswering() {
  saveCustom();
  state.myDone = true;
  save();

  const room = await readRoom(state.roomCode);
  if (!room) return;

  if (state.role === "A") {
    room.answersA = state.answers;
    room.doneA = true;
  } else {
    room.answersB = state.answers;
    room.doneB = true;
  }
  await writeRoom(state.roomCode, room);

  if ((state.role === "A" && room.doneB) || (state.role === "B" && room.doneA)) {
    showComparison(room);
  } else {
    show("screen-waiting-partner");
    pollForComparison();
  }
}

function pollForComparison() {
  clearPoll();
  pollTimer = setInterval(async () => {
    const room = await readRoom(state.roomCode);
    if (!room) return;
    if (room.doneA && room.doneB) {
      clearPoll();
      showComparison(room);
    }
  }, 3000);
}

function showComparison(room) {
  clearPoll();
  const questions = room.game?.questions || [];
  const aA = room.answersA || [];
  const aB = room.answersB || [];
  const nA = room.nameA;
  const nB = room.nameB;

  document.getElementById("comp-name-a").textContent = nA;
  document.getElementById("comp-name-b").textContent = nB;

  // Shared chips (only from chips/single questions)
  const allA = aA.flatMap((a, i) => (questions[i]?.type === "text" ? [] : a.chips || []));
  const allB = aB.flatMap((a, i) => (questions[i]?.type === "text" ? [] : a.chips || []));
  const shared = [...new Set(allA.filter((x) => allB.includes(x)))];

  const st = document.getElementById("shared-tags");
  st.innerHTML = "";
  if (!shared.length) {
    st.innerHTML =
      '<span style="font-size:14px;color:var(--stone)">Not many overlaps — makes the conversation more interesting.</span>';
  } else {
    shared.forEach((s) => {
      const t = document.createElement("span");
      t.className = "shared-tag";
      t.textContent = s;
      st.appendChild(t);
    });
  }

  const qc = document.getElementById("compare-questions");
  qc.innerHTML = "";

  questions.forEach((q, i) => {
    const chA = aA[i]?.chips || [];
    const chB = aB[i]?.chips || [];
    const cA = aA[i]?.custom || "";
    const cB = aB[i]?.custom || "";

    const sec = document.createElement("div");
    sec.className = "compare-section";

    let h = `
      <div class="compare-section-header">
        <div style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:5px">Q${i + 1}</div>
        <div class="compare-q">${esc(q.title)}</div>
      </div>
      <div class="compare-answers">
    `;

    if (q.type === "text") {
      // Free text question — show both answers as quotes
      if (!cA && !cB) {
        h += `<p style="font-size:13px;color:var(--stone)">Neither of you answered this one.</p>`;
      } else {
        if (cA)
          h += `
          <div>
            <div style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">${esc(nA)}</div>
            <p class="custom-text">"${esc(cA)}"</p>
          </div>`;
        if (cB)
          h += `
          <div>
            <div style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">${esc(nB)}</div>
            <p class="custom-text">"${esc(cB)}"</p>
          </div>`;
      }
    } else {
      // Chips or single — show shared, then unique per person
      const shQ = [...new Set(chA.filter((x) => chB.includes(x)))];
      const oA = chA.filter((x) => !chB.includes(x));
      const oB = chB.filter((x) => !chA.includes(x));

      if (shQ.length) {
        h += `<div><div style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px">Both</div><div class="answer-chips-row">`;
        shQ.forEach((c) => {
          h += `<span class="mini-chip chip-shared">${esc(c)}</span>`;
        });
        h += `</div></div>`;
      }
      if (oA.length) {
        h += `<div><div style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px">${esc(nA)}</div><div class="answer-chips-row">`;
        oA.forEach((c) => {
          h += `<span class="mini-chip chip-a">${esc(c)}</span>`;
        });
        h += `</div></div>`;
      }
      if (oB.length) {
        h += `<div><div style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px">${esc(nB)}</div><div class="answer-chips-row">`;
        oB.forEach((c) => {
          h += `<span class="mini-chip chip-b">${esc(c)}</span>`;
        });
        h += `</div></div>`;
      }
      if (cA || cB) {
        h += `<div style="border-top:1.5px solid var(--sand3);padding-top:12px;margin-top:6px;display:flex;flex-direction:column;gap:10px">`;
        if (cA)
          h += `<div><span style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em">${esc(nA)}:</span><p class="custom-text" style="margin-top:5px">"${esc(cA)}"</p></div>`;
        if (cB)
          h += `<div><span style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em">${esc(nB)}:</span><p class="custom-text" style="margin-top:5px">"${esc(cB)}"</p></div>`;
        h += `</div>`;
      }
      if (!chA.length && !chB.length && !cA && !cB) {
        h += `<p style="font-size:13px;color:var(--stone)">Neither of you answered this one.</p>`;
      }
    }

    h += `</div>`;
    sec.innerHTML = h;
    qc.appendChild(sec);
  });

  state.lastRoom = room;
  show("screen-compare");
}

async function saveToHistory() {
  const room = state.lastRoom;
  if (!room) {
    showLibrary();
    return;
  }
  const entry = {
    id: Date.now().toString(),
    savedAt: Date.now(),
    gameName: room.game?.title || "Untitled",
    nameA: room.nameA || "",
    nameB: room.nameB || "",
    questions: room.game?.questions || [],
    answersA: room.answersA || [],
    answersB: room.answersB || [],
  };
  await fbSaveHistory(entry);
  showLibrary();
}

// ─── Clipboard ────────────────────────────────────────────────────────────────

function copyCode(e) {
  navigator.clipboard.writeText(state.roomCode).then(() => {
    const b = e.target;
    const o = b.textContent;
    b.textContent = "Copied!";
    setTimeout(() => (b.textContent = o), 1800);
  });
}

function copyLink(e) {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const b = e.target;
    const o = b.textContent;
    b.textContent = "Link copied!";
    setTimeout(() => (b.textContent = o), 1800);
  });
}

// ─── Cancel/Exit Game ──────────────────────────────────────────────────────────

function cancelGame() {
  if (confirm("Exit this game? Your progress won't be saved.")) {
    clearPoll();
    state.roomCode = "";
    state.currentQ = 0;
    state.answers = [];
    state.role = "";
    save();
    showLibrary();
  }
}
