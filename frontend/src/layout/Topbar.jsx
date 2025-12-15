// src/layout/Topbar.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, clearCurrentUser } from "../auth/currentUser";

function getPageTitle(pathname) {
  if (pathname.startsWith("/assignments/new")) return "New Assignment";
  if (pathname.startsWith("/assignments/")) return "Assignment";
  if (pathname.startsWith("/assignments")) return "Assignments";
  if (pathname.startsWith("/invoices")) return "Invoices";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/home")) return "Home";
  return "Zen Ops";
}

function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getCurrentUser();
  const role = user?.role || "—";
  const name = user?.full_name || user?.email || "User";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const onLogout = () => {
    clearCurrentUser();
    window.location.href = "/login";
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };

    const onEsc = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useEffect(() => {
    // Close menu when route changes
    setMenuOpen(false);
  }, [location.pathname]);

  const title = getPageTitle(location.pathname);

  const barStyle = {
    height: "56px",
    borderBottom: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.25rem",
    backgroundColor: "#ffffff",
  };

  const leftStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  };

  const brandStyle = {
    fontSize: "1.05rem",
    fontWeight: 700,
    cursor: "pointer",
  };

  const pageTitleStyle = {
    fontSize: "0.95rem",
    color: "#6b7280",
  };

  const rightStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    fontSize: "0.9rem",
    position: "relative",
  };

  const iconBtnStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "999px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    userSelect: "none",
  };

  const rolePillStyle = {
    padding: "0.2rem 0.55rem",
    border: "1px solid #e5e7eb",
    borderRadius: "999px",
    fontSize: "0.8rem",
    background: "#f9fafb",
    color: "#374151",
  };

  const userBtnStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.35rem 0.55rem",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
  };

  const avatarStyle = {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    border: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    color: "#111827",
    background: "#f9fafb",
  };

  const menuStyle = {
    position: "absolute",
    top: "46px",
    right: 0,
    width: "240px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    overflow: "hidden",
    zIndex: 50,
  };

  const menuHeaderStyle = {
    padding: "0.75rem 0.85rem",
    borderBottom: "1px solid #f3f4f6",
  };

  const menuNameStyle = {
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "#111827",
    marginBottom: "0.15rem",
  };

  const menuSubStyle = {
    fontSize: "0.8rem",
    color: "#6b7280",
    wordBreak: "break-word",
  };

  const menuItemStyle = {
    width: "100%",
    textAlign: "left",
    padding: "0.6rem 0.85rem",
    border: "none",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: "0.9rem",
    color: "#111827",
  };

  const menuItemMutedStyle = {
    ...menuItemStyle,
    color: "#374151",
  };

  const menuDividerStyle = {
    height: "1px",
    background: "#f3f4f6",
  };

  const caretStyle = {
    fontSize: "0.8rem",
    color: "#6b7280",
    marginLeft: "0.15rem",
  };

  const initials = (() => {
    const s = (name || "U").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  })();

  return (
    <header style={barStyle}>
      <div style={leftStyle}>
        <div
          style={brandStyle}
          onClick={() => navigate("/home")}
          title="Go to Home"
        >
          Zen Ops
        </div>
        <div style={pageTitleStyle}>{title}</div>
      </div>

      <div style={rightStyle} ref={menuRef}>
        <button
          type="button"
          style={iconBtnStyle}
          title="Notifications (coming soon)"
          onClick={() => alert("Notifications coming soon.")}
        >
          🔔
        </button>

        <span style={rolePillStyle}>{role}</span>

        <button
          type="button"
          style={userBtnStyle}
          onClick={() => setMenuOpen((v) => !v)}
          title={name}
        >
          <span style={avatarStyle}>{initials}</span>
          <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </span>
          <span style={caretStyle}>{menuOpen ? "▲" : "▼"}</span>
        </button>

        {menuOpen && (
          <div style={menuStyle}>
            <div style={menuHeaderStyle}>
              <div style={menuNameStyle}>{name}</div>
              <div style={menuSubStyle}>{user?.email || ""}</div>
              <div style={menuSubStyle}>Role: {role}</div>
            </div>

            <button
              type="button"
              style={menuItemMutedStyle}
              onClick={() => navigate("/settings")}
            >
              Settings
            </button>

            <div style={menuDividerStyle} />

            <button type="button" style={menuItemStyle} onClick={onLogout}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;