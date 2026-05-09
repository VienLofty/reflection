// Game Questions
const QUESTIONS = [
  {
    title: "When do you feel most loved?",
    desc: "Think about actual moments. When do you genuinely feel it?",
    opts: [
      "Physical closeness",
      "Quiet companionship",
      "Deep conversation",
      "Quality time",
      "Shared adventure",
      "Emotional reassurance",
      "Acts of care",
      "Being understood",
      "Freedom and trust",
      "Playfulness",
    ],
  },
  {
    title: "What makes you feel safe with someone?",
    desc: "Not safe like nothing bad happens. Safe like you can be yourself.",
    opts: [
      "Honesty",
      "Consistency",
      "Freedom",
      "Reassurance",
      "Calm communication",
      "Loyalty",
      "Emotional openness",
      "Patience",
      "Stability",
      "Acceptance",
    ],
  },
  {
    title: "What quietly wears you down in a relationship?",
    desc: "The small things that build up over time.",
    opts: [
      "Constant texting",
      "Jealousy",
      "Emotional distance",
      "Criticism",
      "Controlling behavior",
      "Needing constant reassurance",
      "Lack of communication",
      "Feeling ignored",
      "Pressure to report everything",
      "Lack of trust",
    ],
  },
  {
    title: "What do you naturally give when you love someone?",
    desc: "Not what you think you should — what just comes out of you.",
    opts: [
      "Loyalty",
      "Calm presence",
      "Practical support",
      "Affection",
      "Protection",
      "Deep conversation",
      "Freedom",
      "Encouragement",
      "Patience",
      "Acts of service",
    ],
  },
  {
    title: "How much togetherness and space do you need?",
    desc: "Everyone's different. Be honest.",
    opts: [
      "Daily communication",
      "Plenty of alone time",
      "Shared hobbies",
      "Independent lifestyles",
      "Frequent affection",
      "Flexible schedules",
      "Personal space",
      "Deep emotional connection",
      "Quiet coexistence",
      "Adventurous experiences",
    ],
  },
  {
    title: "What does a good relationship feel like to you?",
    desc: "Not perfect — just good. Day to day.",
    opts: [
      "Peaceful",
      "Supportive",
      "Adventurous",
      "Stable",
      "Emotionally deep",
      "Playful",
      "Growth-oriented",
      "Relaxed",
      "Honest",
      "Inspiring",
    ],
  },
  {
    title: "What are you not willing to give up, even for love?",
    desc: "The non-negotiable parts of yourself.",
    opts: [
      "Peace",
      "Freedom",
      "Friendships",
      "Personal philosophy",
      "Career goals",
      "Creativity",
      "Alone time",
      "Family connections",
      "Hobbies",
      "Independence",
    ],
  },
  {
    title: "What fears do you bring into relationships?",
    desc: "Most people carry something in. What's yours?",
    opts: [
      "Abandonment",
      "Losing freedom",
      "Betrayal",
      "Emotional pressure",
      "Not being understood",
      "Growing apart",
      "Being controlled",
      "Loneliness",
      "Losing identity",
      "Conflict",
    ],
  },
  {
    title: "What does a normal, happy day together look like?",
    desc: "Not a holiday. Just a regular day that feels right.",
    opts: [
      "Cooking together",
      "Quiet evenings",
      "Traveling",
      "Supporting each other's goals",
      "Comfortable silence",
      "Physical affection",
      "Building a future together",
      "Exploring together",
      "Independent but connected",
      "Sharing responsibilities",
    ],
  },
  {
    title: "How do you tend to handle conflict?",
    desc: "What actually happens when things get hard?",
    opts: [
      "Stay calm",
      "Need space first",
      "Become emotional",
      "Avoid conflict",
      "Want immediate discussion",
      "Withdraw quietly",
      "Try to solve logically",
      "Need reassurance",
      "Reflect before speaking",
      "Fear hurting the other person",
    ],
  },
];

// Storage key
const SK = "reflection_v4";

// Game state
let state = {
  name: "",
  roomCode: "",
  role: "",
  currentQ: 0,
  answers: Array(10)
    .fill(null)
    .map(() => ({ chips: [], custom: "" })),
  myDone: false,
};

