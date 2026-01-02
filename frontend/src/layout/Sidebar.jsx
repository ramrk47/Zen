import React from "react";
import { NavLink } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";

function Sidebar() {
  const user = getCurrentUser();
  const roleUpper = (user?.role || "").toUpperCase();

  const isAdmin = roleUpper === "ADMIN";
  const isFinance = roleUpper === "FINANCE";

  const sidebarStyle = {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "1rem 0.75rem",
    backgroundColor: "#f3f4f6",
    boxSizing: "border-box",
  };

  const brandStyle = {
    fontWeight: 700,
    fontSize: "1.1rem",
    marginBottom: "1.5rem",
    padding: "0 0.25rem",
  };

  const navStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    fontSize: "0.95rem",
  };

  const linkBaseStyle = {
    padding: "0.5rem 0.75rem",
    borderRadius: "0.4rem",
    textDecoration: "none",
    color: "#374151",
    display: "block",
  };

  const activeStyle = {
    backgroundColor: "#e5e7eb",
    fontWeight: 600,
  };

  const navLinkStyle = ({ isActive }) => ({
    ...linkBaseStyle,
    ...(isActive ? activeStyle : {}),
  });

  return (
    <div style={sidebarStyle}>
      <div style={brandStyle}>Zen Ops</div>

      <nav style={navStyle}>
        <NavLink to="/home" style={navLinkStyle}>
          Home
        </NavLink>

        <NavLink to="/assignments" style={navLinkStyle}>
          Assignments
        </NavLink>

        {(isAdmin || isFinance) && (
          <NavLink to="/invoices" style={navLinkStyle}>
            Invoices / Finance
          </NavLink>
        )}

        <NavLink to="/account" style={navLinkStyle}>
          Account
        </NavLink>

        {isAdmin && (
          <NavLink to="/admin" style={navLinkStyle}>
            Admin
          </NavLink>
        )}
      </nav>
    </div>
  );
}

export default Sidebar;