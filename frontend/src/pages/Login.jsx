// src/pages/Login.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setCurrentUser } from "../auth/currentUser";

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

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@zenops.in");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading;
  }, [email, password, loading]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const detail = await readErrorDetail(res);
        setErr(detail || "Invalid credentials.");
        return;
      }

      const data = await res.json();

      // ✅ Backend returns: { access_token, token_type, user: {...} }
      const accessToken = data?.access_token || "";
      const tokenType = data?.token_type || "bearer";
      const user = data?.user || {};

      const userEmail = (user?.email || "").trim();
      if (!userEmail) {
        setErr("Login succeeded but server did not return an email. Cannot continue.");
        return;
      }

      // ✅ Store exact structure used by getCurrentUser()
      setCurrentUser({
        id: user?.id ?? 0,
        email: userEmail,
        full_name: user?.full_name ?? null,
        role: user?.role || "EMPLOYEE",
        is_active: user?.is_active ?? true,
        permissions: Array.isArray(user?.permissions) ? user.permissions : [],
        access_token: accessToken,
        token_type: tokenType,
      });

      navigate("/", { replace: true });
    } catch (e2) {
      console.error(e2);
      setErr("Login failed. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI styles ----------
  const shell = {
    minHeight: "calc(100vh - 40px)",
    display: "grid",
    placeItems: "center",
    padding: "24px",
  };

  const card = {
    width: "min(940px, 100%)",
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    borderRadius: "18px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  };

  const left = {
    padding: "28px",
    background:
      "linear-gradient(135deg, rgba(37,99,235,0.09), rgba(16,185,129,0.07))",
    borderRight: "1px solid #e5e7eb",
  };

  const right = { padding: "28px" };

  const h1 = { margin: 0, fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em" };
  const sub = { marginTop: "8px", marginBottom: "0", color: "#4b5563", lineHeight: 1.5 };

  const tiny = { marginTop: "14px", fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.5 };

  const form = { display: "flex", flexDirection: "column", gap: "12px" };

  const label = { fontSize: "0.8rem", color: "#6b7280", marginBottom: "6px" };

  const input = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    outline: "none",
  };

  const row = { display: "flex", gap: "10px", alignItems: "center" };

  const pill = {
    padding: "8px 10px",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
  };

  const btn = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.98rem",
    cursor: canSubmit ? "pointer" : "not-allowed",
    opacity: canSubmit ? 1 : 0.6,
  };

  const errBox = {
    borderRadius: "12px",
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#991b1b",
    padding: "10px 12px",
    fontSize: "0.92rem",
    whiteSpace: "pre-wrap",
  };

  const hintBox = {
    marginTop: "14px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    padding: "10px 12px",
    color: "#374151",
    fontSize: "0.9rem",
    lineHeight: 1.45,
  };

  return (
    <div style={shell}>
      <div style={card}>
        {/* Left: branding / hints */}
        <div style={left}>
          <h1 style={h1}>Zen Ops</h1>
          <p style={sub}>
            Fast assignment tracking for valuation workflow.
            <br />
            Login to access dashboard, assignments and master data.
          </p>

          <div style={hintBox}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>If login works but pages 401:</div>
            <div>Next step is to send JWT on every API call using:</div>
            <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: "0.86rem", color: "#111827" }}>
              Authorization: Bearer &lt;access_token&gt;
            </div>
          </div>

          <p style={tiny}>
            Debug tip: DevTools → Application → Local Storage → <b>zenops_user</b>.
            You should see email + role + access_token.
          </p>
        </div>

        {/* Right: form */}
        <div style={right}>
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#111827" }}>Login</div>
            <div style={{ marginTop: 4, color: "#6b7280", fontSize: "0.9rem" }}>
              Use your admin credentials.
            </div>
          </div>

          <form onSubmit={onSubmit} style={form}>
            <div>
              <div style={label}>Email</div>
              <input
                style={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="username"
                placeholder="admin@zenops.in"
              />
            </div>

            <div>
              <div style={label}>Password</div>
              <div style={row}>
                <input
                  style={input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  style={pill}
                  onClick={() => setShowPw((v) => !v)}
                  title="Show / hide password"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {err ? <div style={errBox}>{err}</div> : null}

            <button type="submit" disabled={!canSubmit} style={btn}>
              {loading ? "Logging in…" : "Login"}
            </button>

            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              Tip: Email is lowercased server-side, so casing doesn’t matter.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}