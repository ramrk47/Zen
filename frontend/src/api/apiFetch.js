// frontend/src/api/apiFetch.js
import { getCurrentUser, clearCurrentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";

async function readErrorDetail(res) {
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json();
      if (typeof j?.detail === "string") return j.detail;
      return JSON.stringify(j);
    }
    const t = await res.text();
    return t || "";
  } catch {
    return "";
  }
}

/**
 * Normalize path to avoid 307 redirects that may drop headers.
 * - Ensures it starts with "/"
 * - Preserves query string
 * - Adds trailing slash ONLY for collection endpoints you use a lot
 */
function normalizePath(path) {
  let p = String(path || "");
  if (!p.startsWith("/")) p = `/${p}`;

  // Split query
  const [base, qs] = p.split("?");
  let b = base;

  // ✅ Fix the most common redirect culprits in this app:
  // FastAPI treats "/api/assignments" -> 307 -> "/api/assignments/"
  if (b === "/api/assignments") b = "/api/assignments/";
  if (b === "/api/master/banks") b = "/api/master/banks";
  // (leave other endpoints alone)

  return qs ? `${b}?${qs}` : b;
}

export async function apiFetch(path, options = {}) {
  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const accessToken = (user?.access_token || user?.token || "").trim(); // support both keys

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  // ✅ JWT first
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // ✅ fallback (legacy/dev-only)
  if (!accessToken && userEmail && !headers.has("X-User-Email")) {
    headers.set("X-User-Email", userEmail);
  }

  // If body exists and Content-Type not set, default to JSON
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${API_BASE}${normalizePath(path)}`;

  const res = await fetch(url, {
    ...options,
    headers,
    // ✅ important: prevent silent redirect surprises.
    // If you *still* hit a redirect, you want to see it and fix the path.
    redirect: options.redirect || "follow",
  });

  if (res.status === 401) {
    const detail = await readErrorDetail(res);
    console.error("401 from API", normalizePath(path), {
      userEmail,
      hasToken: Boolean(accessToken),
      detail,
    });

    // ✅ Clear session so UI returns to login cleanly
    clearCurrentUser();

    throw new Error(detail ? `UNAUTHORIZED: ${detail}` : "UNAUTHORIZED");
  }

  return res;
}