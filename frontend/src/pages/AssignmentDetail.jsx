// src/pages/AssignmentDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";

const STATUS_OPTIONS = [
  "PENDING",
  "SITE_VISIT",
  "UNDER_PROCESS",
  "SUBMITTED",
  "COMPLETED",
  "CANCELLED",
];

function formatStatus(status) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "SITE_VISIT":
      return "Site Visit";
    case "UNDER_PROCESS":
      return "Under Process";
    case "SUBMITTED":
      return "Submitted";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status || "-";
  }
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AssignmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // form state
  const [formStatus, setFormStatus] = useState("");
  const [formFees, setFormFees] = useState("");
  const [formIsPaid, setFormIsPaid] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const authedFetch = async (url, opts = {}) => {
    if (!userEmail) throw new Error("Missing user identity");
    const headers = {
      ...(opts.headers || {}),
      "X-User-Email": userEmail,
    };
    return fetch(url, { ...opts, headers });
  };

  const fetchAssignment = async () => {
    setLoading(true);
    setError("");

    if (!userEmail) {
      setLoading(false);
      setError("Missing user identity. Please login again.");
      return;
    }

    try {
      const res = await authedFetch(`${API_BASE}/api/assignments/${id}`);
      if (!res.ok) {
        if (res.status === 404) setError("Assignment not found.");
        else setError(`Error: ${res.status}`);
        return;
      }

      const data = await res.json();
      setAssignment(data);

      // seed form
      setFormStatus(data.status || "");
      setFormFees(data.fees ?? "");
      setFormIsPaid(!!data.is_paid);
      setFormNotes(data.notes || "");
    } catch (err) {
      console.error("Failed to fetch assignment detail", err);
      setError(
        err?.message === "Missing user identity"
          ? "Missing user identity. Please login again."
          : "Failed to load assignment."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userEmail]);

  const handleSave = async () => {
    if (!assignment) return;

    if (!userEmail) {
      setError("Missing user identity. Please login again.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        status: formStatus || assignment.status,
        notes: formNotes,
      };

      // ADMIN ONLY: money fields
      if (isAdmin) {
        payload.fees = formFees === "" || formFees === null ? 0 : Number(formFees);
        payload.is_paid = formIsPaid;
      }

      const res = await authedFetch(`${API_BASE}/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Save failed", res.status);
        const text = await res.text();
        console.error("Response body:", text);
        setError("Failed to save changes. Check console for backend message.");
        return;
      }

      const updated = await res.json();
      setAssignment(updated);

      // sync form with server copy
      setFormStatus(updated.status || "");
      setFormFees(updated.fees ?? "");
      setFormIsPaid(!!updated.is_paid);
      setFormNotes(updated.notes || "");
    } catch (err) {
      console.error("Error saving assignment", err);
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const containerStyle = {
    maxWidth: "900px",
    margin: "0 auto",
  };

  const sectionStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #e2e2e2",
    padding: "1rem 1.25rem",
    marginBottom: "1rem",
  };

  const labelStyle = {
    fontSize: "0.8rem",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "0.2rem",
  };

  const valueStyle = {
    fontSize: "0.95rem",
    fontWeight: 500,
  };

  const twoColGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.75rem 1.5rem",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.35rem 0.5rem",
    fontSize: "0.9rem",
    borderRadius: "4px",
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
  };

  const selectStyle = { ...inputStyle };
  const textareaStyle = { ...inputStyle, minHeight: "80px", resize: "vertical" };

  return (
    <div style={containerStyle}>
      <button
        type="button"
        onClick={() => navigate("/assignments")}
        style={{
          marginBottom: "0.75rem",
          padding: "0.3rem 0.7rem",
          fontSize: "0.85rem",
          borderRadius: "4px",
          border: "1px solid #ccc",
          backgroundColor: "#f9fafb",
          cursor: "pointer",
        }}
      >
        ← Back to Assignments
      </button>

      <h1 style={{ marginBottom: "0.75rem" }}>Assignment Detail</h1>

      {!userEmail && (
        <div
          style={{
            ...sectionStyle,
            borderColor: "#fca5a5",
            backgroundColor: "#fff1f2",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Not logged in</div>
          <div style={{ fontSize: "0.85rem", color: "#7f1d1d" }}>
            Missing user identity. Please login again.
          </div>
        </div>
      )}

      {loading && <p>Loading assignment…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !assignment && !error && <p>No data.</p>}

      {assignment && (
        <>
          {/* SUMMARY */}
          <section style={sectionStyle}>
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={labelStyle}>Assignment Code</div>
              <div style={{ ...valueStyle, fontSize: "1.1rem" }}>
                {assignment.assignment_code}
              </div>
            </div>

            <div style={twoColGrid}>
              <div>
                <div style={labelStyle}>Case Type</div>
                <div style={valueStyle}>{assignment.case_type}</div>
              </div>
              <div>
                <div style={labelStyle}>Current Status</div>
                <div style={valueStyle}>{formatStatus(assignment.status)}</div>
              </div>

              {isAdmin && (
                <div>
                  <div style={labelStyle}>Fees (₹)</div>
                  <div style={valueStyle}>{assignment.fees ?? 0}</div>
                </div>
              )}
              {isAdmin && (
                <div>
                  <div style={labelStyle}>Paid?</div>
                  <div style={valueStyle}>{assignment.is_paid ? "Yes" : "No"}</div>
                </div>
              )}
            </div>
          </section>

          {/* EDIT SECTION */}
          <section style={sectionStyle}>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
              Update Assignment
            </h2>

            <p
              style={{
                fontSize: "0.8rem",
                color: "#6b7280",
                marginBottom: "0.75rem",
              }}
            >
              {isAdmin
                ? "Admins can update status, fees, payment status and notes."
                : "Employees can update status and notes. Financial fields are hidden."}
            </p>

            <div style={twoColGrid}>
              <div>
                <div style={labelStyle}>Status</div>
                <select
                  style={selectStyle}
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  disabled={!userEmail}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <>
                  <div>
                    <div style={labelStyle}>Fees (₹)</div>
                    <input
                      type="number"
                      style={inputStyle}
                      value={formFees}
                      onChange={(e) => setFormFees(e.target.value)}
                      disabled={!userEmail}
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>Paid?</div>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formIsPaid}
                        onChange={(e) => setFormIsPaid(e.target.checked)}
                        disabled={!userEmail}
                      />
                      Mark as paid
                    </label>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <div style={labelStyle}>Notes</div>
              <textarea
                style={textareaStyle}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Internal notes about this assignment…"
                disabled={!userEmail}
              />
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !userEmail}
                style={{
                  padding: "0.45rem 0.9rem",
                  fontSize: "0.9rem",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: saving ? "#9ca3af" : "#2563eb",
                  color: "#ffffff",
                  cursor: saving ? "default" : "pointer",
                }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </section>

          {/* PARTIES */}
          <section style={sectionStyle}>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>Parties</h2>
            <div style={twoColGrid}>
              <div>
                <div style={labelStyle}>Bank Name / Client</div>
                <div style={valueStyle}>
                  {assignment.bank_name || assignment.valuer_client_name || "-"}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Branch</div>
                <div style={valueStyle}>{assignment.branch_name || "-"}</div>
              </div>
              <div>
                <div style={labelStyle}>Borrower</div>
                <div style={valueStyle}>{assignment.borrower_name || "-"}</div>
              </div>
              <div>
                <div style={labelStyle}>Phone</div>
                <div style={valueStyle}>{assignment.phone || "-"}</div>
              </div>
            </div>
          </section>

          {/* PROPERTY */}
          <section style={sectionStyle}>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>Property</h2>
            <div style={twoColGrid}>
              <div>
                <div style={labelStyle}>Address</div>
                <div style={valueStyle}>{assignment.address || "-"}</div>
              </div>
              <div>
                <div style={labelStyle}>Property Type</div>
                <div style={valueStyle}>{assignment.property_type || "-"}</div>
              </div>
              <div>
                <div style={labelStyle}>Land Area</div>
                <div style={valueStyle}>{assignment.land_area ?? "-"}</div>
              </div>
              <div>
                <div style={labelStyle}>Built-up Area</div>
                <div style={valueStyle}>{assignment.builtup_area ?? "-"}</div>
              </div>
            </div>
          </section>

          {/* TIMELINE */}
          <section style={sectionStyle}>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>Timeline</h2>
            <div style={twoColGrid}>
              <div>
                <div style={labelStyle}>Site Visit Date</div>
                <div style={valueStyle}>{formatDate(assignment.site_visit_date)}</div>
              </div>
              <div>
                <div style={labelStyle}>Report Due Date</div>
                <div style={valueStyle}>{formatDate(assignment.report_due_date)}</div>
              </div>
              <div>
                <div style={labelStyle}>Created At</div>
                <div style={valueStyle}>{formatDate(assignment.created_at)}</div>
              </div>
              <div>
                <div style={labelStyle}>Updated At</div>
                <div style={valueStyle}>{formatDate(assignment.updated_at)}</div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default AssignmentDetailPage;