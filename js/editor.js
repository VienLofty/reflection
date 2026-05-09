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

  if (!userGames.length) {
    list.innerHTML =
      '<p style="font-size:13px;color:var(--stone)">No games yet. Create one or start from a template.</p>';
  } else {
    userGames.forEach((game) => list.appendChild(makeGameCard(game)));
  }
}

function showTemplates() {
  const list = document.getElementById("templates-list");
  list.innerHTML = "";
  const TEMPLATES = [TEMPLATE_GAME];
  TEMPLATES.forEach((t) => {
    const qCount = t.questions?.length || 0;
    const card = document.createElement("div");
    card.className = "card";
    card.style.cssText = "display:flex;flex-direction:column;gap:14px";
    card.innerHTML = `
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:var(--ink)">${esc(t.name)}</div>
        <div style="font-size:13px;color:var(--stone);margin-top:4px">${qCount} question${qCount !== 1 ? "s" : ""}${t.description ? " · " + esc(t.description) : ""}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-primary" style="flex:1" onclick="cloneTemplate('${esc(t.id)}')">Use this template</button>
      </div>
    `;
    list.appendChild(card);
  });
  show("screen-templates");
}

function makeGameCard(game) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.cssText = "display:flex;flex-direction:column;gap:14px";

  const qCount = game.questions?.length || 0;
  const safeId = esc(game.id);
  const safeName = esc(game.name || "Untitled");
  const safeDesc = esc(game.description || "");

  card.innerHTML = `
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:var(--ink)">${safeName}</div>
      <div style="font-size:13px;color:var(--stone);margin-top:4px">${qCount} question${qCount !== 1 ? "s" : ""}${safeDesc ? " · " + safeDesc : ""}</div>
    </div>
    <div style="display:grid;gap:8px;grid-template-columns:repeat(2,1fr)">
      <button class="btn-primary" style="flex:1;min-width:80px;grid-column:span 2" onclick="playGame('${safeId}')">Play →</button>
      <button class="btn-ghost" onclick="editGame('${safeId}')">Edit</button>
      <button class="btn-ghost" style="color:#a0522d;border-color:#a0522d;border-width:1px;border-style:solid" onclick="confirmDeleteGame('${safeId}','${safeName}')">Delete</button>
    </div>
  `;
  return card;
}

async function playGame(gameId) {
  if (gameId === "template") {
    state.selectedGame = TEMPLATE_GAME;
  } else {
    try {
      const token = getAuthToken();
      const r = await fetch(`${FIREBASE_URL}/games/${state.userId}/${gameId}.json?auth=${token}`);
      state.selectedGame = (await r.json()) || null;
    } catch (e) {
      state.selectedGame = null;
    }
  }

  if (!state.selectedGame || !state.selectedGame.questions?.length) {
    alert("This game has no questions yet. Add some questions first!");
    return;
  }

  state.answers = state.selectedGame.questions.map(() => ({ chips: [], custom: "" }));
  state.myDone = false;
  state.roomCode = "";
  state.role = "";
  save();

  // Update room screen with selected game name
  document.getElementById("room-game-name").textContent = state.selectedGame.name;
  renderRoomQuestions();
  show("screen-room");
}

function renderRoomQuestions() {
  const questions = state.selectedGame?.questions || [];
  const previewDiv = document.getElementById("room-questions-preview");
  previewDiv.innerHTML = "";

  if (!questions.length) {
    previewDiv.innerHTML = '<p style="font-size:13px;color:var(--stone)">No questions yet.</p>';
    return;
  }

  questions.forEach((q, i) => {
    const qDiv = document.createElement("div");
    qDiv.style.cssText =
      "padding:10px 12px;background:var(--sand2);border-radius:8px;border-left:3px solid var(--sand3)";
    const typeLabel =
      {
        chips: "Multi-select",
        single: "Single choice",
        text: "Free text",
      }[q.type] || "Unknown";
    const optCount = q.opts?.length || 0;
    qDiv.innerHTML = `
      <div style="font-size:12px;font-weight:500;color:var(--ink)">${esc(q.title)}</div>
      <div style="font-size:11px;color:var(--stone);margin-top:3px">${typeLabel}${optCount ? " · " + optCount + " option" + (optCount !== 1 ? "s" : "") : ""}</div>
    `;
    previewDiv.appendChild(qDiv);
  });
}

async function cloneTemplate(templateId) {
  const sourceTemplates = { template: TEMPLATE_GAME };
  const source = sourceTemplates[templateId] || TEMPLATE_GAME;
  const clone = {
    ...JSON.parse(JSON.stringify(source)),
    id: genId(),
    isTemplate: false,
    createdAt: Date.now(),
  };
  await fbSaveGame(clone);
  editGameObj(clone);
}

async function editGame(gameId) {
  try {
    const token = getAuthToken();
    const r = await fetch(`${FIREBASE_URL}/games/${state.userId}/${gameId}.json?auth=${token}`);
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
