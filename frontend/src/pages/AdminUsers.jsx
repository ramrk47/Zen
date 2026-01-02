import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/apiFetch";
import { getCurrentUser } from "../auth/currentUser";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "ADMIN" },
  { value: "OPS_MANAGER", label: "OPS_MANAGER" },
  { value: "ASSISTANT_VALUER", label: "ASSISTANT_VALUER" },
  { value: "FIELD_VALUER", label: "FIELD_VALUER" },
  { value: "FINANCE", label: "FINANCE" },
  { value: "HR", label: "HR" },
  { value: "EMPLOYEE", label: "EMPLOYEE" },
];

export default function AdminUsers() {
  const currentUser = getCurrentUser();
  const roleUpper = (currentUser?.role || "").toUpperCase();
  const isAdmin = roleUpper === "ADMIN";
  const isHR = roleUpper === "HR";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [cEmail, setCEmail] = useState("");
  const [cName, setCName] = useState("");
  const [cRole, setCRole] = useState("EMPLOYEE");
  const [cPassword, setCPassword] = useState("");

  // Reset password modal
  const [showReset, setShowReset] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  // Inline editing
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("EMPLOYEE");

  const canEdit = isAdmin || isHR;
  const canChangeRoles = isAdmin;
  const canCreate = isAdmin;

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => (a.id || 0) - (b.id || 0));
  }, [users]);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/users");
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to fetch users (HTTP ${res.status})`);
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Error loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const pageStyle = {
    maxWidth: "1150px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  };

  const topRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "1rem",
    flexWrap: "wrap",
  };

  const btnStyle = {
    padding: "0.5rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    width: "fit-content",
    fontSize: "0.9rem",
  };

  const secondaryBtnStyle = {
    ...btnStyle,
    background: "#fff",
    color: "#111827",
  };

  const dangerBtnStyle = {
    ...btnStyle,
    background: "#991b1b",
    border: "1px solid #7f1d1d",
  };

  const disabledBtnStyle = {
    ...btnStyle,
    background: "#f3f4f6",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
    cursor: "not-allowed",
  };

  const tableWrapStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const cell = {
    padding: "0.6rem 0.75rem",
    borderBottom: "1px solid #e5e7eb",
    textAlign: "left",
    fontSize: "0.9rem",
    verticalAlign: "top",
  };

  const headerCell = {
    ...cell,
    fontWeight: 650,
    background: "#f9fafb",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.45rem 0.6rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "0.9rem",
  };

  const modalOverlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 50,
  };

  const modalCard = {
    width: "min(560px, 100%)",
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    padding: "1rem",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setEditName(u.full_name || "");
    setEditRole((u.role || "EMPLOYEE").toUpperCase());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditRole("EMPLOYEE");
  };

  const saveEdit = async (u) => {
    if (!canEdit) return;
    setBusyId(u.id);
    setError("");
    try {
      const payload = {};
      payload.full_name = editName;
      if (canChangeRoles) payload.role = editRole;

      const res = await apiFetch(`/api/auth/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Update failed (HTTP ${res.status})`);
      }
      setToast("User updated");
      cancelEdit();
      await loadUsers();
    } catch (e) {
      setError(e?.message || "Failed to update user");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (u, nextActive) => {
    if (!canEdit) return;
    setBusyId(u.id);
    setError("");
    try {
      const res = await apiFetch(`/api/auth/users/${u.id}/toggle-active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !!nextActive }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Toggle failed (HTTP ${res.status})`);
      }
      setToast(nextActive ? "Activated" : "Deactivated");
      await loadUsers();
    } catch (e) {
      setError(e?.message || "Failed to change active status");
    } finally {
      setBusyId(null);
    }
  };

  const openReset = (u) => {
    setResetTarget(u);
    setNewPassword("");
    setStaffPassword("");
    setShowReset(true);
  };

  const doReset = async () => {
    if (!resetTarget) return;
    setBusyId(resetTarget.id);
    setError("");
    try {
      const res = await apiFetch(`/api/auth/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_password: newPassword,
          staff_password: staffPassword,
          confirm: "RESET",
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Reset failed (HTTP ${res.status})`);
      }
      setToast("Password reset");
      setShowReset(false);
      setResetTarget(null);
      setNewPassword("");
      setStaffPassword("");
    } catch (e) {
      setError(e?.message || "Failed to reset password");
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => {
    setCEmail("");
    setCName("");
    setCRole("EMPLOYEE");
    setCPassword("");
    setShowCreate(true);
  };

  const doCreate = async () => {
    if (!canCreate) return;
    setBusyId("create");
    setError("");
    try {
      const res = await apiFetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cEmail,
          full_name: cName,
          role: cRole,
          password: cPassword,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Create failed (HTTP ${res.status})`);
      }
      setToast("User created");
      setShowCreate(false);
      await loadUsers();
    } catch (e) {
      setError(e?.message || "Failed to create user");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={topRowStyle}>
        <div>
          <h1 style={{ marginBottom: "0.25rem" }}>Users</h1>
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            Create accounts, edit details, activate/deactivate, and reset passwords.
          </div>
          <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Logged in as <b>{currentUser?.email || "—"}</b> ({roleUpper || "—"})
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button style={secondaryBtnStyle} onClick={loadUsers} disabled={loading}>
            Refresh
          </button>

          {canCreate ? (
            <button style={btnStyle} onClick={openCreate}>
              + Create User
            </button>
          ) : (
            <button style={disabledBtnStyle} disabled>
              Create (Admin only)
            </button>
          )}
        </div>
      </div>

      {toast ? (
        <div style={{ padding: "0.6rem 0.75rem", borderRadius: "12px", background: "#ecfeff", border: "1px solid #cffafe", color: "#155e75" }}>
          {toast}
        </div>
      ) : null}

      {loading ? <div>Loading users…</div> : null}
      {error ? <div style={{ color: "crimson" }}>{error}</div> : null}

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCell}>ID</th>
              <th style={headerCell}>Email</th>
              <th style={headerCell}>Name</th>
              <th style={headerCell}>Role</th>
              <th style={headerCell}>Active</th>
              <th style={headerCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u) => {
              const isEditing = editingId === u.id;
              const isBusy = busyId === u.id;
              const isTargetAdmin = (u.role || "").toUpperCase() === "ADMIN";

              return (
                <tr key={u.id}>
                  <td style={cell}>{u.id}</td>
                  <td style={cell}>{u.email}</td>

                  <td style={cell}>
                    {isEditing ? (
                      <input
                        style={inputStyle}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Full name"
                      />
                    ) : (
                      <span>{u.full_name || "—"}</span>
                    )}
                  </td>

                  <td style={cell}>
                    {isEditing ? (
                      canChangeRoles ? (
                        <select style={inputStyle} value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: "#6b7280" }}>{(u.role || "—").toUpperCase()}</span>
                      )
                    ) : (
                      <span>{(u.role || "—").toUpperCase()}</span>
                    )}
                  </td>

                  <td style={cell}>{u.is_active ? "Yes" : "No"}</td>

                  <td style={cell}>
                    {!canEdit ? (
                      <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>read-only</span>
                    ) : isEditing ? (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          style={btnStyle}
                          onClick={() => saveEdit(u)}
                          disabled={isBusy}
                          title="Save changes"
                        >
                          Save
                        </button>
                        <button style={secondaryBtnStyle} onClick={cancelEdit} disabled={isBusy}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button style={secondaryBtnStyle} onClick={() => openEdit(u)} disabled={isBusy}>
                          Edit
                        </button>

                        <button
                          style={secondaryBtnStyle}
                          onClick={() => openReset(u)}
                          disabled={isBusy || (isTargetAdmin && !isAdmin)}
                          title={isTargetAdmin && !isAdmin ? "Only ADMIN can reset an ADMIN password" : "Reset password"}
                        >
                          Reset PW
                        </button>

                        {u.is_active ? (
                          <button
                            style={dangerBtnStyle}
                            onClick={() => toggleActive(u, false)}
                            disabled={isBusy || (isTargetAdmin && !isAdmin)}
                            title={isTargetAdmin && !isAdmin ? "Only ADMIN can deactivate an ADMIN" : "Deactivate user"}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            style={btnStyle}
                            onClick={() => toggleActive(u, true)}
                            disabled={isBusy || (isTargetAdmin && !isAdmin)}
                            title={isTargetAdmin && !isAdmin ? "Only ADMIN can activate an ADMIN" : "Activate user"}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
        Order of upgrades: <b>Users</b> (this page) → <b>Workload</b> (already usable) → <b>Permissions editor</b> (later).
      </div>

      {/* CREATE USER MODAL */}
      {showCreate && (
        <div style={modalOverlay} onMouseDown={() => setShowCreate(false)}>
          <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>Create User</div>
                <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Admin only</div>
              </div>
              <button style={secondaryBtnStyle} onClick={() => setShowCreate(false)}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Email</div>
                <input style={inputStyle} value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="name@company.com" />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Role</div>
                <select style={inputStyle} value={cRole} onChange={(e) => setCRole(e.target.value)}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Full name</div>
                <input style={inputStyle} value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Full name" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Temporary password</div>
                <input style={inputStyle} type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} placeholder="Min 6 chars" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button style={secondaryBtnStyle} onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button
                style={btnStyle}
                onClick={doCreate}
                disabled={busyId === "create" || !cEmail.trim() || cPassword.length < 6}
                title={!cEmail.trim() ? "Email required" : cPassword.length < 6 ? "Password too short" : "Create"}
              >
                {busyId === "create" ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showReset && resetTarget && (
        <div style={modalOverlay} onMouseDown={() => setShowReset(false)}>
          <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>Reset Password</div>
                <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  Target: <b>{resetTarget.email}</b>
                </div>
              </div>
              <button style={secondaryBtnStyle} onClick={() => setShowReset(false)}>
                Close
              </button>
            </div>

            <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>New password</div>
                <input
                  style={inputStyle}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 chars"
                />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Your password (staff re-auth)</div>
                <input
                  style={inputStyle}
                  type="password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Re-enter your own password"
                />
              </div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                Confirm is locked to <b>RESET</b> (backend fail-safe).
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button style={secondaryBtnStyle} onClick={() => setShowReset(false)}>
                Cancel
              </button>
              <button
                style={btnStyle}
                onClick={doReset}
                disabled={busyId === resetTarget.id || newPassword.length < 6 || !staffPassword.trim()}
                title={
                  newPassword.length < 6
                    ? "New password too short"
                    : !staffPassword.trim()
                    ? "Staff password required"
                    : "Reset"
                }
              >
                {busyId === resetTarget.id ? "Resetting…" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}