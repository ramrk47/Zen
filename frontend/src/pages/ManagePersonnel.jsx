// src/pages/ManagePersonnel.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";

function ManagePersonnelPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const pageStyle = {
    maxWidth: "720px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1rem",
  };

  const rowStyle = {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const btnStyle = {
    padding: "0.5rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  };

  const secondaryBtnStyle = {
    ...btnStyle,
    background: "#fff",
    color: "#111827",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.55rem 0.65rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
  };

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginTop: "0.75rem",
  };

  const canSubmit = useMemo(() => {
    return (
      !!email.trim() &&
      !!password.trim() &&
      (role === "ADMIN" || role === "EMPLOYEE")
    );
  }, [email, password, role]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setStatus("");

    if (!isAdmin) {
      setStatus("❌ Only ADMIN can create users.");
      return;
    }

    const adminPassword = window.prompt("Enter your admin password to confirm:");
    if (!adminPassword) {
      setStatus("❌ Cancelled (admin password required).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Email": user.email,
          "X-Admin-Password": adminPassword,
        },
        body: JSON.stringify({
          email: email.trim(),
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
      setRole("EMPLOYEE");
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={rowStyle}>
        <div>
          <h1 style={{ marginBottom: "0.25rem" }}>Manage Personnel</h1>
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            Admin-only: create accounts (employees/admins).
          </div>
        </div>

        <button style={secondaryBtnStyle} onClick={() => navigate("/settings")}>
          ← Back to Settings
        </button>
      </div>

      {!isAdmin ? (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "#6b7280" }}>You are not an admin. This page is restricted.</p>
        </div>
      ) : (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Create User</h2>

          <form onSubmit={handleCreateUser} style={formStyle}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.35rem" }}>
                Email
              </div>
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
              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.35rem" }}>
                Full name (optional)
              </div>
              <input
                type="text"
                style={inputStyle}
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.35rem" }}>
                Password
              </div>
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
              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.35rem" }}>
                Role
              </div>
              <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </select>
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

          <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#6b7280" }}>
            Next upgrades (later): list users, deactivate users, change roles, reset passwords.
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagePersonnelPage;
