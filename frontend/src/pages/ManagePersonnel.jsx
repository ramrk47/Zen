// src/pages/ManagePersonnel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";
const ROADMAP_KEY = "zen_manage_personnel_roadmap_v1";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "ADMIN (owner)" },
  { value: "OPS_MANAGER", label: "OPS_MANAGER (ops control)" },
  { value: "ASSISTANT_VALUER", label: "ASSISTANT_VALUER (office valuer)" },
  { value: "FIELD_VALUER", label: "FIELD_VALUER (site visits)" },
  { value: "FINANCE", label: "FINANCE (billing + collections)" },
  { value: "HR", label: "HR (people + access)" },
  { value: "EMPLOYEE", label: "EMPLOYEE (legacy placeholder)" },
];

const DEFAULT_ROADMAP = [
  {
    group: "Foundations (RBAC + Accounts)",
    items: [
      { id: "rbac_roles", label: "Define roles list (ADMIN, OPS_MANAGER, ASSISTANT_VALUER, FIELD_VALUER, FINANCE, HR)", done: false },
      { id: "rbac_permissions", label: "Create permissions model (db-driven) + role-permission mapping", done: false },
      { id: "auth_current_user", label: "Upgrade getCurrentUser payload to include permissions (can('x'))", done: false },
      { id: "user_list_api", label: "Add backend endpoint to list users (admin/HR only)", done: false },
      { id: "user_deactivate", label: "Deactivate / activate users (no hard delete)", done: false },
      { id: "user_reset_pw", label: "Reset password flow (admin action)", done: false },
    ],
  },
  {
    group: "Assignments Ownership + Workload",
    items: [
      { id: "ass_created_by", label: "Assignment created_by_user_id tracked", done: false },
      { id: "ass_assigned_to", label: "Assignment assigned_to_user_id + reassignment audit", done: false },
      { id: "workload_summary", label: "Workload counts per user (pending / completed / unpaid)", done: false },
      { id: "workload_view", label: "Manage Personnel shows workload tiles per user", done: false },
      { id: "field_valuer_scope", label: "Field valuer sees only assigned cases by default", done: false },
    ],
  },
  {
    group: "Finance / Invoice System (later but tracked here)",
    items: [
      { id: "invoice_number_rule", label: "Invoice number = assignment_code (VAL/2025/0001)", done: false },
      { id: "invoice_generate", label: "Generate invoice from assignment data (PDF export)", done: false },
      { id: "invoice_paid_flag", label: "Paid/unpaid workflow (completed + unpaid = special bucket)", done: false },
      { id: "collections_notes", label: "Collections notes + last follow-up date", done: false },
      { id: "finance_permissions", label: "FINANCE can mark paid but cannot edit technical fields", done: false },
    ],
  },
];

function loadRoadmap() {
  try {
    const raw = localStorage.getItem(ROADMAP_KEY);
    if (!raw) return DEFAULT_ROADMAP;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ROADMAP;
    return parsed;
  } catch {
    return DEFAULT_ROADMAP;
  }
}

