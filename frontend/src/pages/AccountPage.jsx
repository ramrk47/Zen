

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getCurrentUser } from "../auth/currentUser";
import { apiFetch } from "../api/apiFetch";

function ManagePersonalPage() {
  const navigate = useNavigate();
  const sessionUser = getCurrentUser();

  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState("");
  const [me, setMe] = useState(null);

  const [capLoading, setCapLoading] = useState(false);
  const [capError, setCapError] = useState("");
  const [capabilities, setCapabilities] = useState(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summary, setSummary] = useState(null);

  // Change password modal
  const [showPw, setShowPw] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwOk, setPwOk] = useState("");

  const roleUpper = useMemo(() => (me?.role || sessionUser?.role || "").toUpperCase(), [me?.role, sessionUser?.role]);
  // Role is currently informational on this page

  const perms = useMemo(() => {
    const p = me?.permissions;
    return Array.isArray(p) ? p : [];
  }, [me?.permissions]);

  const cap = (key) => {
    const src = capabilities || {};
    if (typeof src[key] === "boolean") return src[key];
    if (src.capabilities && typeof src.capabilities[key] === "boolean") return src.capabilities[key];
    return null;
  };

  const pageStyle = {
    maxWidth: "980px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1rem",
    marginTop: "0.75rem",
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
  };

  const cardTitleStyle = {
    fontSize: "1rem",
    fontWeight: 650,
  };

  const cardDescStyle = {
    fontSize: "0.9rem",
    color: "#6b7280",
    lineHeight: 1.35,
  };

  const btnStyle = {
    padding: "0.5rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    width: "fit-content",
  };

  const secondaryBtnStyle = {
    ...btnStyle,
    background: "#fff",
    color: "#111827",
  };

  const disabledBtnStyle = {
    ...btnStyle,
    background: "#f3f4f6",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
    cursor: "not-allowed",
  };

  const pillStyle = (bg, fg) => ({
    padding: "0.2rem 0.5rem",
    borderRadius: "999px",
    background: bg,
    color: fg,
    fontSize: "0.8rem",
    border: "1px solid rgba(0,0,0,0.06)",
    width: "fit-content",
  });

  const keyRowStyle = {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    gap: "0.5rem",
    fontSize: "0.9rem",
  };

  const modalOverlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(17,24,39,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 50,
  };

  const modalCard = {
    width: "min(560px, 100%)",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "1rem",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.6rem 0.7rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    outline: "none",
    fontSize: "0.95rem",
  };

  const refreshAll = async () => {
    await Promise.all([loadMe(), loadCapabilities(), loadSummary()]);
  };

  const loadMe = async () => {
    setMeLoading(true);
    setMeError("");
    try {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to load profile (HTTP ${res.status})`);
      }
      const data = await res.json();
      setMe(data || null);
    } catch (e) {
      setMe(null);
      setMeError(e?.message || "Failed to load profile.");
    } finally {
      setMeLoading(false);
    }
  };

  const loadCapabilities = async () => {
    setCapLoading(true);
    setCapError("");
    try {
      const res = await apiFetch("/api/auth/capabilities");
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to load capabilities (HTTP ${res.status})`);
      }
      const data = await res.json().catch(() => ({}));
      setCapabilities(data || null);
    } catch (e) {
      setCapabilities(null);
      setCapError(e?.message || "Failed to load capabilities.");
    } finally {
      setCapLoading(false);
    }
  };

  const loadSummary = async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      // Safe even if backend isn’t ready; we show a non-blocking error.
      const res = await apiFetch("/api/assignments/summary");
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to load summary (HTTP ${res.status})`);
      }
      const data = await res.json();
      setSummary(data || null);
    } catch (e) {
      setSummary(null);
      setSummaryError(e?.message || "Failed to load summary.");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    // If no session user, user is not logged in or storage cleared.
    // Don’t hard-redirect here to avoid loops; show a gentle hint.
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetPwModal = () => {
    setPwCurrent("");
    setPwNew("");
    setPwNew2("");
    setPwError("");
    setPwOk("");
  };

  const openPwModal = () => {
    resetPwModal();
    setShowPw(true);
  };

  const closePwModal = () => {
    setShowPw(false);
  };

  const changePassword = async () => {
    setPwError("");
    setPwOk("");

    if (!pwCurrent.trim()) {
      setPwError("Enter your current password.");
      return;
    }
    if (!pwNew.trim() || pwNew.trim().length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (pwNew !== pwNew2) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await apiFetch("/api/auth/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: pwCurrent,
          new_password: pwNew,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Password change failed (HTTP ${res.status})`);
      }

      setPwOk("Password changed. Use the new password next login.");
      setPwCurrent("");
      setPwNew("");
      setPwNew2("");
    } catch (e) {
      setPwError(e?.message || "Password change failed.");
    } finally {
      setPwSaving(false);
    }
  };

  const permissionPreview = useMemo(() => {
    const list = [...perms].filter(Boolean).sort();
    return list;
  }, [perms]);

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: "0.25rem" }}>My Account</h1>
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            Logged in as <b>{me?.email || sessionUser?.email || "User"}</b> ({me?.role || sessionUser?.role || "—"})
          </div>
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {meLoading ? <span style={pillStyle("#f3f4f6", "#111827")}>Loading profile…</span> : null}
            {meError ? <span style={pillStyle("#fef3c7", "#92400e")}>⚠️ Profile: {meError}</span> : null}
            {capLoading ? <span style={pillStyle("#f3f4f6", "#111827")}>Loading access…</span> : null}
            {capError ? <span style={pillStyle("#fef3c7", "#92400e")}>⚠️ Access: {capError}</span> : null}
            {roleUpper ? <span style={pillStyle("#eef2ff", "#3730a3")}>{roleUpper}</span> : null}
            {(sessionUser?.token || sessionUser?.access_token) ? null : (
              <span style={pillStyle("#fee2e2", "#991b1b")}>
                No token found — you may need to login again.
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button style={secondaryBtnStyle} onClick={() => navigate("/home")}>Back</button>
          <button style={secondaryBtnStyle} onClick={refreshAll}>Refresh</button>
        </div>
      </div>

      <div style={gridStyle}>
        {/* PROFILE */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>My Account</div>
          <div style={cardDescStyle}>Basic account info pulled from <code>/api/auth/me</code>.</div>

          <div style={keyRowStyle}>
            <div style={{ color: "#6b7280" }}>Name</div>
            <div><b>{me?.full_name || "—"}</b></div>
          </div>
          <div style={keyRowStyle}>
            <div style={{ color: "#6b7280" }}>Email</div>
            <div>{me?.email || sessionUser?.email || "—"}</div>
          </div>
          <div style={keyRowStyle}>
            <div style={{ color: "#6b7280" }}>Role</div>
            <div>{roleUpper || "—"}</div>
          </div>
          <div style={keyRowStyle}>
            <div style={{ color: "#6b7280" }}>Status</div>
            <div>{me?.is_active === false ? "Inactive" : "Active"}</div>
          </div>

          {/* Optional: keep permissions visible but lightweight */}
          {permissionPreview.length > 0 ? (
            <details style={{ marginTop: "0.25rem" }}>
              <summary style={{ cursor: "pointer", color: "#6b7280", fontSize: "0.9rem" }}>
                View permissions
              </summary>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
                {permissionPreview.map((p) => (
                  <span key={p} style={pillStyle("#f3f4f6", "#111827")}>{p}</span>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        {/* SECURITY */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Security</div>
          <div style={cardDescStyle}>Change your password using <code>/api/auth/me/change-password</code>.</div>
          <button style={btnStyle} onClick={openPwModal}>Change Password</button>
          <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            Tip: choose a strong password and don’t reuse old ones.
          </div>
        </div>

        {/* MY WORK QUEUE */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>My Work Queue</div>
          <div style={cardDescStyle}>
            View assignments you need to act on. (User-assignment filtering comes after assignment↔user wiring.)
          </div>

          {summaryLoading ? (
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Loading summary…</div>
          ) : summaryError ? (
            <div style={{ color: "#92400e", fontSize: "0.9rem" }}>⚠️ {summaryError}</div>
          ) : summary ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.5rem" }}>
              {Object.entries(summary).slice(0, 6).map(([k, v]) => (
                <div key={k} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{k}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{String(v)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>No summary yet.</div>
          )}

          <button style={secondaryBtnStyle} onClick={() => navigate("/assignments")}>Open Assignments</button>
        </div>

        {/* ALERTS */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Alerts</div>
          <div style={cardDescStyle}>
            Due-date reminders and automation hooks (coming later).
          </div>
          <button style={disabledBtnStyle} disabled>
            Coming later
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPw ? (
        <div style={modalOverlay} onMouseDown={(e) => {
          // click outside closes
          if (e.target === e.currentTarget) closePwModal();
        }}>
          <div style={modalCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>Change Password</div>
                <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>This updates your login password.</div>
              </div>
              <button style={secondaryBtnStyle} onClick={closePwModal}>Close</button>
            </div>

            {pwError ? <div style={{ color: "#991b1b", fontSize: "0.9rem" }}>⚠️ {pwError}</div> : null}
            {pwOk ? <div style={{ color: "#065f46", fontSize: "0.9rem" }}>✅ {pwOk}</div> : null}

            <div style={{ display: "grid", gap: "0.6rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.25rem" }}>Current password</div>
                <input style={inputStyle} type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.25rem" }}>New password</div>
                <input style={inputStyle} type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.25rem" }}>Confirm new password</div>
                <input style={inputStyle} type="password" value={pwNew2} onChange={(e) => setPwNew2(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button style={secondaryBtnStyle} onClick={resetPwModal} disabled={pwSaving}>Clear</button>
              <button style={btnStyle} onClick={changePassword} disabled={pwSaving}>
                {pwSaving ? "Saving…" : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ManagePersonalPage;