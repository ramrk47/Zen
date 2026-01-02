

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/apiFetch";

export default function AdminWorkload() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch("/api/assignments/summary");
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Failed to load summary (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (!alive) return;
        setSummary(data);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load workload summary");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const pageStyle = {
    maxWidth: "1100px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1rem",
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  };

  const cardLabel = {
    fontSize: "0.85rem",
    color: "#6b7280",
  };

  const cardValue = {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#111827",
  };

  const btnStyle = {
    marginTop: "0.5rem",
    padding: "0.45rem 0.7rem",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    width: "fit-content",
    fontSize: "0.85rem",
  };

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={{ marginBottom: "0.25rem" }}>Workload</h1>
        <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
          Global workload overview. Per‑user workload will appear once assignment ↔ user wiring is enabled.
        </div>
      </div>

      {loading && <div>Loading workload…</div>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {!loading && !error && summary && (
        <>
          <div style={gridStyle}>
            <div style={cardStyle}>
              <div style={cardLabel}>Total Assignments</div>
              <div style={cardValue}>{summary.total ?? "—"}</div>
            </div>

            <div style={cardStyle}>
              <div style={cardLabel}>Completed</div>
              <div style={cardValue}>{summary.completed ?? "—"}</div>
            </div>

            <div style={cardStyle}>
              <div style={cardLabel}>Pending</div>
              <div style={cardValue}>{summary.pending ?? "—"}</div>
            </div>

            <div style={cardStyle}>
              <div style={cardLabel}>Unpaid</div>
              <div style={cardValue}>{summary.unpaid ?? "—"}</div>
            </div>
          </div>

          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
            <button style={btnStyle} onClick={() => navigate("/assignments")}>
              Open Assignments
            </button>
            <button
              style={{ ...btnStyle, background: "#fff", color: "#111827" }}
              onClick={() => navigate("/admin/personnel")}
            >
              Back to Personnel
            </button>
          </div>
        </>
      )}

      <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>
        Next upgrade: user‑wise workload tiles once <code>assigned_to_user_id</code> is live.
      </div>
    </div>
  );
}