let pollTimer = null;

// LocalStorage functions
function save() {
  localStorage.setItem(SK, JSON.stringify(state));
}

function load() {
  try {
    const d = localStorage.getItem(SK);
    if (d) Object.assign(state, JSON.parse(d));
  } catch (e) {}
}

// Screen management
function show(id) {
  [
    "screen-landing",
    "screen-room",
    "screen-waiting-start",
    "screen-question",
    "screen-waiting-partner",
    "screen-compare",
  ].forEach((s) => document.getElementById(s).classList.add("hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

// Landing screen
function goToRoom() {
  const n = document.getElementById("name-input").value.trim();
  if (!n) return;
  state.name = n;
  save();
  show("screen-room");
}

// Generate random room code
function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array(6)
    .fill(0)
    .map(() => c[Math.floor(Math.random() * c.length)])
    .join("");
}

// Create room
async function createRoom() {
  const code = genCode();
  state.roomCode = code;
  state.role = "A";
  const ok = await writeRoom(code, {
    createdAt: Date.now(),
    nameA: state.name,
    nameB: "",
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

// Join room
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
  room.nameB = state.name;
  await writeRoom(code, room);
  save();
  document.getElementById("display-code").textContent = code;
  document.getElementById("wait-status").textContent = "You're in! Ready when you are.";
  document.getElementById("start-btn-area").classList.remove("hidden");
  show("screen-waiting-start");
}

// Show error message
function showError(msg) {
  const el = document.getElementById("room-error");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4500);
}

// Poll for partner joining
function pollForPartner() {
  clearPoll();
  pollTimer = setInterval(async () => {
    const room = await readRoom(state.roomCode);
    if (!room) return;
    if (room.nameB) {
      clearPoll();
      document.getElementById("wait-status").textContent = room.nameB + " just joined!";
      document.getElementById("start-btn-area").classList.remove("hidden");
    }
  }, 3000);
}

// Clear poll timer
function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// Start questions screen
function startQuestions() {
  clearPoll();
  state.currentQ = 0;
  save();
  renderQuestion(0);
  show("screen-question");
}

// Render current question
function renderQuestion(i) {
  const q = QUESTIONS[i];
  const a = state.answers[i];
  document.getElementById("q-num").textContent = "Question " + (i + 1);
  document.getElementById("q-index").textContent = i + 1;
  document.getElementById("q-title").textContent = q.title;
  document.getElementById("q-desc").textContent = q.desc;
  document.getElementById("progress-fill").style.width = ((i + 1) / 10) * 100 + "%";
  document.getElementById("custom-textarea").value = a.custom || "";
  document.getElementById("btn-back").disabled = i === 0;
  document.getElementById("btn-next").textContent = i === 9 ? "Finish" : "Next →";
  const cc = document.getElementById("chips-container");
  cc.innerHTML = "";
  q.opts.forEach((opt) => {
    const ch = document.createElement("button");
    ch.className = "chip" + (a.chips.includes(opt) ? " selected" : "");
    ch.textContent = opt;
    ch.onclick = () => {
      const cur = state.answers[i].chips;
      const idx = cur.indexOf(opt);
      if (idx >= 0) cur.splice(idx, 1);
      else cur.push(opt);
      ch.classList.toggle("selected", state.answers[i].chips.includes(opt));
      save();
    };
    cc.appendChild(ch);
  });
}

// Navigate questions
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
  if (state.currentQ < 9) {
    state.currentQ++;
    save();
    renderQuestion(state.currentQ);
  } else finishAnswering();
}

// Save custom text answer
function saveCustom() {
  state.answers[state.currentQ].custom = document.getElementById("custom-textarea").value;
  save();
}

// Finish answering and wait for partner
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

// Poll for partner completion
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

// Show comparison results
function showComparison(room) {
  clearPoll();
  const aA = room.answersA || [];
  const aB = room.answersB || [];
  const nA = room.nameA;
  const nB = room.nameB;
  document.getElementById("comp-name-a").textContent = nA;
  document.getElementById("comp-name-b").textContent = nB;
  const gameTitle = room.game?.name || room.game?.title || "";
  const gameTitleEl = document.getElementById("comp-game-title");
  if (gameTitleEl) gameTitleEl.textContent = gameTitle;
  const allA = aA.flatMap((a) => a.chips || []);
  const allB = aB.flatMap((a) => a.chips || []);
  const shared = [...new Set(allA.filter((x) => allB.includes(x)))];
  const st = document.getElementById("shared-tags");
  st.innerHTML = "";
  if (!shared.length)
    st.innerHTML =
      '<span style="font-size:14px;color:var(--stone)">Not many overlaps — makes the conversation more interesting.</span>';
  else
    shared.forEach((s) => {
      const t = document.createElement("span");
      t.className = "shared-tag";
      t.textContent = s;
      st.appendChild(t);
    });
  const qc = document.getElementById("compare-questions");
  qc.innerHTML = "";
  QUESTIONS.forEach((q, i) => {
    const chA = aA[i]?.chips || [];
    const chB = aB[i]?.chips || [];
    const cA = aA[i]?.custom || "";
    const cB = aB[i]?.custom || "";
    const shQ = [...new Set(chA.filter((x) => chB.includes(x)))];
    const oA = chA.filter((x) => !chB.includes(x));
    const oB = chB.filter((x) => !chA.includes(x));
    const sec = document.createElement("div");
    sec.className = "compare-section";
    let h = `<div class="compare-section-header"><div style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:5px">Q${i + 1}</div><div class="compare-q">${q.title}</div></div><div class="compare-answers">`;
    if (shQ.length) {
      h += `<div><div style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px">Both</div><div class="answer-chips-row">`;
      shQ.forEach((c) => {
        h += `<span class="mini-chip chip-shared">${c}</span>`;
      });
      h += `</div></div>`;
    }
    if (oA.length) {
      h += `<div><div style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px">${nA}</div><div class="answer-chips-row">`;
      oA.forEach((c) => {
        h += `<span class="mini-chip chip-a">${c}</span>`;
      });
      h += `</div></div>`;
    }
    if (oB.length) {
      h += `<div><div style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px">${nB}</div><div class="answer-chips-row">`;
      oB.forEach((c) => {
        h += `<span class="mini-chip chip-b">${c}</span>`;
      });
      h += `</div></div>`;
    }
    if (cA || cB) {
      h += `<div style="border-top:1.5px solid var(--sand3);padding-top:12px;margin-top:6px;display:flex;flex-direction:column;gap:10px">`;
      if (cA)
        h += `<div><span style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em">${nA}:</span><p class="custom-text" style="margin-top:5px">"${cA}"</p></div>`;
      if (cB)
        h += `<div><span style="font-size:11px;color:var(--stone);text-transform:uppercase;letter-spacing:0.1em">${nB}:</span><p class="custom-text" style="margin-top:5px">"${cB}"</p></div>`;
      h += `</div>`;
    }
    if (!chA.length && !chB.length && !cA && !cB)
      h += `<p style="font-size:13px;color:var(--stone)">Neither of you answered this one.</p>`;
    h += `</div>`;
    sec.innerHTML = h;
    qc.appendChild(sec);
  });
  show("screen-compare");
}

// Backend API (Firebase Realtime Database)
const FIREBASE_URL = "https://reflection-app-63a02-default-rtdb.asia-southeast1.firebasedatabase.app";

async function writeRoom(code, data) {
  try {
    const url = `${FIREBASE_URL}/rooms/${code}.json`;
    const r = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return r.ok;
  } catch (e) {
    console.error("Write error:", e);
    return false;
  }
}

async function readRoom(code) {
  try {
    const url = `${FIREBASE_URL}/rooms/${code}.json`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    return data || null;
  } catch (e) {
    console.error("Read error:", e);
    return null;
  }
}

// Clipboard functions
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

// Initialize
load();
if (state.name && state.roomCode && state.myDone) {
  (async () => {
    const room = await readRoom(state.roomCode);
    if (room && room.doneA && room.doneB) showComparison(room);
    else show("screen-landing");
  })();
} else {
  document.getElementById("name-input").value = state.name || "";
  show("screen-landing");
}
