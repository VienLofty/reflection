// ─── Editor State ─────────────────────────────────────────────────────────────

let editorGame = null;
let editorQuestionIndex = -1;
let editorQuestion = null;

// ─── Library Screen ───────────────────────────────────────────────────────────

async function showLibrary() {
  const list = document.getElementById("library-list");
  list.innerHTML = '<p style="font-size:13px;color:var(--stone);padding:4px 0">Loading your games…</p>';
  show("screen-library");

  const userGames = await fbLoadGames();
  list.innerHTML = "";

  // Always show template first
  list.appendChild(makeGameCard(TEMPLATE_GAME));

  // Then user's custom games
  userGames.forEach((game) => list.appendChild(makeGameCard(game)));
}

function makeGameCard(game) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.cssText = "display:flex;flex-direction:column;gap:14px";

  const isTemplate = !!game.isTemplate;
  const qCount = game.questions?.length || 0;
  const safeId = esc(game.id);
  const safeName = esc(game.name || "Untitled");
  const safeDesc = esc(game.description || "");

  card.innerHTML = `
    <div>
      ${isTemplate ? `<span style="font-size:10px;color:var(--stone);text-transform:uppercase;letter-spacing:0.12em;font-weight:500;display:block;margin-bottom:5px">Default template</span>` : ""}
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:var(--ink)">${safeName}</div>
      <div style="font-size:13px;color:var(--stone);margin-top:4px">${qCount} question${qCount !== 1 ? "s" : ""}${safeDesc ? " · " + safeDesc : ""}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-primary" style="flex:1;min-width:80px" onclick="playGame('${safeId}')">Play →</button>
      ${
        isTemplate
          ? `<button class="btn-ghost" onclick="cloneTemplate()">Clone &amp; edit</button>`
          : `<button class="btn-ghost" onclick="editGame('${safeId}')">Edit</button>
           <button class="btn-ghost" style="color:#a0522d;border-color:#d4b9a8" onclick="confirmDeleteGame('${safeId}','${safeName}')">Delete</button>`
      }
    </div>
  `;
  return card;
}

async function playGame(gameId) {
  if (gameId === "template") {
    state.selectedGame = TEMPLATE_GAME;
  } else {
    try {
      const r = await fetch(`${FIREBASE_URL}/games/${state.deviceId}/${gameId}.json`);
      state.selectedGame = (await r.json()) || null;
    } catch (e) {
      state.selectedGame = null;
    }
  }

  if (!state.selectedGame || !state.selectedGame.questions?.length) {
    alert("This game has no questions yet. Edit it first!");
    return;
  }

  state.answers = state.selectedGame.questions.map(() => ({ chips: [], custom: "" }));
  state.myDone = false;
  state.roomCode = "";
  state.role = "";
  save();

  // Update room screen with selected game name
  document.getElementById("room-game-name").textContent = state.selectedGame.name;
  show("screen-room");
}

async function cloneTemplate() {
  const clone = {
    ...JSON.parse(JSON.stringify(TEMPLATE_GAME)),
    id: genId(),
    name: "My Reflection",
    isTemplate: false,
    createdAt: Date.now(),
  };
  await fbSaveGame(clone);
  editGameObj(clone);
}

async function editGame(gameId) {
  try {
    const r = await fetch(`${FIREBASE_URL}/games/${state.deviceId}/${gameId}.json`);
    const data = await r.json();
    if (!data) throw new Error("Not found");
    editGameObj(data);
  } catch (e) {
    alert("Couldn't load this game. Try again.");
  }
}

function editGameObj(game) {
  editorGame = JSON.parse(JSON.stringify(game));
  renderGameEditor();
  show("screen-game-editor");
}

async function confirmDeleteGame(gameId, gameName) {
  if (!confirm(`Delete "${gameName}"? This can't be undone.`)) return;
  await fbDeleteGame(gameId);
  showLibrary();
}

// ─── Game Editor Screen ───────────────────────────────────────────────────────

function createNewGame() {
  editorGame = {
    id: genId(),
    name: "New game",
    description: "",
    isTemplate: false,
    createdAt: Date.now(),
    questions: [],
  };
  renderGameEditor();
  show("screen-game-editor");
}

function renderGameEditor() {
  document.getElementById("editor-game-name").value = editorGame.name || "";
  document.getElementById("editor-game-desc").value = editorGame.description || "";
  renderQuestionList();
}

