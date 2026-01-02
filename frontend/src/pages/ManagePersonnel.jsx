import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";
import { apiFetch } from "../api/apiFetch";

export default function ManagePersonnelPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const roleUpper = (user?.role || "").toUpperCase();

  const [capLoading, setCapLoading] = useState(false);
  const [capError, setCapError] = useState("");
  const [caps, setCaps] = useState(null);

  const canView = roleUpper === "ADMIN" || roleUpper === "HR" || roleUpper === "OPS_MANAGER";

  useEffect(() => {
    let alive = true;

    (async () => {
      setCapLoading(true);
      setCapError("");
      try {
        const res = await apiFetch("/api/auth/capabilities");
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Failed to load capabilities (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (!alive) return;
        setCaps(data);
      } catch (e) {
        if (!alive) return;
        setCapError(e?.message || "Failed to load capabilities");
      } finally {
        if (!alive) return;
        setCapLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!canView) {
    return (
      <div style={{ maxWidth: "900px" }}>
        <h1 style={{ marginBottom: "0.25rem" }}>Manage Personnel</h1>
        <div style={{ color: "#6b7280" }}>Access denied.</div>
      </div>
    );
  }

  const pageStyle = {
    maxWidth: "980px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1rem",
    marginTop: "0.25rem",
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
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
    marginTop: "0.5rem",
    padding: "0.5rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    width: "fit-content",
  };

  const disabledBtnStyle = {
    ...btnStyle,
    background: "#f3f4f6",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
    cursor: "not-allowed",
  };

  const canUpdateUsers = !!caps?.can_update_users || roleUpper === "ADMIN" || roleUpper === "HR";
  const canCreateUsers = !!caps?.can_create_users || roleUpper === "ADMIN";
  const canViewUsers = !!caps?.can_view_users || canView;

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: "0.25rem" }}>Manage Personnel</h1>
          <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            Staff tools: users, workload, permissions.
          </div>
          <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Logged in as <b>{user?.email || "—"}</b> ({roleUpper || "—"})
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button style={btnStyle} onClick={() => navigate("/admin")}>Back to Admin</button>
        </div>
      </div>

      {(capLoading || capError) && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            color: "#6b7280",
            fontSize: "0.9rem",
          }}
        >
          {capLoading ? "Loading access…" : null}
          {capError ? `⚠️ ${capError}` : null}
        </div>
      )}

      <div style={gridStyle}>
        {/* USERS */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Users</div>
          <div style={cardDescStyle}>
            Create accounts, edit name/role, activate/deactivate, reset passwords.
          </div>
          {canViewUsers ? (
            <button style={btnStyle} onClick={() => navigate("/admin/users")}>
              Open
            </button>
          ) : (
            <button style={disabledBtnStyle} disabled>
              No access
            </button>
          )}
          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            {canCreateUsers ? "Create: enabled" : "Create: admin-only"} · {canUpdateUsers ? "Update: enabled" : "Update: read-only"}
          </div>
        </div>

        {/* WORKLOAD */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Workload</div>
          <div style={cardDescStyle}>
            Global workload summary + jump into assignments.
          </div>
          <button style={btnStyle} onClick={() => navigate("/admin/workload")}>
            Open
          </button>
        </div>

        {/* PERMISSIONS */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Permissions</div>
          <div style={cardDescStyle}>
            Role-based permissions viewer now. Per-user overrides later.
          </div>
          {roleUpper === "ADMIN" ? (
            <button style={btnStyle} onClick={() => navigate("/admin/permissions")}>
              Open
            </button>
          ) : (
            <button style={disabledBtnStyle} disabled>
              Admin only
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
        Next: polish AdminUsers actions + then wire AccountPage (My Account, My Queue, Alerts).
      </div>
    </div>
  );
}