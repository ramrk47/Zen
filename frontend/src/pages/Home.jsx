// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";

const STATUS_LABELS = {
  PENDING: "Pending",
  SITE_VISIT: "Site Visit",
  UNDER_PROCESS: "Under Process",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatStatus(status) {
  return STATUS_LABELS[status] || status || "-";
}

function HomePage() {
  const isAdmin = currentUser.role === "ADMIN";
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assignments/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // sort latest first
      const sorted = [...data].sort((a, b) => b.id - a.id);
      setAssignments(sorted);
    } catch (err) {
      console.error("Failed to fetch assignments for dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const totalAssignments = assignments.length;

  const activeAssignments = assignments.filter(
    (a) => !(a.status === "COMPLETED" || a.status === "CANCELLED")
  ).length;

  const totalFees = assignments.reduce(
    (sum, a) => sum + (a.fees || 0),
    0
  );

  const collectedFees = assignments.reduce(
    (sum, a) => sum + (a.is_paid ? a.fees || 0 : 0),
    0
  );

  const pendingFees = totalFees - collectedFees;

  const recentAssignments = assignments.slice(0, 5);

  const shellStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  };

  const topRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
  };

  const titleBlockStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  };

  const titleStyle = {
    fontSize: "1.5rem",
    fontWeight: 600,
  };

  const newButtonStyle = {
    padding: "0.4rem 0.9rem",
    fontSize: "0.9rem",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
  };

  const cardsRowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "0.75rem",
    padding: "1rem 1.25rem",
    border: "1px solid #e5e7eb",
  };

  const cardLabelStyle = {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: "0.5rem",
  };

  const cardValueStyle = {
    fontSize: "1.25rem",
    fontWeight: 600,
  };

  const tableWrapperStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "0.75rem",
    border: "1px solid #e5e7eb",
    padding: "1rem 1.25rem",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  };

  const thStyle = {
    textAlign: "left",
    padding: "0.5rem 0.4rem",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 600,
    fontSize: "0.8rem",
    color: "#4b5563",
    backgroundColor: "#f9fafb",
  };

  const tdStyle = {
    padding: "0.5rem 0.4rem",
    borderBottom: "1px solid #f3f4f6",
  };

  const clickableRowStyle = {
    cursor: "pointer",
  };

  return (
    <div style={shellStyle}>
      <div style={topRowStyle}>
        <div style={titleBlockStyle}>
          <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Dashboard</div>
          <h1 style={titleStyle}>Home</h1>
        </div>
        <button
          type="button"
          style={newButtonStyle}
          onClick={() => navigate("/assignments/new")}
        >
          + New Assignment
        </button>
      </div>

      {/* KPI cards */}
      <div style={cardsRowStyle}>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Total Assignments</div>
          <div style={cardValueStyle}>{totalAssignments}</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabelStyle}>Active (Not Completed / Cancelled)</div>
          <div style={cardValueStyle}>{activeAssignments}</div>
        </div>

        {isAdmin && (
          <>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Total Fees Billed (₹)</div>
              <div style={cardValueStyle}>
                {totalFees.toLocaleString("en-IN")}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={cardLabelStyle}>Pending Fees (₹)</div>
              <div style={cardValueStyle}>
                {pendingFees.toLocaleString("en-IN")}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={cardLabelStyle}>Collected Fees (₹)</div>
              <div style={cardValueStyle}>
                {collectedFees.toLocaleString("en-IN")}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent assignments */}
      <div style={tableWrapperStyle}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Recent Assignments
        </h2>

        {loading && <p>Loading…</p>}

        {!loading && recentAssignments.length === 0 && (
          <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
            No assignments yet.
          </p>
        )}

        {!loading && recentAssignments.length > 0 && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Case</th>
                <th style={thStyle}>Bank / Client</th>
                <th style={thStyle}>Status</th>
                {isAdmin && <th style={thStyle}>Fees (₹)</th>}
                {isAdmin && <th style={thStyle}>Paid?</th>}
              </tr>
            </thead>
            <tbody>
              {recentAssignments.map((a) => (
                <tr
                  key={a.id}
                  style={clickableRowStyle}
                  onClick={() => navigate(`/assignments/${a.id}`)}
                >
                  <td style={tdStyle}>{a.id}</td>
                  <td style={tdStyle}>{a.assignment_code}</td>
                  <td style={tdStyle}>{a.case_type}</td>
                  <td style={tdStyle}>
                    {a.bank_name || a.valuer_client_name || "-"}
                  </td>
                  <td style={tdStyle}>{formatStatus(a.status)}</td>
                  {isAdmin && <td style={tdStyle}>{a.fees ? a.fees : 0}</td>}
                  {isAdmin && (
                    <td style={tdStyle}>{a.is_paid ? "Yes" : "No"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default HomePage;