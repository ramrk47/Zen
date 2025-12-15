// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";
import { apiFetch } from "../api/apiFetch";

const STATUS_LABELS = {
  PENDING: "Pending",
  SITE_VISIT: "Site Visit",
  UNDER_PROCESS: "Under Process",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PAID: "Paid",
};

function formatStatus(status) {
  return STATUS_LABELS[status] || status || "-";
}

function HomePage() {
  const navigate = useNavigate();

  const user = getCurrentUser();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAssignments = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/assignments/");

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }

      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.assignments)
        ? data.assignments
        : [];

      const sorted = [...arr].sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));
      setAssignments(sorted);
    } catch (err) {
      console.error("Failed to fetch assignments for dashboard", err);
      if (err?.message === "UNAUTHORIZED") {
        setError("Session expired. Please login again.");
      } else {
        setError("Failed to load dashboard data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aggregates = useMemo(() => {
    const totalAssignments = assignments.length;

    const activeAssignments = assignments.filter(
      (a) =>
        a.status !== "COMPLETED" &&
        a.status !== "PAID" &&
        a.status !== "CANCELLED"
    );

    const byStatus = assignments.reduce((acc, a) => {
      const key = a.status || "UNKNOWN";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const totalFees = assignments.reduce((sum, a) => sum + (a.fees ?? 0), 0);
    const collectedFees = assignments
      .filter((a) => a.is_paid)
      .reduce((sum, a) => sum + (a.fees ?? 0), 0);

    return {
      totalAssignments,
      activeAssignmentsCount: activeAssignments.length,
      byStatus,
      totalFees,
      collectedFees,
      pendingFees: totalFees - collectedFees,
    };
  }, [assignments]);

  const recentAssignments = useMemo(() => assignments.slice(0, 7), [assignments]);

  // ---------- styles ----------
  const subtleTextStyle = { fontSize: "0.85rem", color: "#6b7280" };

  const cardsWrapperStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    marginTop: "1rem",
    marginBottom: "1.25rem",
  };

  const cardStyle = {
    flex: "1 1 180px",
    minWidth: "180px",
    padding: "0.9rem 1rem",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
  };

  const cardTitleStyle = {
    fontSize: "0.78rem",
    color: "#6b7280",
    marginBottom: "0.35rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  const cardValueStyle = {
    fontSize: "1.4rem",
    fontWeight: 750,
    color: "#111827",
  };

  const tableWrapperStyle = {
    marginTop: "0.6rem",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
  };

  const tableStyle = {
    borderCollapse: "collapse",
    width: "100%",
    backgroundColor: "#ffffff",
    fontSize: "0.92rem",
  };

  const thStyle = {
    textAlign: "left",
    padding: "0.65rem 0.85rem",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 700,
    fontSize: "0.78rem",
    color: "#4b5563",
    backgroundColor: "#f9fafb",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: "0.65rem 0.85rem",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle",
  };

  const clickableTdStyle = {
    ...tdStyle,
    cursor: "pointer",
  };

  const statusPillStyle = {
    display: "inline-block",
    padding: "0.15rem 0.55rem",
    borderRadius: "999px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    fontSize: "0.8rem",
    color: "#374151",
    whiteSpace: "nowrap",
  };

  const primaryButtonStyle = {
    padding: "0.35rem 0.85rem",
    fontSize: "0.85rem",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
  };

  const secondaryButtonStyle = {
    padding: "0.35rem 0.85rem",
    fontSize: "0.85rem",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem" }}>
        <div>
          <h1 style={{ marginBottom: "0.25rem" }}>Home</h1>
          <div style={subtleTextStyle}>
            Welcome
            {user?.full_name ? `, ${user.full_name}` : user?.email ? `, ${user.email}` : ""}.
          </div>
        </div>

        <button type="button" onClick={fetchAssignments} style={secondaryButtonStyle}>
          Refresh
        </button>
      </div>

      {loading && <p style={{ marginTop: "0.75rem" }}>Loading dashboard…</p>}
      {error && <p style={{ marginTop: "0.75rem", color: "red" }}>{error}</p>}

      <div style={cardsWrapperStyle}>
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Total Assignments</div>
          <div style={cardValueStyle}>{aggregates.totalAssignments}</div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Active Assignments</div>
          <div style={cardValueStyle}>{aggregates.activeAssignmentsCount}</div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Pending</div>
          <div style={cardValueStyle}>{aggregates.byStatus.PENDING || 0}</div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Site Visits</div>
          <div style={cardValueStyle}>{aggregates.byStatus.SITE_VISIT || 0}</div>
        </div>

        {isAdmin && (
          <>
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Total Fees (₹)</div>
              <div style={cardValueStyle}>{(aggregates.totalFees || 0).toLocaleString("en-IN")}</div>
            </div>

            <div style={{ ...cardStyle, flex: "2 1 380px", minWidth: "280px" }}>
              <div style={cardTitleStyle}>Pending Fees (₹)</div>
              <div style={cardValueStyle}>{(aggregates.pendingFees || 0).toLocaleString("en-IN")}</div>
            </div>

            <div style={{ ...cardStyle, flex: "2 1 380px", minWidth: "280px" }}>
              <div style={cardTitleStyle}>Collected Fees (₹)</div>
              <div style={cardValueStyle}>{(aggregates.collectedFees || 0).toLocaleString("en-IN")}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
        <h2 style={{ margin: 0 }}>Recent Assignments</h2>
        <button type="button" onClick={() => navigate("/assignments/new")} style={primaryButtonStyle}>
          + New Assignment
        </button>
      </div>

      <div style={tableWrapperStyle}>
        {recentAssignments.length === 0 ? (
          <div style={{ padding: "0.9rem 1rem" }}>
            <div style={subtleTextStyle}>No assignments yet. Create one to get started.</div>
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Case</th>
                <th style={thStyle}>Bank / Client</th>
                <th style={thStyle}>Borrower</th>
                <th style={thStyle}>Status</th>
                {isAdmin && <th style={thStyle}>Fees (₹)</th>}
                {isAdmin && <th style={thStyle}>Paid?</th>}
              </tr>
            </thead>
            <tbody>
              {recentAssignments.map((a) => (
                <tr key={a.id}>
                  <td style={clickableTdStyle} onClick={() => navigate(`/assignments/${a.id}`)}>
                    {a.id}
                  </td>
                  <td style={clickableTdStyle} onClick={() => navigate(`/assignments/${a.id}`)}>
                    {a.assignment_code}
                  </td>
                  <td style={tdStyle}>{a.case_type || "-"}</td>
                  <td style={tdStyle}>{a.bank_name || a.valuer_client_name || "-"}</td>
                  <td style={tdStyle}>{a.borrower_name || "-"}</td>
                  <td style={tdStyle}>
                    <span style={statusPillStyle}>{formatStatus(a.status)}</span>
                  </td>
                  {isAdmin && <td style={tdStyle}>{(a.fees ?? 0).toLocaleString("en-IN")}</td>}
                  {isAdmin && <td style={tdStyle}>{a.is_paid ? "Yes" : "No"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isAdmin && (
        <div style={{ marginTop: "0.9rem", ...subtleTextStyle }}>
          Finance data is hidden for employees.
        </div>
      )}
    </div>
  );
}

export default HomePage;