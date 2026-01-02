// frontend/src/auth/currentUser.js

const STORAGE_KEY = "zenops_user";

// Legacy keys seen in older builds
const LEGACY = {
  token: ["vb_token", "access_token", "token"],
  role: ["vb_role", "role"],
  email: ["vb_email", "email", "user_email"],
  fullName: ["vb_name", "full_name", "name"],
};

function safeJSONParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function firstNonEmpty(keys) {
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function normalizeUser(u) {
  if (!u || typeof u !== "object") return null;

  const email = (u.email || "").toString().trim().toLowerCase();
  const role = (u.role || "").toString().trim();

  // We standardize the token field name to `token` (single source of truth)
  const token = (u.token || u.access_token || u.accessToken || "").toString().trim();

  const full_name = u.full_name ?? u.fullName ?? u.name ?? null;

  return {
    id: Number(u.id || 0) || 0,
    email,
    full_name,
    role,
    token,
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
  };
}

export function getCurrentUser() {
  // 1) Preferred storage
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? safeJSONParse(raw) : null;
  const normalized = normalizeUser(parsed);
  if (normalized?.email || normalized?.token) return normalized;

  // 2) Auto-migrate from legacy keys
  const token = firstNonEmpty(LEGACY.token);
  const role = firstNonEmpty(LEGACY.role) || "EMPLOYEE";
  const email = firstNonEmpty(LEGACY.email).toLowerCase();
  const full_name = firstNonEmpty(LEGACY.fullName) || null;

  // If we have nothing, user is not logged in
  if (!token && !email) return null;

  const migrated = normalizeUser({ id: 0, email, full_name, role, token }) || null;
  if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

export function setCurrentUser(user) {
  const normalized = normalizeUser(user);
  if (!normalized) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEY);

  // Also clear legacy keys so you don’t keep relapsing
  Object.values(LEGACY)
    .flat()
    .forEach((k) => localStorage.removeItem(k));
}

// Backward compatibility only.
// IMPORTANT: this is a snapshot at import-time; prefer calling getCurrentUser() inside components.
export const currentUser =
  getCurrentUser() || {
    id: 0,
    email: "guest@local",
    full_name: "Guest",
    role: "EMPLOYEE",
    token: "",
    permissions: [],
  };