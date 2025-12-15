// frontend/src/api/apiFetch.js
import { getCurrentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";

export async function apiFetch(path, options = {}) {
  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  // Send identity header for protected routes
  if (userEmail) headers.set("X-User-Email", userEmail);

  // If body exists and Content-Type not set, default to JSON
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Auto-handle auth failures cleanly
  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  return res;
}