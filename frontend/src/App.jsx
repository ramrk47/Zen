import React, { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    case_type: "BANK",
    bank_name: "",
    branch_name: "",
    borrower_name: "",
    status: "SITE_VISIT",
  });

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

  const handleChange = (e) => {
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

      console.log("Create response status:", res.status);
      
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
      await fetch(`${API_BASE}/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchAssignments();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Zen Ops – Assignments</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Create Assignment</h2>
        <form onSubmit={handleCreate} style={{ display: "grid", gap: "0.5rem", maxWidth: "400px" }}>
          <select name="case_type" value={form.case_type} onChange={handleChange}>
            <option value="BANK">BANK</option>
            <option value="EXTERNAL_VALUER">EXTERNAL VALUER</option>
            <option value="DIRECT_CLIENT">DIRECT CLIENT</option>
          </select>
          <input
            name="bank_name"
            placeholder="Bank Name"
            value={form.bank_name}
            onChange={handleChange}
          />
          <input
            name="branch_name"
            placeholder="Branch Name"
            value={form.branch_name}
            onChange={handleChange}
          />
          <input
            name="borrower_name"
            placeholder="Borrower / Client"
            value={form.borrower_name}
            onChange={handleChange}
          />
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="SITE_VISIT">SITE_VISIT</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="FINAL_CHECK">FINAL_CHECK</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="PAID">PAID</option>
          </select>
          <button type="submit">Save</button>
        </form>
      </section>

      <section>
        <h2>Assignments</h2>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Code</th>
                <th>Case</th>
                <th>Bank / Client</th>
                <th>Status</th>
                <th>Change Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.assignment_code}</td>
                  <td>{a.case_type}</td>
                  <td>{a.bank_name || a.valuer_client_name || "-"}</td>
                  <td>{a.status}</td>
                  <td>
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
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
              {assignments.length === 0 && !loading && (
                <tr>
                  <td colSpan="6">No assignments yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default App;