function saveRoadmap(next) {
  try {
    localStorage.setItem(ROADMAP_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function ManagePersonnelPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  // Create user form
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ASSISTANT_VALUER");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Roadmap tracker
  const [roadmap, setRoadmap] = useState(() => loadRoadmap());
  const [roadmapSavedToast, setRoadmapSavedToast] = useState("");

  // Users list placeholder (soft fail until endpoint exists)
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [users, setUsers] = useState([]);

  const authedFetch = async (url, opts = {}) => {
    if (!userEmail) throw new Error("Not authenticated");
    const headers = { ...(opts.headers || {}), "X-User-Email": userEmail };
    return fetch(url, { ...opts, headers });
  };

  // Persist roadmap changes
  useEffect(() => {
    saveRoadmap(roadmap);
    setRoadmapSavedToast("Saved");
    const t = setTimeout(() => setRoadmapSavedToast(""), 900);
    return () => clearTimeout(t);
  }, [roadmap]);

  // Attempt load users (soft fail)
  useEffect(() => {
    const loadUsers = async () => {
      if (!userEmail) return;
      if (!isAdmin) return;

      setUsersLoading(true);
      setUsersError("");
      setUsers([]);

      try {
        // Placeholder endpoint name. You can rename later.
        // Implement later: GET /api/auth/users (admin only)
        const res = await authedFetch(`${API_BASE}/api/auth/users`);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Users list not connected (HTTP ${res.status})`);
        }
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        setUsersError(e?.message || "Users list not connected yet.");
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, isAdmin]);

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (!password.trim()) return false;
    // Allow any role option we show in UI.
    return ROLE_OPTIONS.some((r) => r.value === role);
  }, [email, password, role]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setStatus("");

    if (!isAdmin) {
      setStatus("❌ Only ADMIN can create users.");
      return;
    }
    if (!userEmail) {
      setStatus("❌ Missing logged-in admin identity. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          full_name: fullName.trim() ? fullName.trim() : null,
          password,
          role,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.detail === "string" ? data.detail : "Failed to create user";
        throw new Error(msg);
      }

      setStatus(`✅ User created: ${data.email} (${data.role})`);
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("ASSISTANT_VALUER");

      // Soft refresh users list if endpoint exists
      try {
        const ures = await authedFetch(`${API_BASE}/api/auth/users`);
        if (ures.ok) {
          const udata = await ures.json();
          setUsers(Array.isArray(udata) ? udata : []);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleRoadmapItem = (groupIndex, itemId) => {
    setRoadmap((prev) => {
      const next = prev.map((g, gi) => {
        if (gi !== groupIndex) return g;
        return {
          ...g,
          items: g.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
        };
      });
      return next;
    });
  };

  const roadmapProgress = useMemo(() => {
    const all = roadmap.flatMap((g) => g.items);
    const total = all.length || 1;
    const done = all.filter((i) => i.done).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [roadmap]);

  // ---------- Styles ----------
  const pageStyle = { maxWidth: "980px", display: "flex", flexDirection: "column", gap: "1rem" };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "1rem",
    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
  };

  const rowStyle = { display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" };

  const btnStyle = {
    padding: "0.5rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  };

  const secondaryBtnStyle = { ...btnStyle, background: "#fff", color: "#111827" };

  const disabledBtnStyle = {
    ...btnStyle,
    background: "#f3f4f6",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
    cursor: "not-allowed",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.55rem 0.65rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    background: "#fff",
  };

  const labelStyle = { fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.35rem" };
  const muted = { color: "#6b7280", fontSize: "0.92rem" };

  const formStyle = { display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" };

  const grid2 = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "0.9rem",
    marginTop: "0.75rem",
  };

  const pillStyle = (bg, fg) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "0.25rem 0.6rem",
    borderRadius: "999px",
    fontSize: "0.78rem",
    background: bg,
    color: fg,
    border: "1px solid rgba(0,0,0,0.06)",
    fontWeight: 650,
    lineHeight: 1,
  });

  if (!userEmail) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Not logged in</h2>
          <div style={muted}>Please login again.</div>
          <button style={{ ...btnStyle, marginTop: "0.75rem" }} onClick={() => navigate("/login")}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={rowStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Manage Personnel</h1>
          <div style={{ ...muted, marginTop: "0.25rem" }}>
            Accounts + roles + workload (this becomes your control room).
          </div>
        </div>

        <button style={secondaryBtnStyle} onClick={() => navigate("/settings")}>
          ← Back to Settings
        </button>
      </div>

      {!isAdmin ? (
        <div style={cardStyle}>
          <div style={{ fontWeight: 800 }}>Restricted</div>
          <div style={{ ...muted, marginTop: "0.25rem" }}>
            You are not an admin. This page is admin-only for now.
          </div>
        </div>
      ) : (
        <>
          {/* Roadmap / Tracker */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Roadmap Tracker</h2>
                <div style={muted}>
                  Toggle items as we build. Stored locally (so you can track without backend changes).
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <span style={pillStyle("#f3f4f6", "#111827")}>
                  Progress: {roadmapProgress.done}/{roadmapProgress.total} ({roadmapProgress.pct}%)
                </span>
                {roadmapSavedToast ? <span style={pillStyle("#ecfdf5", "#065f46")}>{roadmapSavedToast}</span> : null}
              </div>
            </div>

            <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.85rem" }}>
              {roadmap.map((group, gi) => (
                <div key={group.group} style={{ border: "1px solid #e5e7eb", borderRadius: "14px", padding: "0.85rem", background: "#fff" }}>
                  <div style={{ fontWeight: 900 }}>{group.group}</div>
                  <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.45rem" }}>
                    {group.items.map((it) => (
                      <label
                        key={it.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.55rem",
                          padding: "0.45rem 0.55rem",
                          borderRadius: "12px",
                          border: "1px solid #f1f5f9",
                          background: it.done ? "#f0fdf4" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!it.done}
                          onChange={() => toggleRoadmapItem(gi, it.id)}
                        />
                        <span style={{ color: "#111827", fontWeight: it.done ? 800 : 600 }}>
                          {it.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create user */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Create Account</h2>
                <div style={muted}>
                  Minimal for now. Later: reset password, deactivate users, granular permissions.
                </div>
              </div>
              <span style={pillStyle("#f3f4f6", "#111827")}>Admin only</span>
            </div>

            <form onSubmit={handleCreateUser} style={formStyle}>
              <div style={grid2}>
                <div>
                  <div style={labelStyle}>Email *</div>
                  <input
                    type="email"
                    style={inputStyle}
                    placeholder="employee@example.com"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <div style={labelStyle}>Full name (optional)</div>
                  <input
                    type="text"
                    style={inputStyle}
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <div style={labelStyle}>Password *</div>
                  <input
                    type="password"
                    style={inputStyle}
                    placeholder="Set a password"
                    value={password}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <div style={labelStyle}>Role *</div>
                  <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                style={{
                  ...btnStyle,
                  background: loading || !canSubmit ? "#9ca3af" : "#111827",
                  cursor: loading || !canSubmit ? "not-allowed" : "pointer",
                  width: "fit-content",
                }}
              >
                {loading ? "Creating…" : "Create User"}
              </button>
            </form>

            {status && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  fontSize: "0.9rem",
                }}
              >
                {status}
              </div>
            )}
          </div>

          {/* Users list (placeholder) */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Personnel List</h2>
                <div style={muted}>
                  Placeholder until we connect the “list users” endpoint. This section will also show workload later.
                </div>
              </div>
              <span style={pillStyle("#f3f4f6", "#111827")}>Future: workload + deactivate</span>
            </div>

            {usersLoading && <div style={{ ...muted, marginTop: "0.75rem" }}>Loading users…</div>}

            {!usersLoading && usersError && (
              <div style={{ marginTop: "0.75rem", color: "#b45309", fontSize: "0.92rem" }}>
                ⚠️ {usersError}
              </div>
            )}

            {!usersLoading && !usersError && users.length === 0 && (
              <div style={{ ...muted, marginTop: "0.75rem" }}>No users found (or endpoint not returning data).</div>
            )}

            {!usersLoading && !usersError && users.length > 0 && (
              <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.65rem" }}>
                {users.map((u) => (
                  <div
                    key={u.id || u.email}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "14px",
                      padding: "0.85rem",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                      alignItems: "center",
                      background: "#fff",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>{u.full_name || u.email || "User"}</div>
                      <div style={muted}>{u.email}</div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={pillStyle("#f3f4f6", "#111827")}>{(u.role || "—").toUpperCase()}</span>
                      <button style={disabledBtnStyle} disabled>
                        Workload (next)
                      </button>
                      <button style={disabledBtnStyle} disabled>
                        Deactivate (next)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ManagePersonnelPage;