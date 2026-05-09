// ─── Device Identity ──────────────────────────────────────────────────────────

function getDeviceId() {
  let id = localStorage.getItem("ref_device");
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("ref_device", id);
  }
  return id;
}

function genId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Escape HTML to prevent XSS when inserting user data into innerHTML
function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Default Template Game ────────────────────────────────────────────────────

const TEMPLATE_GAME = {
  id: "template",
  name: "Reflection",
  description: "Ten thoughtful questions about love, space, and connection.",
  isTemplate: true,
  questions: [
    {
      id: "tq1",
      title: "When do you feel most loved?",
      desc: "Think about actual moments. When do you genuinely feel it?",
      type: "chips",
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
      id: "tq2",
      title: "What makes you feel safe with someone?",
      desc: "Not safe like nothing bad happens. Safe like you can be yourself.",
      type: "chips",
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
      id: "tq3",
      title: "What quietly wears you down in a relationship?",
      desc: "The small things that build up over time.",
      type: "chips",
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
      id: "tq4",
      title: "What do you naturally give when you love someone?",
      desc: "Not what you think you should — what just comes out of you.",
      type: "chips",
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
      id: "tq5",
      title: "How much togetherness and space do you need?",
      desc: "Everyone's different. Be honest.",
      type: "chips",
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
      id: "tq6",
      title: "What does a good relationship feel like to you?",
      desc: "Not perfect — just good. Day to day.",
      type: "chips",
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
      id: "tq7",
      title: "What are you not willing to give up, even for love?",
      desc: "The non-negotiable parts of yourself.",
      type: "chips",
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
      id: "tq8",
      title: "What fears do you bring into relationships?",
      desc: "Most people carry something in. What's yours?",
      type: "chips",
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
      id: "tq9",
      title: "What does a normal, happy day together look like?",
      desc: "Not a holiday. Just a regular day that feels right.",
      type: "chips",
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
      id: "tq10",
      title: "How do you tend to handle conflict?",
      desc: "What actually happens when things get hard?",
      type: "chips",
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
  ],
};

// ─── Global State ─────────────────────────────────────────────────────────────

const SK = "reflection_v5";

function getAuthToken() {
  return localStorage.getItem("ref_id_token") || "";
}

let state = {
  deviceId: getDeviceId(),
  userId: "",
  name: "",
  selectedGame: null,
  roomCode: "",
  role: "",
  currentQ: 0,
  answers: [],
  myDone: false,
};

let pollTimer = null;

function save() {
  localStorage.setItem(SK, JSON.stringify(state));
}

function load() {
  try {
    const d = localStorage.getItem(SK);
    if (d) Object.assign(state, JSON.parse(d));
  } catch (e) {}
  state.deviceId = getDeviceId();
}

// ─── Firebase ─────────────────────────────────────────────────────────────────

const FIREBASE_URL = "https://reflection-app-63a02-default-rtdb.asia-southeast1.firebasedatabase.app";

async function writeRoom(code, data) {
  try {
    const r = await fetch(`${FIREBASE_URL}/rooms/${code}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

async function readRoom(code) {
  try {
    const r = await fetch(`${FIREBASE_URL}/rooms/${code}.json`);
    if (!r.ok) return null;
    return (await r.json()) || null;
  } catch (e) {
    return null;
  }
}

async function fbSaveGame(game) {
  if (!state.userId) return false;
  const token = getAuthToken();
  try {
    const r = await fetch(`${FIREBASE_URL}/games/${state.userId}/${game.id}.json?auth=${token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(game),
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

async function fbDeleteGame(gameId) {
  if (!state.userId) return false;
  const token = getAuthToken();
  try {
    const r = await fetch(`${FIREBASE_URL}/games/${state.userId}/${gameId}.json?auth=${token}`, {
      method: "DELETE",
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

async function fbLoadGames() {
  if (!state.userId) return [];
  const token = getAuthToken();
  try {
    const r = await fetch(`${FIREBASE_URL}/games/${state.userId}.json?auth=${token}`);
    if (!r.ok) return [];
    const data = await r.json();
    if (!data) return [];
    return Object.values(data).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (e) {
    return [];
  }
}
