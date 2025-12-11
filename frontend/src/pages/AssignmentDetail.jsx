import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000";

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
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAssignment = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/assignments/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Assignment not found.");
        } else {
          setError(`Error: ${res.status}`);
        }
        return;
      }
      const data = await res.json();
      setAssignment(data);
    } catch (err) {
      console.error("Failed to fetch assignment detail", err);
      setError("Failed to load assignment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const containerStyle = {
    maxWidth: "800px",
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

      {loading && <p>Loading assignment…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !assignment && !error && <p>No data.</p>}

      {assignment && (
        <>
          {/* Summary */}
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
                <div style={labelStyle}>Status</div>
                <div style={valueStyle}>{assignment.status}</div>
              </div>
              <div>
                <div style={labelStyle}>Fees (₹)</div>
                <div style={valueStyle}>{assignment.fees ?? 0}</div>
              </div>
              <div>
                <div style={labelStyle}>Paid?</div>
                <div style={valueStyle}>
                  {assignment.is_paid ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </section>

          {/* Parties */}
          <section style={sectionStyle}>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
              Parties
            </h2>
            <div style={twoColGrid}>
              <div>
                <div style={labelStyle}>Bank Name / Client</div>
                <div style={valueStyle}>
                  {assignment.bank_name ||
                    assignment.valuer_client_name ||
                    "-"}
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

          {/* Property */}
          <section style={sectionStyle}>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
              Property
            </h2>
            <div style={twoColGrid}>
              <div>
                <div style={labelStyle}>Address</div>
                <div style={valueStyle}>{assignment.address || "-"}</div>
              </div>
              <div>
                <div style={labelStyle}>Property Type</div>
                <div style={valueStyle}>
                  {assignment.property_type || "-"}
                </div>
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

          {/* Dates & meta */}
          <section style={sectionStyle}>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
              Timeline
            </h2>
            <div style={twoColGrid}>
              <div>
                <div style={labelStyle}>Site Visit Date</div>
                <div style={valueStyle}>
                  {formatDate(assignment.site_visit_date)}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Report Due Date</div>
                <div style={valueStyle}>
                  {formatDate(assignment.report_due_date)}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Created At</div>
                <div style={valueStyle}>
                  {formatDate(assignment.created_at)}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Updated At</div>
                <div style={valueStyle}>
                  {formatDate(assignment.updated_at)}
                </div>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section style={sectionStyle}>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
              Notes
            </h2>
            <div
              style={{
                fontSize: "0.95rem",
                whiteSpace: "pre-wrap",
                minHeight: "2rem",
              }}
            >
              {assignment.notes || "No notes added."}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default AssignmentDetailPage;