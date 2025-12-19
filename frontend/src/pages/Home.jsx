// frontend/src/pages/Home.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
};

function formatStatus(status) {
  return STATUS_LABELS[status] || status || "-";
}

function formatMoney(n) {
  return (Number(n || 0) || 0).toLocaleString("en-IN");
}

function safeText(v) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

function getBadgeStyle(kind) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.18rem 0.55rem",
    borderRadius: 999,
    fontSize: "0.82rem",
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#374151",
    whiteSpace: "nowrap",
  };

  if (kind === "ok") return { ...base, background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" };
  if (kind === "warn") return { ...base, background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" };
  if (kind === "bad") return { ...base, background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" };
  if (kind === "info") return { ...base, background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8" };
  return base;
}

function statusKind(status) {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED") return "ok";
  if (s === "CANCELLED") return "bad";
  if (s === "SITE_VISIT") return "info";
  if (s === "PENDING") return "warn";
  return "neutral";
}

export default function HomePage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  // separate errors so UI can react differently
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");

  // Prevent race conditions when user clicks Refresh multiple times
  const reqSeq = useRef(0);

  const fetchAssignments = async () => {
    const mySeq = ++reqSeq.current;

    setLoading(true);
    setError("");
    setAuthError("");

    try {
      // ✅ FastAPI route: prefix "/api/assignments" + GET "/" => "/api/assignments/"
      const res = await apiFetch("/api/assignments/");
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.assignments) ? data.assignments : [];

      // If a newer request finished already, ignore this response
      if (mySeq !== reqSeq.current) return;

      const sorted = [...arr].sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));
      setAssignments(sorted);
    } catch (err) {
      const msg = String(err?.message || "");
      console.error("Home dashboard fetch failed:", err);

      // If a newer request finished already, ignore this error
      if (mySeq !== reqSeq.current) return;

      if (msg.startsWith("UNAUTHORIZED")) {
        // apiFetch clears local user already; don't auto-redirect (avoids loops)
        setAuthError("Session invalid / expired. Please login again.");
      } else {
        setError(msg || "Failed to load dashboard.");
      }
    } finally {
      // Only clear loading for latest request
      if (mySeq === reqSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aggregates = useMemo(() => {
    const totalAssignments = assignments.length;

    const activeAssignments = assignments.filter((a) => a.status !== "COMPLETED" && a.status !== "CANCELLED");

    const byStatus = assignments.reduce((acc, a) => {
      const key = (a.status || "UNKNOWN").toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const totalFees = assignments.reduce((sum, a) => sum + (a.fees ?? 0), 0);
    const collectedFees = assignments.filter((a) => a.is_paid).reduce((sum, a) => sum + (a.fees ?? 0), 0);

    return {
      totalAssignments,
      activeAssignmentsCount: activeAssignments.length,
      byStatus,
      totalFees,
      collectedFees,
      pendingFees: Math.max(0, totalFees - collectedFees),
    };
  }, [assignments]);

  const recentAssignments = useMemo(() => assignments.slice(0, 8), [assignments]);

  // ---- UI styles ----
  const page = { display: "flex", flexDirection: "column", gap: "1rem" };

  const headerRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "1rem",
    flexWrap: "wrap",
  };

  const title = { margin: 0, fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.02em" };
  const subtitle = { marginTop: "0.25rem", fontSize: "0.92rem", color: "#6b7280" };

  const rightActions = { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" };

  const btn = {
    padding: "0.45rem 0.9rem",
    fontSize: "0.9rem",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
  };

  const btnPrimary = {
    ...btn,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 800,
  };

  const banner = (kind) => ({
    borderRadius: 12,
    padding: "0.75rem 0.9rem",
    border: "1px solid #e5e7eb",
    background: kind === "error" ? "#fef2f2" : kind === "warn" ? "#fffbeb" : "#f9fafb",
    color: kind === "error" ? "#991b1b" : kind === "warn" ? "#92400e" : "#374151",
    display: "flex",
    justifyContent: "space-between",
    gap: "0.75rem",
    alignItems: "center",
    flexWrap: "wrap",
  });

  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "0.9rem",
  };

  const card = {
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    padding: "0.95rem 1rem",
    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  };

  const cardLabel = {
    fontSize: "0.78rem",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const cardValue = { fontSize: "1.55rem", fontWeight: 900, color: "#111827" };

  const split = {
    display: "grid",
    gridTemplateColumns: "1.35fr 1fr",
    gap: "0.9rem",
    alignItems: "start",
  };

  const panel = {
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    overflow: "hidden",
  };

  const panelHeader = {
    padding: "0.75rem 0.9rem",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
    display: "flex",
    justifyContent: "space-between",
    gap: "0.75rem",
    alignItems: "center",
    flexWrap: "wrap",
  };

  const panelTitle = { margin: 0, fontSize: "1rem", fontWeight: 900, color: "#111827" };

  const table = { width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" };
  const th = {
    textAlign: "left",
    padding: "0.65rem 0.85rem",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 900,
    fontSize: "0.78rem",
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
    background: "#fff",
  };
  const td = { padding: "0.65rem 0.85rem", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" };
  const linkCell = { ...td, cursor: "pointer", fontWeight: 900, textDecoration: "underline", textUnderlineOffset: 2 };

  const empty = { padding: "1rem", color: "#6b7280", fontSize: "0.92rem" };

  const pendingCount = aggregates.byStatus.PENDING || 0;
  const siteVisitCount = aggregates.byStatus.SITE_VISIT || 0;
  const underProcess = aggregates.byStatus.UNDER_PROCESS || 0;

  const greetingName = user?.full_name || user?.name || user?.email || (isAdmin ? "Admin" : "User");

  return (
    <div style={page}>
      {/* Header */}
      <div style={headerRow}>
        <div>
          <h1 style={title}>Home</h1>
          <div style={subtitle}>
            Welcome, <span style={{ color: "#111827", fontWeight: 900 }}>{greetingName}</span>.
            {!isAdmin ? " (Employee view)" : ""}
          </div>
        </div>

        <div style={rightActions}>
          <button type="button" style={btn} onClick={fetchAssignments} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button type="button" style={btnPrimary} onClick={() => navigate("/assignments/new")}>
            + New Assignment
          </button>
        </div>
      </div>

      {/* Auth banner (manual action, no loops) */}
      {authError && (
        <div style={banner("warn")}>
          <div style={{ fontWeight: 900 }}>{authError}</div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button type="button" style={btn} onClick={() => navigate("/login", { replace: true })}>
              Go to Login
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={banner("error")}>
          <div style={{ fontWeight: 900, whiteSpace: "pre-wrap" }}>{error}</div>
          <button type="button" style={btn} onClick={fetchAssignments} disabled={loading}>
            Retry
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div style={grid}>
        <div style={card}>
          <div style={cardLabel}>Total Assignments</div>
          <div style={cardValue}>{aggregates.totalAssignments}</div>
        </div>

        <div style={card}>
          <div style={cardLabel}>Active Assignments</div>
          <div style={cardValue}>{aggregates.activeAssignmentsCount}</div>
        </div>

        <div style={card}>
          <div style={cardLabel}>Pending</div>
          <div style={cardValue}>{pendingCount}</div>
        </div>

        <div style={card}>
          <div style={cardLabel}>Site Visits</div>
          <div style={cardValue}>{siteVisitCount}</div>
        </div>

        <div style={card}>
          <div style={cardLabel}>Under Process</div>
          <div style={cardValue}>{underProcess}</div>
        </div>

        {isAdmin ? (
          <div style={card}>
            <div style={cardLabel}>Pending Fees (₹)</div>
            <div style={cardValue}>{formatMoney(aggregates.pendingFees)}</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              Collected: ₹{formatMoney(aggregates.collectedFees)} / Total: ₹{formatMoney(aggregates.totalFees)}
            </div>
          </div>
        ) : (
          <div style={card}>
            <div style={cardLabel}>Finance</div>
            <div style={{ fontSize: "0.95rem", color: "#6b7280", marginTop: "0.2rem" }}>
              Fees & payments are hidden for employees.
            </div>
          </div>
        )}
      </div>

      {/* Recent + Playbook */}
      <div style={split}>
        {/* Recent assignments */}
        <div style={panel}>
          <div style={panelHeader}>
            <h2 style={panelTitle}>Recent Assignments</h2>
            <button type="button" style={btn} onClick={() => navigate("/assignments")}>
              View all →
            </button>
          </div>

          {loading ? (
            <div style={empty}>Loading dashboard…</div>
          ) : recentAssignments.length === 0 ? (
            <div style={empty}>
              No assignments yet. Create one to get started.
              <div style={{ marginTop: "0.6rem" }}>
                <button type="button" style={btnPrimary} onClick={() => navigate("/assignments/new")}>
                  + Create first assignment
                </button>
              </div>
            </div>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Code</th>
                  <th style={th}>Bank / Client</th>
                  <th style={th}>Borrower</th>
                  <th style={th}>Status</th>
                  {isAdmin && <th style={th}>Fees (₹)</th>}
                  {isAdmin && <th style={th}>Paid?</th>}
                </tr>
              </thead>
              <tbody>
                {recentAssignments.map((a) => (
                  <tr key={a.id} title="Open assignment">
                    <td style={linkCell} onClick={() => navigate(`/assignments/${a.id}`)}>
                      {a.id}
                    </td>
                    <td style={td}>{safeText(a.assignment_code)}</td>
                    <td style={td}>{safeText(a.bank_name || a.valuer_client_name)}</td>
                    <td style={td}>{safeText(a.borrower_name)}</td>
                    <td style={td}>
                      <span style={getBadgeStyle(statusKind(a.status))}>{formatStatus(a.status)}</span>
                    </td>
                    {isAdmin && <td style={td}>{formatMoney(a.fees)}</td>}
                    {isAdmin && <td style={td}>{a.is_paid ? "Yes" : "No"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Playbook */}
        <div style={panel}>
          <div style={panelHeader}>
            <h2 style={panelTitle}>Daily Playbook</h2>
          </div>

          <div style={{ padding: "0.9rem" }}>
            <div style={{ fontSize: "0.95rem", color: "#111827", fontWeight: 900 }}>
              What to do next:
            </div>

            <div style={{ marginTop: "0.65rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                <span style={{ color: "#374151" }}>1) Create today’s new cases</span>
                <button style={btn} onClick={() => navigate("/assignments/new")}>Create</button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                <span style={{ color: "#374151" }}>2) Update statuses after calls/site visits</span>
                <button style={btn} onClick={() => navigate("/assignments")}>Open list</button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                <span style={{ color: "#374151" }}>3) Watch delays (Pending + Under process)</span>
                <button style={btn} onClick={() => navigate("/assignments")}>Go</button>
              </div>

              {isAdmin ? (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
                  <span style={{ color: "#374151" }}>4) Collect dues (Completed but unpaid)</span>
                  <span style={getBadgeStyle("warn")}>Pending ₹{formatMoney(aggregates.pendingFees)}</span>
                </div>
              ) : (
                <div style={{ marginTop: "0.35rem", color: "#6b7280", fontSize: "0.9rem" }}>
                  Finance is hidden for employees. Focus on execution: visits, docs, report delivery.
                </div>
              )}

              <div style={{ marginTop: "0.75rem", borderTop: "1px solid #e5e7eb", paddingTop: "0.75rem" }}>
                <div style={{ fontSize: "0.82rem", color: "#6b7280", lineHeight: 1.5 }}>
                  Tip: If you see auth warnings, login once and continue. No repeated refresh spam needed.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>
        If the dashboard looks empty: create your first assignment and everything starts showing up.
      </div>
    </div>
  );
}