// ─── Firebase Authentication ──────────────────────────────────────────────────

const FIREBASE_API_KEY = "AIzaSyCTdBHIidr4O8NMdxbgqAh3v3SxvxEx03g";
const AUTH_BASE = "https://identitytoolkit.googleapis.com/v1";

function parseAuthError(code) {
  const map = {
    EMAIL_EXISTS: "That email is already registered.",
    INVALID_EMAIL: "Please enter a valid email address.",
    WEAK_PASSWORD: "Password must be at least 6 characters.",
    INVALID_LOGIN_CREDENTIALS: "Incorrect email or password.",
    EMAIL_NOT_FOUND: "No account found with that email.",
    INVALID_PASSWORD: "Incorrect password.",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Too many failed attempts. Try again later.",
    USER_DISABLED: "This account has been disabled.",
  };
  // Firebase sometimes returns "WEAK_PASSWORD : Password should be at least 6 characters"
  const base = (code || "").split(" :")[0].trim();
  return map[base] || map[code] || "Something went wrong. Please try again.";
}

async function authFetch(endpoint, body) {
  const r = await fetch(`${AUTH_BASE}/${endpoint}?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) {
    console.error("Auth error:", { status: r.status, endpoint, error: data });
    throw new Error(parseAuthError(data.error?.message || "UNKNOWN"));
  }
  return data;
}

async function fbSignUp(displayName, email, password) {
  const created = await authFetch("accounts:signUp", { email, password, returnSecureToken: true });
  const updated = await authFetch("accounts:update", {
    idToken: created.idToken,
    displayName,
    returnSecureToken: true,
  });
  return {
    idToken: updated.idToken,
    refreshToken: updated.refreshToken,
    localId: created.localId,
    displayName: updated.displayName || displayName,
  };
}

async function fbSignIn(email, password) {
  const data = await authFetch("accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
    displayName: data.displayName || email.split("@")[0],
  };
}

async function refreshIdToken() {
  const refreshToken = localStorage.getItem("ref_refresh_token");
  if (!refreshToken) return null;
  try {
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    const data = await r.json();
    if (!r.ok) return null;
    localStorage.setItem("ref_id_token", data.id_token);
    localStorage.setItem("ref_refresh_token", data.refresh_token);
    return data.id_token;
  } catch {
    return null;
  }
}

// ─── Session Storage ──────────────────────────────────────────────────────────

function storeSession(auth) {
  localStorage.setItem("ref_id_token", auth.idToken);
  localStorage.setItem("ref_refresh_token", auth.refreshToken);
  localStorage.setItem("ref_user_id", auth.localId);
  localStorage.setItem("ref_display_name", auth.displayName);
}

function clearSession() {
  ["ref_id_token", "ref_refresh_token", "ref_user_id", "ref_display_name"].forEach((k) => localStorage.removeItem(k));
}

function getStoredSession() {
  const userId = localStorage.getItem("ref_user_id");
  const refreshToken = localStorage.getItem("ref_refresh_token");
  if (!userId || !refreshToken) return null;
  return {
    userId,
    displayName: localStorage.getItem("ref_display_name") || "",
    idToken: localStorage.getItem("ref_id_token") || "",
  };
}

// ─── Auth UI Handlers (called from HTML) ──────────────────────────────────────

function showAuthError(elId, msg) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.classList.remove("hidden");
}

async function handleSignUp() {
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim().toLowerCase();
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-confirm").value;

  document.getElementById("signup-error").classList.add("hidden");

  if (!name) return showAuthError("signup-error", "Please enter your display name.");
  if (!email) return showAuthError("signup-error", "Please enter your email.");
  if (password.length < 6) return showAuthError("signup-error", "Password must be at least 6 characters.");
  if (password !== confirm) return showAuthError("signup-error", "Passwords don't match.");

  const btn = document.getElementById("signup-btn");
  btn.textContent = "Creating account…";
  btn.disabled = true;

  try {
    const auth = await fbSignUp(name, email, password);
    storeSession(auth);
    onAuthSuccess(auth.localId, auth.displayName);
  } catch (err) {
    console.error("Sign up error:", err);
    showAuthError("signup-error", err.message);
  } finally {
    btn.textContent = "Create account →";
    btn.disabled = false;
  }
}

async function handleSignIn() {
  const email = document.getElementById("signin-email").value.trim().toLowerCase();
  const password = document.getElementById("signin-password").value;

  document.getElementById("signin-error").classList.add("hidden");

  if (!email || !password) return showAuthError("signin-error", "Please fill in all fields.");

  const btn = document.getElementById("signin-btn");
  btn.textContent = "Signing in…";
  btn.disabled = true;

  try {
    const auth = await fbSignIn(email, password);
    storeSession(auth);
    onAuthSuccess(auth.localId, auth.displayName);
  } catch (err) {
    console.error("Sign in error:", err);
    showAuthError("signin-error", err.message);
  } finally {
    btn.textContent = "Sign in →";
    btn.disabled = false;
  }
}

function handleSignOut() {
  clearSession();
  state.userId = "";
  state.name = "";
  save();
  document.getElementById("signin-email").value = "";
  document.getElementById("signin-password").value = "";
  document.getElementById("signin-error").classList.add("hidden");
  show("screen-signin");
}

function onAuthSuccess(userId, displayName) {
  state.userId = userId;
  state.name = displayName;
  save();
  showLibrary();
}

async function restoreSession() {
  const session = getStoredSession();
  if (!session) {
    show("screen-signin");
    return;
  }
  const newToken = await refreshIdToken();
  if (!newToken) {
    clearSession();
    show("screen-signin");
    return;
  }
  state.userId = session.userId;
  state.name = session.displayName;
  save();
  showLibrary();
}
