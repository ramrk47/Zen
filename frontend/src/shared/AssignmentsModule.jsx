// frontend/src/shared/AssignmentsModule.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

function safeDateYYYYMMDD(d) {
  if (!d) return "";
  // expects input already YYYY-MM-DD from <input type="date" />
  return String(d).slice(0, 10);
}

function pillStyle(bg, fg) {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.25rem 0.6rem",
    borderRadius: "999px",
    fontSize: "0.78rem",
    background: bg,
    color: fg,
    border: "1px solid rgba(0,0,0,0.06)",
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
}

function thClickableStyle(active) {
  return {
    textAlign: "left",
    fontSize: "0.8rem",
    color: active ? "#111827" : "#6b7280",
    padding: "0.6rem",
    borderBottom: "1px solid #e5e7eb",
    cursor: "pointer",
    userSelect: "none",
    fontWeight: active ? 900 : 800,
  };
}

function AssignmentsModule({
  scopeLabel = "Scope",
  bankId = null,
  branchId = null,
  authedFetch,
  onOpenAssignment,
}) {
  // Filters (restricted as you asked)
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [completion, setCompletion] = useState("ALL"); // ALL | PENDING | COMPLETED
  const [payment, setPayment] = useState("ALL"); // ALL | PAID | UNPAID

  // Sort (all columns)
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // Data
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState("");

  const isPaidParam = useMemo(() => {
    if (payment === "PAID") return true;
    if (payment === "UNPAID") return false;
    return null;
  }, [payment]);

  const scopeParams = useMemo(() => {
    const p = {};
    if (bankId !== null && bankId !== undefined) p.bank_id = bankId;
    if (branchId !== null && branchId !== undefined) p.branch_id = branchId;
    return p;
  }, [bankId, branchId]);

  const dateParams = useMemo(() => {
    const p = {};
    const cf = safeDateYYYYMMDD(createdFrom);
    const ct = safeDateYYYYMMDD(createdTo);
    if (cf) p.created_from = cf;
    if (ct) p.created_to = ct;
    return p;
  }, [createdFrom, createdTo]);

  const reloadKey = useMemo(() => {
    return JSON.stringify({
      ...scopeParams,
      ...dateParams,
      completion,
      is_paid: isPaidParam,
      sort_by: sortBy,
      sort_dir: sortDir,
    });
  }, [scopeParams, dateParams, completion, isPaidParam, sortBy, sortDir]);

  // Summary
  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setSummary(null);
      setSummaryLoading(true);
      try {
        const qs = buildQuery({ ...scopeParams, ...dateParams });
        const res = await authedFetch(`${API_BASE}/api/assignments/summary${qs}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSummary(data || null);
      } catch {
        // soft fail
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    if (authedFetch) loadSummary();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedFetch, JSON.stringify(scopeParams), JSON.stringify(dateParams)]);

  // List rows
  useEffect(() => {
    let cancelled = false;

    const loadRows = async () => {
      setRows([]);
      setRowsError("");
      setRowsLoading(true);

      try {
        const qs = buildQuery({
          ...scopeParams,
          ...dateParams,
          completion,
          is_paid: isPaidParam,
          sort_by: sortBy,
          sort_dir: sortDir,
          skip: 0,
          limit: 200,
        });

        const res = await authedFetch(`${API_BASE}/api/assignments${qs}`);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setRowsError(e?.message || "Failed to load assignments");
      } finally {
        if (!cancelled) setRowsLoading(false);
      }
    };

    if (authedFetch) loadRows();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedFetch, reloadKey]);

  const completedValue = "COMPLETED"; // keep aligned with backend helper

  const computedCounts = useMemo(() => {
    const total = summary?.total ?? null;
    const pending = summary?.pending ?? null;
    const completed = summary?.completed ?? null;
    const completedUnpaid = summary?.completed_unpaid ?? null;

    const completedPaid =
      typeof completed === "number" && typeof completedUnpaid === "number"
        ? Math.max(0, completed - completedUnpaid)
        : null;

    return { total, pending, completed, completedUnpaid, completedPaid };
  }, [summary]);

  const headerRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
    alignItems: "flex-end",
  };

  const muted = { color: "#6b7280", fontSize: "0.9rem" };

  const controlsRow = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "0.7rem",
    marginTop: "0.85rem",
  };

  const labelStyle = { fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.35rem" };

  const inputStyle = {
    width: "100%",
    padding: "0.55rem 0.65rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    background: "#fff",
  };

  const tableWrap = { marginTop: "0.85rem", overflowX: "auto" };
  const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: "900px" };
  const tdStyle = {
    padding: "0.7rem 0.6rem",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "0.92rem",
    verticalAlign: "top",
  };

  const miniBtn = {
    padding: "0.25rem 0.55rem",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
  };

  const pillsRow = { display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" };

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const sortIndicator = (col) => {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  // Completed LAST (paid) as you asked:
  // Pending = anything not completed; Unpaid = completed but not paid (special); Completed(Paid) last
  return (
    <div>
      <div style={headerRowStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Assignments ({scopeLabel})</h2>
          <div style={{ ...muted, marginTop: "0.25rem" }}>
            Sort: any column. Filters: date range + completion + payment only.
          </div>

          <div style={{ marginTop: "0.55rem", ...pillsRow }}>
            {summaryLoading ? (
              <span style={pillStyle("#f3f4f6", "#111827")}>Loading counts…</span>
            ) : summary ? (
              <>
                <span style={pillStyle("#fff7ed", "#9a3412")}>
                  Pending: {computedCounts.pending ?? 0}
                </span>
                <span style={pillStyle("#fff1f2", "#9f1239")}>
                  Completed-Unpaid: {computedCounts.completedUnpaid ?? 0}
                </span>
                <span style={pillStyle("#ecfdf5", "#065f46")}>
                  Completed (Paid): {computedCounts.completedPaid ?? 0}
                </span>
                <span style={pillStyle("#f3f4f6", "#111827")}>
                  Total: {computedCounts.total ?? 0}
                </span>
              </>
            ) : (
              <span style={pillStyle("#f3f4f6", "#111827")}>Counts not connected</span>
            )}
          </div>
        </div>

        <div style={{ alignSelf: "center" }}>
          <span style={pillStyle("#f3f4f6", "#111827")}>
            Rows: {rows.length}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={controlsRow}>
        <div>
          <div style={labelStyle}>Created From</div>
          <input
            type="date"
            style={inputStyle}
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
          />
        </div>

        <div>
          <div style={labelStyle}>Created To</div>
          <input
            type="date"
            style={inputStyle}
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
          />
        </div>

        <div>
          <div style={labelStyle}>Completion</div>
          <select
            style={inputStyle}
            value={completion}
            onChange={(e) => setCompletion(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending (not completed)</option>
            <option value="COMPLETED">Completed only</option>
          </select>
        </div>

        <div>
          <div style={labelStyle}>Payment</div>
          <select
            style={inputStyle}
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="PAID">Paid only</option>
            <option value="UNPAID">Unpaid only</option>
          </select>
        </div>
      </div>

      {rowsLoading && <div style={{ ...muted, marginTop: "0.85rem" }}>Loading assignments…</div>}

      {rowsError && (
        <div style={{ marginTop: "0.85rem", color: "#b45309", fontSize: "0.9rem" }}>
          ⚠️ {rowsError}
        </div>
      )}

      {!rowsLoading && !rowsError && rows.length === 0 && (
        <div style={{ ...muted, marginTop: "0.85rem" }}>No assignments match your filters.</div>
      )}

      {!rowsLoading && !rowsError && rows.length > 0 && (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th
                  style={thClickableStyle(sortBy === "id")}
                  onClick={() => toggleSort("id")}
                >
                  ID{sortIndicator("id")}
                </th>
                <th
                  style={thClickableStyle(sortBy === "assignment_code")}
                  onClick={() => toggleSort("assignment_code")}
                >
                  Code{sortIndicator("assignment_code")}
                </th>
                <th
                  style={thClickableStyle(sortBy === "created_at")}
                  onClick={() => toggleSort("created_at")}
                >
                  Created{sortIndicator("created_at")}
                </th>
                <th
                  style={thClickableStyle(sortBy === "status")}
                  onClick={() => toggleSort("status")}
                >
                  Status{sortIndicator("status")}
                </th>
                <th style={thClickableStyle(false)}>Borrower / Client</th>
                <th
                  style={thClickableStyle(sortBy === "fees")}
                  onClick={() => toggleSort("fees")}
                >
                  Fees{sortIndicator("fees")}
                </th>
                <th
                  style={thClickableStyle(sortBy === "is_paid")}
                  onClick={() => toggleSort("is_paid")}
                >
                  Paid{sortIndicator("is_paid")}
                </th>
                <th style={thClickableStyle(false)}>Open</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((a) => {
                const status = (a.status || "").toString();
                const statusUpper = status.trim().toUpperCase();
                const isCompleted = statusUpper === completedValue;
                const isPaid = !!a.is_paid;

                return (
                  <tr key={a.id}>
                    <td style={tdStyle}>#{a.id}</td>
                    <td style={tdStyle}>{a.assignment_code || "—"}</td>
                    <td style={tdStyle}>
                      {a.created_at ? String(a.created_at).slice(0, 10) : "—"}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 850 }}>{status || "—"}</div>
                      <div style={{ ...muted, fontSize: "0.82rem", marginTop: "0.2rem" }}>
                        {isCompleted
                          ? isPaid
                            ? "Completed + Paid"
                            : "Completed but Unpaid"
                          : "Pending"}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {a.borrower_name || a.valuer_client_name || "—"}
                    </td>
                    <td style={tdStyle}>
                      {typeof a.fees === "number" ? `₹ ${a.fees}` : "—"}
                    </td>
                    <td style={tdStyle}>{a.is_paid ? "Yes" : "No"}</td>
                    <td style={tdStyle}>
                      <button
                        style={miniBtn}
                        onClick={() => onOpenAssignment?.(a.id)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AssignmentsModule;