import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";
import { apiFetch } from "../api/apiFetch";

function AdminDashboardPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const roleUpper = (user?.role || "").toUpperCase();

  // Prefer backend capabilities so UI stays consistent with enforcement
  const [capabilities, setCapabilities] = useState(null);
  const [capLoading, setCapLoading] = useState(false);
  const [capError, setCapError] = useState("");

  const cap = (key) => {
    const src = capabilities || {};
    if (typeof src[key] === "boolean") return src[key];
    if (src.capabilities && typeof src.capabilities[key] === "boolean") return src.capabilities[key];
    return null;
  };

  const canViewUsers = cap("can_view_users") ?? (roleUpper === "ADMIN" || roleUpper === "HR" || roleUpper === "OPS_MANAGER");
  const canCreateUsers = cap("can_create_users") ?? (roleUpper === "ADMIN");
  const canUpdateUsers = cap("can_update_users") ?? (roleUpper === "ADMIN" || roleUpper === "HR");
  const canChangeRoles = cap("can_change_roles") ?? (roleUpper === "ADMIN");
  const opsReadOnly = cap("ops_read_only") ?? (roleUpper === "OPS_MANAGER");

  const isAdmin = roleUpper === "ADMIN";
  const isHR = roleUpper === "HR";
  const isOps = roleUpper === "OPS_MANAGER";

  const pageStyle = {
    maxWidth: "900px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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

  useEffect(() => {
    if (!user?.email) return;
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
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        setCapabilities(data);
      } catch (e) {
        if (!alive) return;
        setCapabilities(null);
        setCapError(e?.message || "Failed to load capabilities.");
      } finally {
        if (!alive) return;
        setCapLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>Admin</h1>
        <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
          Logged in as <b>{user?.email || "User"}</b> ({user?.role || "—"})
        </div>
      </div>

      {(capLoading || capError || !isAdmin) && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            color: "#6b7280",
            fontSize: "0.9rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {capLoading ? <span>Loading access…</span> : null}
          {capError ? <span>⚠️ Access info: {capError}</span> : null}
          {!isAdmin ? <span>You are not an admin. Admin tools are hidden.</span> : null}
        </div>
      )}

      <div style={gridStyle}>
        {/* PERSONNEL */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Manage Personnel</div>
          <div style={cardDescStyle}>
            Create employee/admin accounts. Deactivate users, reset passwords, role changes.
          </div>
          {isAdmin ? (
            <button style={btnStyle} onClick={() => navigate("/admin/personnel")}>
              Open
            </button>
          ) : (
            <button style={disabledBtnStyle} disabled>
              Admin only
            </button>
          )}
        </div>

        {/* WORKLOAD (quick access) */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Workload</div>
          <div style={cardDescStyle}>
            Global workload overview + quick jump into Assignments.
          </div>
          {isAdmin ? (
            <button style={btnStyle} onClick={() => navigate("/admin/workload")}>
              Open
            </button>
          ) : (
            <button style={disabledBtnStyle} disabled>
              Admin only
            </button>
          )}
        </div>

        {/* BANKS & BRANCHES */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Banks & Branches</div>
          <div style={cardDescStyle}>
            Manage banks, bank account details, and branches with contacts & addresses.
          </div>
          {isAdmin ? (
            <button style={btnStyle} onClick={() => navigate("/admin/banks")}>
              Open
            </button>
          ) : (
            <button style={disabledBtnStyle} disabled>
              Admin only
            </button>
          )}
        </div>

        {/* MASTER DATA */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Master Data</div>
          <div style={cardDescStyle}>
            Maintain Clients and Property Types used in New Assignment dropdowns.
          </div>
          {isAdmin ? (
            <button style={btnStyle} onClick={() => navigate("/admin/master")}>
              Open
            </button>
          ) : (
            <button style={disabledBtnStyle} disabled>
              Admin only
            </button>
          )}
        </div>

        {/* FUTURE */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Alerts & Automation</div>
          <div style={cardDescStyle}>
            Branch frequency alerts, revenue tracking, and automation hooks.
          </div>
          <button style={disabledBtnStyle} disabled>
            Coming later
          </button>
        </div>
      </div>

      <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.5rem" }}>
        Flow: Admin → Personnel / Banks / Master Data.
      </div>
    </div>
  );
}

export default AdminDashboardPage;