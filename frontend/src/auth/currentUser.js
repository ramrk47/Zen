// src/auth/currentUser.js
const STORAGE_KEY = "zenops_user";

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEY);
}

// convenience for existing code:
export const currentUser =
  getCurrentUser() || { id: 0, name: "Guest", role: "EMPLOYEE" };