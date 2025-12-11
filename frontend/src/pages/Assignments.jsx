import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000";

function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    case_type: "BANK",
    bank_name: "",
    branch_name: "",
    borrower_name: "",
    status: "SITE_VISIT",
  });

  // Filters
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [caseFilter, setCaseFilter] = useState("ALL");

  const navigate = useNavigate();

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assignments/`);
      const data = await res.json();
      setAssignments(data);
    } catch (err) {
      console.error("Failed to fetch assignments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/assignments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.detail || res.statusText}`);
        return;
      }

      setForm({
        case_type: "BANK",
        bank_name: "",
        branch_name: "",
        borrower_name: "",
        status: "SITE_VISIT",
      });

      fetchAssignments();
    } catch (err) {
      console.error("Failed to create assignment", err);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Error updating status:", err);
      }

      fetchAssignments();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const updateFees = async (id, fees) => {
    try {
      const res = await fetch(`${API_BASE}/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fees }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Error updating fees:", err);
      }

      fetchAssignments();
    } catch (err) {
      console.error("Failed to update fees", err);
    }
  };

  const togglePaid = async (id, currentIsPaid) => {
    try {
      const res = await fetch(`${API_BASE}/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_paid: !currentIsPaid }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Error updating paid flag:", err);
      }

      fetchAssignments();
    } catch (err) {
      console.error("Failed to update paid flag", err);
    }
  };

  // --------- FILTER LOGIC ---------

  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredAssignments = assignments.filter((a) => {
    // Case type
    if (caseFilter !== "ALL" && a.case_type !== caseFilter) return false;

    // Status
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;

    // Text search (code, borrower, bank, branch)
    if (normalizedSearch) {
      const haystack = [
        a.assignment_code,
        a.borrower_name,
        a.bank_name,
        a.branch_name,
        a.valuer_client_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedSearch)) return false;
    }

    return true;
  });

  // --------- STYLES ---------

  const layoutStyle = {
    display: "flex",
    gap: "2rem",
    alignItems: "flex-start",
  };

  const panelStyle = {
    flex: 1,
  };

  const filtersRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginBottom: "1rem",
    alignItems: "center",
  };

  const labelStyle = {
    fontSize: "0.8rem",
    color: "#555",
    marginBottom: "0.2rem",
  };

  const inputStyle = {
    padding: "0.35rem 0.5rem",
    fontSize: "0.9rem",
  };

  const tableStyle = {
    borderCollapse: "collapse",
    width: "100%",
    backgroundColor: "#ffffff",
  };

  const thTdStyle = {
    border: "1px solid #e2e2e2",
    padding: "0.4rem 0.5rem",
    fontSize: "0.9rem",
  };

  const codeButtonStyle = {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    color: "#2563eb",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "0.9rem",
  };

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>Assignments</h1>

      <div style={layoutStyle}>
        {/* Left: Create form */}
        <section style={{ width: "320px" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Create Assignment</h2>
          <form
            onSubmit={handleCreate}
            style={{ display: "grid", gap: "0.5rem" }}
          >
            <select
              name="case_type"
              value={form.case_type}
              onChange={handleFormChange}
              style={inputStyle}
            >
              <option value="BANK">BANK</option>
              <option value="EXTERNAL_VALUER">EXTERNAL VALUER</option>
              <option value="DIRECT_CLIENT">DIRECT CLIENT</option>
            </select>

            <input
              name="bank_name"
              placeholder="Bank Name"
              value={form.bank_name}
              onChange={handleFormChange}
              style={inputStyle}
            />
            <input
              name="branch_name"
              placeholder="Branch Name"
              value={form.branch_name}
              onChange={handleFormChange}
              style={inputStyle}
            />
            <input
              name="borrower_name"
              placeholder="Borrower / Client"
              value={form.borrower_name}
              onChange={handleFormChange}
              style={inputStyle}
            />

            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
              style={inputStyle}
            >
              <option value="SITE_VISIT">SITE_VISIT</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="FINAL_CHECK">FINAL_CHECK</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PAID">PAID</option>
            </select>

            <button type="submit" style={inputStyle}>
              Save
            </button>
          </form>
        </section>

        {/* Right: Filters + table */}
        <section style={panelStyle}>
          <h2 style={{ marginBottom: "0.5rem" }}>All Assignments</h2>

          {/* Filters */}
          <div style={filtersRowStyle}>
            <div>
              <div style={labelStyle}>Search</div>
              <input
                type="text"
                placeholder="Code / Borrower / Bank / Branch"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Status</div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="ALL">All</option>
                <option value="SITE_VISIT">SITE_VISIT</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="FINAL_CHECK">FINAL_CHECK</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="PAID">PAID</option>
              </select>
            </div>

            <div>
              <div style={labelStyle}>Case Type</div>
              <select
                value={caseFilter}
                onChange={(e) => setCaseFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="ALL">All</option>
                <option value="BANK">BANK</option>
                <option value="EXTERNAL_VALUER">EXTERNAL VALUER</option>
                <option value="DIRECT_CLIENT">DIRECT CLIENT</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p>Loading…</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thTdStyle}>ID</th>
                  <th style={thTdStyle}>Code</th>
                  <th style={thTdStyle}>Case</th>
                  <th style={thTdStyle}>Bank / Client</th>
                  <th style={thTdStyle}>Fees</th>
                  <th style={thTdStyle}>Paid?</th>
                  <th style={thTdStyle}>Status</th>
                  <th style={thTdStyle}>Change Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((a) => (
                  <tr key={a.id}>
                    <td style={thTdStyle}>{a.id}</td>
                    <td style={thTdStyle}>
                      <button
                        type="button"
                        onClick={() => navigate(`/assignments/${a.id}`)}
                        style={codeButtonStyle}
                      >
                        {a.assignment_code}
                      </button>
                    </td>
                    <td style={thTdStyle}>{a.case_type}</td>
                    <td style={thTdStyle}>
                      {a.bank_name || a.valuer_client_name || "-"}
                    </td>
                    <td style={thTdStyle}>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        style={{ width: "6rem" }}
                        defaultValue={a.fees ?? 0}
                        onBlur={(e) => {
                          const value = e.target.value;
                          const parsed =
                            value === "" ? 0 : Number(value);
                          if (Number.isNaN(parsed)) return;
                          if (parsed === (a.fees ?? 0)) return;
                          updateFees(a.id, parsed);
                        }}
                      />
                    </td>
                    <td style={thTdStyle}>
                      <button
                        type="button"
                        onClick={() => togglePaid(a.id, a.is_paid)}
                      >
                        {a.is_paid ? "Paid ✅" : "Mark Paid"}
                      </button>
                    </td>
                    <td style={thTdStyle}>{a.status}</td>
                    <td style={thTdStyle}>
                      <select
                        value={a.status}
                        onChange={(e) =>
                          updateStatus(a.id, e.target.value)
                        }
                      >
                        <option value="SITE_VISIT">SITE_VISIT</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="FINAL_CHECK">FINAL_CHECK</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="PAID">PAID</option>
                      </select>
                    </td>
                  </tr>
                ))}

                {filteredAssignments.length === 0 && !loading && (
                  <tr>
                    <td style={thTdStyle} colSpan={8}>
                      No assignments match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

export default AssignmentsPage;