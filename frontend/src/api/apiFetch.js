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
 * Normalize path to avoid 307 redirects (your hook blocks redirects).
 * Rule:
 *  - Always start with "/"
 *  - Preserve query string
 *  - Strip trailing slashes by default (FastAPI often redirects on slash mismatch)
 */
function normalizePath(path) {
  let p = String(path || "").trim();
  if (!p.startsWith("/")) p = `/${p}`;

  const [base, qs] = p.split("?");
  let b = base;

  // ✅ Strip trailing slash (except root)
  if (b.length > 1 && b.endsWith("/")) b = b.replace(/\/+$/, "");

  return qs ? `${b}?${qs}` : b;
}

export async function apiFetch(path, options = {}) {
  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const token = (user?.token || user?.access_token || "").trim(); // support both keys

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  // ✅ JWT first
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // ✅ legacy fallback (dev-only)
  if (!token && userEmail && !headers.has("X-User-Email")) {
    headers.set("X-User-Email", userEmail);
  }

  // If body exists and Content-Type not set, default to JSON
  // IMPORTANT: do NOT set Content-Type for FormData; browser must set boundary.
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const method = String(options.method || "GET").toUpperCase();
  if (options.body && !isFormData && !headers.has("Content-Type") && method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  const url = `${API_BASE}${normalizePath(path)}`;

  const res = await fetch(url, {
    ...options,
    headers,
    // Keep follow; redirects should now not happen due to normalization.
    redirect: options.redirect || "follow",
  });

  if (res.status === 401) {
    const detail = await readErrorDetail(res);
    console.error("401 from API", normalizePath(path), {
      userEmail,
      hasToken: Boolean(token),
      detail,
    });

    clearCurrentUser();
    return res;
  }

  return res;
}