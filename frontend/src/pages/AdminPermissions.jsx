import React from "react";

export default function AdminPermissions() {
  return (
    <div style={{ maxWidth: "980px" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Permissions</h1>
      <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
        Coming next. Right now permissions are role-based (RBAC). Later we can add per-user overrides + an editor UI.
      </div>

      <div
        style={{
          marginTop: "1rem",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "1rem",
          color: "#374151",
        }}
      >
        <div style={{ fontWeight: 650, marginBottom: "0.5rem" }}>What we’ll implement here</div>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#6b7280" }}>
          <li>Role → permissions viewer (read-only)</li>
          <li>Optional: user-level permission overrides (later)</li>
          <li>Audit trail for changes (later)</li>
        </ul>
      </div>
    </div>
  );
}
