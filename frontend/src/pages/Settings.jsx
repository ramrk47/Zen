// src/pages/Settings.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";

function SettingsPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

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

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>Settings</h1>
        <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
          Logged in as <b>{user?.email || "User"}</b> ({user?.role || "—"})
        </div>
      </div>

      {!isAdmin && (
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
          You are logged in as an employee. Admin settings are hidden.
        </div>
      )}

      <div style={gridStyle}>
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Manage Personnel</div>
          <div style={cardDescStyle}>
            Create employee/admin accounts now. Later: deactivate users, reset passwords, role changes,
            permissions.
          </div>
          {isAdmin ? (
            <button style={btnStyle} onClick={() => navigate("/settings/personnel")}>
              Open
            </button>
          ) : (
            <button style={disabledBtnStyle} disabled>
              Admin only
            </button>
          )}
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Banks & Branches</div>
          <div style={cardDescStyle}>
            Tagged bank/branch lists + bank-specific invoice account details. (Coming soon)
          </div>
          <button style={disabledBtnStyle} disabled>
            Coming soon
          </button>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Invoice Defaults</div>
          <div style={cardDescStyle}>
            GST rates, templates, and your Excel-based automated invoices integration. (Coming soon)
          </div>
          <button style={disabledBtnStyle} disabled>
            Coming soon
          </button>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Alerts & Automation</div>
          <div style={cardDescStyle}>
            Branch frequency + revenue drop alerts, and future automation hooks. (Coming later)
          </div>
          <button style={disabledBtnStyle} disabled>
            Coming later
          </button>
        </div>
      </div>

      <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.5rem" }}>
        Next we’ll implement tagging (banks/branches/property/client), then invoices.
      </div>
    </div>
  );
}

export default SettingsPage;