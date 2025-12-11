import React, { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function HomePage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assignments/`);
      const data = await res.json();
      setAssignments(data);
    } catch (err) {
      console.error("Failed to fetch assignments for dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // --- Basic aggregates (we can refine later when due_date, assignee exist) ---

  const totalAssignments = assignments.length;

  const paidAssignments = assignments.filter((a) => a.is_paid);
  const unpaidAssignments = assignments.filter((a) => !a.is_paid);

  const totalFees = assignments.reduce(
    (sum, a) => sum + (a.fees ?? 0),
    0
  );
  const collectedFees = paidAssignments.reduce(
    (sum, a) => sum + (a.fees ?? 0),
    0
  );
  const pendingFees = totalFees - collectedFees;

  const inProgressAssignments = assignments.filter(
    (a) => a.status !== "PAID" && a.status !== "COMPLETED"
  );

  // Latest 5 assignments (by id desc as a proxy for recency)
  const recentAssignments = [...assignments]
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    .slice(0, 5);

  const cardsWrapperStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    marginBottom: "1.5rem",
  };

  const cardStyle = {
    flex: "1 1 180px",
    minWidth: "180px",
    padding: "0.9rem 1rem",
    borderRadius: "8px",
    border: "1px solid #e2e2e2",
    backgroundColor: "#ffffff",
  };

  const cardTitleStyle = {
    fontSize: "0.85rem",
    color: "#555",
    marginBottom: "0.4rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  const cardValueStyle = {
    fontSize: "1.4rem",
    fontWeight: 600,
  };

  const tableWrapperStyle = {
    marginTop: "1rem",
  };

  const tableStyle = {
    borderCollapse: "collapse",
    width: "100%",
    backgroundColor: "#ffffff",
  };

  const thTdStyle = {
    border: "1px solid #e2e2e2",
    padding: "0.5rem 0.6rem",
    fontSize: "0.9rem",
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>Home</h1>

      {loading && <p>Loading dashboard…</p>}

      {/* KPI cards */}
      <div style={cardsWrapperStyle}>
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Total Assignments</div>
          <div style={cardValueStyle}>{totalAssignments}</div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Active (Not Completed / Paid)</div>
          <div style={cardValueStyle}>{inProgressAssignments.length}</div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Total Fees Billed (₹)</div>
          <div style={cardValueStyle}>{totalFees.toLocaleString("en-IN")}</div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Pending Fees (₹)</div>
          <div style={cardValueStyle}>{pendingFees.toLocaleString("en-IN")}</div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Collected Fees (₹)</div>
          <div style={cardValueStyle}>{collectedFees.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Recent assignments */}
      <div style={tableWrapperStyle}>
        <h2 style={{ marginBottom: "0.5rem" }}>Recent Assignments</h2>
        {recentAssignments.length === 0 ? (
          <p>No assignments yet. Create one from the Assignments page.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>ID</th>
                <th style={thTdStyle}>Code</th>
                <th style={thTdStyle}>Case</th>
                <th style={thTdStyle}>Bank / Client</th>
                <th style={thTdStyle}>Status</th>
                <th style={thTdStyle}>Fees (₹)</th>
                <th style={thTdStyle}>Paid?</th>
              </tr>
            </thead>
            <tbody>
              {recentAssignments.map((a) => (
                <tr key={a.id}>
                  <td style={thTdStyle}>{a.id}</td>
                  <td style={thTdStyle}>{a.assignment_code}</td>
                  <td style={thTdStyle}>{a.case_type}</td>
                  <td style={thTdStyle}>
                    {a.bank_name || a.valuer_client_name || "-"}
                  </td>
                  <td style={thTdStyle}>{a.status}</td>
                  <td style={thTdStyle}>{a.fees ?? 0}</td>
                  <td style={thTdStyle}>{a.is_paid ? "Yes" : "No"}</td>
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