function renderQuestionList() {
  const list = document.getElementById("editor-questions-list");
  list.innerHTML = "";

  if (!editorGame.questions || !editorGame.questions.length) {
    list.innerHTML =
      '<p style="font-size:13px;color:var(--stone);padding:8px 0">No questions yet. Add your first one!</p>';
    return;
  }

  editorGame.questions.forEach((q, i) => {
    const total = editorGame.questions.length;
    const typeLabel = { chips: "Multi-select", single: "Single choice", text: "Free text" }[q.type] || q.type;
    const item = document.createElement("div");
    item.className = "question-list-item";
    item.innerHTML = `
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;color:var(--ink);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(q.title || "Untitled question")}</div>
        <div style="font-size:12px;color:var(--stone);margin-top:3px">${esc(typeLabel)}${q.opts?.length ? " · " + q.opts.length + " options" : ""}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
        <button class="icon-btn" onclick="moveQuestion(${i},-1)" ${i === 0 ? "disabled" : ""} title="Move up">↑</button>
        <button class="icon-btn" onclick="moveQuestion(${i},1)" ${i === total - 1 ? "disabled" : ""} title="Move down">↓</button>
        <button class="icon-btn" onclick="editQuestion(${i})">Edit</button>
        <button class="icon-btn icon-btn-danger" onclick="deleteQuestion(${i})">✕</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function moveQuestion(i, dir) {
  const q = editorGame.questions;
  const j = i + dir;
  if (j < 0 || j >= q.length) return;
  [q[i], q[j]] = [q[j], q[i]];
  renderQuestionList();
}

function deleteQuestion(i) {
  if (!confirm("Remove this question?")) return;
  editorGame.questions.splice(i, 1);
  renderQuestionList();
}

async function saveGameEditor() {
  const nameVal = document.getElementById("editor-game-name").value.trim();
  editorGame.name = nameVal || "Untitled game";
  editorGame.description = document.getElementById("editor-game-desc").value.trim();
  const ok = await fbSaveGame(editorGame);
  if (!ok) {
    alert("Couldn't save. Check your internet connection.");
    return;
  }
  showLibrary();
}

// ─── Question Editor Screen ───────────────────────────────────────────────────

function addNewQuestion() {
  editorQuestionIndex = -1;
  editorQuestion = { id: genId(), title: "", desc: "", type: "chips", opts: [] };
  renderQuestionEditor();
  show("screen-question-editor");
}

function editQuestion(i) {
  editorQuestionIndex = i;
  editorQuestion = JSON.parse(JSON.stringify(editorGame.questions[i]));
  renderQuestionEditor();
  show("screen-question-editor");
}

function renderQuestionEditor() {
  document.getElementById("qeditor-title").value = editorQuestion.title || "";
  document.getElementById("qeditor-desc").value = editorQuestion.desc || "";
  setQuestionType(editorQuestion.type || "chips");
  renderOptionsList();
}

function setQuestionType(type) {
  editorQuestion.type = type;
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.type === type);
  });
  const optsSection = document.getElementById("qeditor-opts-section");
  optsSection.style.display = type === "text" ? "none" : "flex";
}

function renderOptionsList() {
  const list = document.getElementById("qeditor-opts-list");
  list.innerHTML = "";
  (editorQuestion.opts || []).forEach((opt, i) => {
    const row = document.createElement("div");
    row.className = "option-row";
    row.innerHTML = `
      <input class="input-field" style="flex:1;padding:10px 14px;font-size:14px"
        value="${esc(opt)}" placeholder="Option text" />
      <button class="icon-btn icon-btn-danger" onclick="removeOption(${i})">✕</button>
    `;
    list.appendChild(row);
  });
}

function addOption() {
  if (!editorQuestion.opts) editorQuestion.opts = [];
  editorQuestion.opts.push("");
  renderOptionsList();
  const inputs = document.querySelectorAll("#qeditor-opts-list input");
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function removeOption(i) {
  editorQuestion.opts.splice(i, 1);
  renderOptionsList();
}

function saveQuestion() {
  editorQuestion.title = document.getElementById("qeditor-title").value.trim();
  editorQuestion.desc = document.getElementById("qeditor-desc").value.trim();

  // Collect option values from DOM
  const inputs = document.querySelectorAll("#qeditor-opts-list input");
  editorQuestion.opts = Array.from(inputs)
    .map((inp) => inp.value.trim())
    .filter((v) => v);

  if (!editorQuestion.title) {
    alert("Please add a question title.");
    document.getElementById("qeditor-title").focus();
    return;
  }

  if (editorQuestion.type !== "text" && editorQuestion.opts.length < 2) {
    alert("Add at least 2 answer options, or switch to Free text type.");
    return;
  }

  if (editorQuestionIndex === -1) {
    editorGame.questions.push(editorQuestion);
  } else {
    editorGame.questions[editorQuestionIndex] = editorQuestion;
  }

  renderQuestionList();
  show("screen-game-editor");
}
