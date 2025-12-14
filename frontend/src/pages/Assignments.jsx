// src/pages/Assignments.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";

const STATUS_OPTIONS = [
  "PENDING",
  "SITE_VISIT",
  "UNDER_PROCESS",
  "SUBMITTED",
  "COMPLETED",
  "CANCELLED",
];

const STATUS_LABELS = {
  PENDING: "Pending",
  SITE_VISIT: "Site Visit",
  UNDER_PROCESS: "Under Process",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const CASE_TYPE_OPTIONS = [
  "ALL",
  "BANK",
  "EXTERNAL_VALUER",
  "DIRECT_CLIENT",
];

function formatStatus(status) {
  return STATUS_LABELS[status] || status || "-";
}

function AssignmentsPage() {
  const isAdmin = currentUser.role === "ADMIN";
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [caseTypeFilter, setCaseTypeFilter] = useState("ALL");

  const fetchAssignments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/assignments/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // latest first
      const sorted = [...data].sort((a, b) => b.id - a.id);
      setAssignments(sorted);
    } catch (err) {
      console.error("Failed to fetch assignments", err);
      setError("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        console.error(`Status update failed for ${id}: ${res.status}`);
        return;
      }
      const updated = await res.json();
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? updated : a))
      );
    } catch (err) {
      console.error("Error updating status", err);
    }
  };

  // ---------- filtering logic ----------
  const visibleAssignments = assignments.filter((a) => {
    // search
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const haystack = [
        a.assignment_code,
        a.borrower_name,
        a.bank_name,
        a.valuer_client_name,
        a.branch_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    // status filter
    if (statusFilter !== "ALL" && a.status !== statusFilter) {
      return false;
    }

    // case type filter
    if (caseTypeFilter !== "ALL" && a.case_type !== caseTypeFilter) {
      return false;
    }

    return true;
  });

  // ---------- styles ----------
  const pageShellStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  };

  const headerRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
  };

  const titleBlockStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
  };

  const titleStyle = {
    fontSize: "1.3rem",
    fontWeight: 600,
  };

  const newButtonStyle = {
    padding: "0.35rem 0.8rem",
    fontSize: "0.85rem",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
  };

  const searchInputStyle = {
    padding: "0.35rem 0.6rem",
    fontSize: "0.9rem",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    minWidth: "220px",
  };

  const filtersRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    alignItems: "center",
    fontSize: "0.85rem",
  };

  const filterLabelStyle = {
    fontSize: "0.8rem",
    color: "#6b7280",
  };

  const filterSelectStyle = {
    padding: "0.25rem 0.5rem",
    fontSize: "0.85rem",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
  };

  const tableWrapperStyle = {
    marginTop: "0.5rem",
    backgroundColor: "#ffffff",
    borderRadius: "0.75rem",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
    backgroundColor: "#ffffff",
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

  const clickableCellStyle = {
    ...tdStyle,
    cursor: "pointer",
  };

  const selectStyle = {
    padding: "0.25rem 0.4rem",
    fontSize: "0.8rem",
  };

  const subtleTextStyle = {
    fontSize: "0.8rem",
    color: "#6b7280",
  };

  return (
    <div style={pageShellStyle}>
      {/* header: title + new button + search */}
      <div style={headerRowStyle}>
        <div style={titleBlockStyle}>
          <h1 style={titleStyle}>Assignments</h1>
          <button
            type="button"
            style={newButtonStyle}
            onClick={() => navigate("/assignments/new")}
          >
            + New Assignment
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by code, borrower, bank, branch…"
          style={searchInputStyle}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* filters */}
      <div style={filtersRowStyle}>
        <div>
          <span style={filterLabelStyle}>Status: </span>
          <select
            style={filterSelectStyle}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span style={filterLabelStyle}>Case type: </span>
          <select
            style={filterSelectStyle}
            value={caseTypeFilter}
            onChange={(e) => setCaseTypeFilter(e.target.value)}
          >
            {CASE_TYPE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c === "ALL"
                  ? "All"
                  : c === "EXTERNAL_VALUER"
                  ? "External Valuer"
                  : c === "DIRECT_CLIENT"
                  ? "Direct Client"
                  : c}
              </option>
            ))}
          </select>
        </div>

        <div style={subtleTextStyle}>
          Showing {visibleAssignments.length} of {assignments.length} assignments
        </div>
      </div>

      {/* errors / loading */}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && assignments.length === 0 && !error && (
        <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
          No assignments yet.
        </p>
      )}

      {/* table */}
      {!loading && assignments.length > 0 && (
        <div style={tableWrapperStyle}>
          {visibleAssignments.length === 0 && (
            <p style={{ ...subtleTextStyle, padding: "0.75rem 1rem" }}>
              No assignments match the current filters.
            </p>
          )}

          {visibleAssignments.length > 0 && (
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
                  <th style={thStyle}>Change Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleAssignments.map((a) => (
                  <tr key={a.id}>
                    <td
                      style={clickableCellStyle}
                      onClick={() => navigate(`/assignments/${a.id}`)}
                    >
                      {a.id}
                    </td>
                    <td
                      style={clickableCellStyle}
                      onClick={() => navigate(`/assignments/${a.id}`)}
                    >
                      {a.assignment_code}
                    </td>
                    <td style={tdStyle}>{a.case_type}</td>
                    <td style={tdStyle}>
                      {a.bank_name || a.valuer_client_name || "-"}
                    </td>
                    <td style={tdStyle}>{a.borrower_name || "-"}</td>
                    <td style={tdStyle}>{formatStatus(a.status)}</td>
                    {isAdmin && <td style={tdStyle}>{a.fees || 0}</td>}
                    {isAdmin && (
                      <td style={tdStyle}>{a.is_paid ? "Yes" : "No"}</td>
                    )}
                    <td style={tdStyle}>
                      <select
                        value={a.status}
                        style={selectStyle}
                        onChange={(e) =>
                          handleStatusChange(a.id, e.target.value)
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {formatStatus(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default AssignmentsPage;