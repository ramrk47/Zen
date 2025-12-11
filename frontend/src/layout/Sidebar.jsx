import React from "react";
import { NavLink } from "react-router-dom";

const linkBaseStyle = {
  display: "block",
  padding: "0.6rem 1rem",
  textDecoration: "none",
  color: "#333",
  fontSize: "0.95rem",
};

const activeStyle = {
  backgroundColor: "#e0e7ff",
  fontWeight: 600,
};

const sidebarStyle = {
  paddingTop: "1rem",
};

const headerStyle = {
  padding: "0 1rem 1rem 1rem",
  fontWeight: 700,
  fontSize: "1.1rem",
};

function Sidebar() {
  return (
    <div style={sidebarStyle}>
      <div style={headerStyle}>Zen Ops</div>
      <nav>
        <NavLink
          to="/home"
          style={({ isActive }) => ({
            ...linkBaseStyle,
            ...(isActive ? activeStyle : {}),
          })}
        >
          Home
        </NavLink>
        <NavLink
          to="/assignments"
          style={({ isActive }) => ({
            ...linkBaseStyle,
            ...(isActive ? activeStyle : {}),
          })}
        >
          Assignments
        </NavLink>
        <NavLink
          to="/invoices"
          style={({ isActive }) => ({
            ...linkBaseStyle,
            ...(isActive ? activeStyle : {}),
          })}
        >
          Invoices / Finance
        </NavLink>
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            ...linkBaseStyle,
            ...(isActive ? activeStyle : {}),
          })}
        >
          Settings / Admin
        </NavLink>
      </nav>
    </div>
  );
}

export default Sidebar;