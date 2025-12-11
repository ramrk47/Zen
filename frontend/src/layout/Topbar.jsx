import React from "react";

function Topbar() {
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
    fontSize: "1.1rem",
    fontWeight: 500,
  };

  const rightStyle = {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    fontSize: "0.9rem",
  };

  const badgeStyle = {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: "1px solid #ccc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  return (
    <header style={barStyle}>
      <div style={leftStyle}>Dashboard</div>
      <div style={rightStyle}>
        <div style={badgeStyle}>🔔</div>
        <span>Admin</span>
      </div>
    </header>
  );
}

export default Topbar;