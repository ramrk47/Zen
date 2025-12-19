import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

/**
 * AssignmentsModule (Reusable)
 *
 * Props:
 *  - scopeLabel: string (e.g., "This Bank", "This Branch")
 *  - bankId?: number
 *  - branchId?: number
 *  - authedFetch: (url: string, opts?: RequestInit) => Promise<Response>
 *  - onOpenAssignment?: (assignmentId: number) => void
 *  - defaultLimit?: number
 *  - compact?: boolean  (true = filters collapsed by default, tighter spacing)
 */
function AssignmentsModule({
  scopeLabel = "Assignments",
  bankId,
  branchId,
  authedFetch,
  onOpenAssignment,
  defaultLimit = 50,
  compact = true,
}) {
  // -------------------- data state --------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  // -------------------- UI state --------------------
  const [filtersOpen, setFiltersOpen] = useState(!compact);

  // filters
  const [createdFrom, setCreatedFrom] = useState(""); // YYYY-MM-DD
  const [createdTo, setCreatedTo] = useState(""); // YYYY-MM-DD

  // completion: ALL | PENDING | COMPLETED
  const [completion, setCompletion] = useState("ALL");

  // payment: ALL | PAID | UNPAID  -> maps to is_paid true/false
  const [payment, setPayment] = useState("ALL");

  // sorting (backend allowed keys)
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // paging
  const [limit, setLimit] = useState(defaultLimit);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const lastReqKeyRef = useRef("");

  // -------------------- helpers --------------------
  const scopeParams = useMemo(() => {
    const p = new URLSearchParams();
    if (typeof bankId === "number" && !Number.isNaN(bankId)) p.set("bank_id", String(bankId));
    if (typeof branchId === "number" && !Number.isNaN(branchId)) p.set("branch_id", String(branchId));
    return p;
  }, [bankId, branchId]);

  const isPaidParam = useMemo(() => {
    if (payment === "PAID") return "true";
    if (payment === "UNPAID") return "false";
    return null;
  }, [payment]);

  const queryKey = useMemo(() => {
    return JSON.stringify({
      bankId: bankId ?? null,
      branchId: branchId ?? null,
      createdFrom,
      createdTo,
      completion,
      payment,
      sortBy,
      sortDir,
      limit,
      skip,
    });
  }, [bankId, branchId, createdFrom, createdTo, completion, payment, sortBy, sortDir, limit, skip]);

  const buildListUrl = () => {
    const p = new URLSearchParams(scopeParams);

    p.set("skip", String(skip));
    p.set("limit", String(limit));

    if (createdFrom) p.set("created_from", createdFrom);
    if (createdTo) p.set("created_to", createdTo);

    if (completion && completion !== "ALL") p.set("completion", completion);

    if (isPaidParam !== null) p.set("is_paid", isPaidParam);

    if (sortBy) p.set("sort_by", sortBy);
    if (sortDir) p.set("sort_dir", sortDir);

    return `${API_BASE}/api/assignments?${p.toString()}`;
  };

  const buildSummaryUrl = () => {
    const p = new URLSearchParams(scopeParams);
    if (createdFrom) p.set("created_from", createdFrom);
    if (createdTo) p.set("created_to", createdTo);
    return `${API_BASE}/api/assignments/summary?${p.toString()}`;
  };

  const safeDate = (v) => {
    if (!v) return "—";
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
  };

  const money = (v) => {
    if (typeof v !== "number" || Number.isNaN(v)) return "—";
    return `₹ ${v}`;
  };

  const statusUpper = (s) => String(s || "").trim().toUpperCase();
  const isCompleted = (row) => statusUpper(row?.status) === "COMPLETED";

  // -------------------- loaders --------------------
  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await authedFetch(buildSummaryUrl());
      if (!res.ok) {
        setSummary(null);
        return;
      }
      const data = await res.json();
      setSummary(data || null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadList = async () => {
    setLoading(true);
    setError("");

    const reqKey = queryKey;
    lastReqKeyRef.current = reqKey;

    try {
      const res = await authedFetch(buildListUrl());
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];

      setHasMore(arr.length === limit);

      if (lastReqKeyRef.current !== reqKey) return;
      setRows(arr);
    } catch (e) {
      if (lastReqKeyRef.current !== reqKey) return;
      setError(e?.message || "Failed to load assignments");
      setRows([]);
      setHasMore(false);
    } finally {
      if (lastReqKeyRef.current === reqKey) setLoading(false);
    }
  };

  // scope change -> reset paging
  useEffect(() => {
    setSkip(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankId, branchId]);

  // reload on filters/sort/page settings
  useEffect(() => {
    loadList();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankId, branchId, createdFrom, createdTo, completion, payment, sortBy, sortDir, limit, skip]);

  // -------------------- sorting UX --------------------
  const sortableCols = [
    { key: "assignment_code", label: "Code" },
    { key: "created_at", label: "Created" },
    { key: "status", label: "Status" },
    { key: "is_paid", label: "Paid" },
    { key: "fees", label: "Fees" },
    { key: "id", label: "ID" },
  ];

  const sortLabel = {
    assignment_code: "Code",
    created_at: "Created",
    status: "Status",
    fees: "Fees",
    is_paid: "Paid",
    id: "ID",
  };

  const onToggleSort = (key) => {
    if (!key) return;
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setSkip(0);
  };

  const sortIndicator = (key) => {
    if (sortBy !== key) return "";
    return sortDir === "asc" ? "▲" : "▼";
  };

  // -------------------- derived display --------------------
  const activeFiltersLabel = useMemo(() => {
    const parts = [];
    if (createdFrom) parts.push(`from ${createdFrom}`);
    if (createdTo) parts.push(`to ${createdTo}`);
    if (completion !== "ALL") parts.push(completion.toLowerCase());
    if (payment !== "ALL") parts.push(payment.toLowerCase());
    return parts.length ? parts.join(" • ") : "No filters";
  }, [createdFrom, createdTo, completion, payment]);

  // -------------------- styles --------------------
  const muted = { color: "#6b7280", fontSize: "0.9rem" };

  const pill = (bg, fg) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.25rem 0.6rem",
    borderRadius: "999px",
    fontSize: "0.78rem",
    background: bg,
    color: fg,
    border: "1px solid rgba(0,0,0,0.06)",
    fontWeight: 750,
    lineHeight: 1,
    whiteSpace: "nowrap",
  });

  const pillRow = { display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" };

  const btn = {
    padding: "0.45rem 0.7rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 750,
  };

  const btnSecondary = { ...btn, background: "#fff", color: "#111827" };

  const filterWrap = {
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    borderRadius: "14px",
    padding: compact ? "0.75rem" : "0.9rem",
  };

  const filterGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "0.75rem",
    alignItems: "end",
  };

  const label = { fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.3rem" };

  const input = {
    width: "100%",
    padding: "0.5rem 0.6rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "0.92rem",
    background: "#fff",
  };

  const tableWrap = { overflowX: "auto" };
  const table = { width: "100%", borderCollapse: "collapse" };

  const th = {
    textAlign: "left",
    fontSize: "0.78rem",
    color: "#6b7280",
    padding: "0.55rem 0.6rem",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const thBtn = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: 0,
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
    fontWeight: 850,
  };

  const td = {
    padding: "0.65rem 0.6rem",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "0.92rem",
    verticalAlign: "top",
  };

  const codePill = {
    ...btnSecondary,
    padding: "0.2rem 0.55rem",
    borderRadius: "999px",
    fontSize: "0.85rem",
    fontWeight: 800,
  };

  // -------------------- render --------------------
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ minWidth: 260 }}>
          <h2 style={{ margin: 0, fontSize: compact ? "1.05rem" : "1.15rem" }}>
            Assignments ({scopeLabel})
          </h2>
          <div style={{ ...muted, marginTop: "0.25rem" }}>{activeFiltersLabel}</div>

          <div style={{ marginTop: "0.45rem", ...pillRow }}>
            {summaryLoading ? (
              <span style={pill("#f3f4f6", "#111827")}>Loading counts…</span>
            ) : summary ? (
              <>
                <span style={pill("#fff7ed", "#9a3412")}>Pending: {summary.pending ?? 0}</span>
                <span style={pill("#fff1f2", "#9f1239")}>Unpaid: {summary.completed_unpaid ?? 0}</span>
                <span style={pill("#ecfdf5", "#065f46")}>Completed: {summary.completed ?? 0}</span>
              </>
            ) : (
              <span style={pill("#f3f4f6", "#111827")}>Counts not available</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <button style={btnSecondary} onClick={() => setFiltersOpen((v) => !v)}>
            {filtersOpen ? "Hide Filters" : "Filters"}
          </button>

          <button
            style={btnSecondary}
            onClick={() => {
              loadList();
              loadSummary();
            }}
          >
            Refresh
          </button>

          <span style={pill("#f3f4f6", "#111827")}>Rows: {rows.length}</span>
        </div>
      </div>

      {filtersOpen && (
        <div style={filterWrap}>
          <div style={filterGrid}>
            <div>
              <div style={label}>Created from</div>
              <input
                type="date"
                style={input}
                value={createdFrom}
                onChange={(e) => {
                  setCreatedFrom(e.target.value || "");
                  setSkip(0);
                }}
              />
            </div>

            <div>
              <div style={label}>Created to</div>
              <input
                type="date"
                style={input}
                value={createdTo}
                onChange={(e) => {
                  setCreatedTo(e.target.value || "");
                  setSkip(0);
                }}
              />
            </div>

            <div>
              <div style={label}>Completion</div>
              <select
                style={input}
                value={completion}
                onChange={(e) => {
                  setCompletion(e.target.value);
                  setSkip(0);
                }}
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending (not completed)</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div>
              <div style={label}>Payment</div>
              <select
                style={input}
                value={payment}
                onChange={(e) => {
                  setPayment(e.target.value);
                  setSkip(0);
                }}
              >
                <option value="ALL">All</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            <div>
              <div style={label}>Rows per page</div>
              <select
                style={input}
                value={String(limit)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLimit(Number.isFinite(v) && v > 0 ? v : defaultLimit);
                  setSkip(0);
                }}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>

            <div>
              <div style={label}>Sort</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <select
                  style={input}
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setSkip(0);
                  }}
                >
                  {sortableCols.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <select
                  style={input}
                  value={sortDir}
                  onChange={(e) => {
                    setSortDir(e.target.value);
                    setSkip(0);
                  }}
                >
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                style={btnSecondary}
                onClick={() => {
                  setCreatedFrom("");
                  setCreatedTo("");
                  setCompletion("ALL");
                  setPayment("ALL");
                  setSortBy("created_at");
                  setSortDir("desc");
                  setSkip(0);
                }}
              >
                Reset
              </button>

              <button
                style={btn}
                onClick={() => {
                  loadList();
                  loadSummary();
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div style={muted}>Loading assignments…</div>}

      {error && (
        <div style={{ color: "#b45309", fontSize: "0.9rem" }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && <div style={muted}>No assignments found for this scope.</div>}

      {!error && rows.length > 0 && (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>
                  <button style={thBtn} onClick={() => onToggleSort("assignment_code")} title="Sort">
                    Code {sortIndicator("assignment_code")}
                  </button>
                </th>
                <th style={th}>
                  <button style={thBtn} onClick={() => onToggleSort("created_at")} title="Sort">
                    Created {sortIndicator("created_at")}
                  </button>
                </th>
                <th style={th}>Borrower / Client</th>
                <th style={th}>
                  <button style={thBtn} onClick={() => onToggleSort("status")} title="Sort">
                    Status {sortIndicator("status")}
                  </button>
                </th>
                <th style={th}>
                  <button style={thBtn} onClick={() => onToggleSort("is_paid")} title="Sort">
                    Paid {sortIndicator("is_paid")}
                  </button>
                </th>
                <th style={th}>
                  <button style={thBtn} onClick={() => onToggleSort("fees")} title="Sort">
                    Fees {sortIndicator("fees")}
                  </button>
                </th>
                <th style={th}>
                  <button style={thBtn} onClick={() => onToggleSort("id")} title="Sort">
                    ID {sortIndicator("id")}
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((a) => {
                const completed = isCompleted(a);
                const paid = !!a?.is_paid;
                const unpaidCompleted = completed && !paid;

                const statusPill = completed ? pill("#ecfdf5", "#065f46") : pill("#fff7ed", "#9a3412");
                const payPill = unpaidCompleted
                  ? pill("#fff1f2", "#9f1239")
                  : paid
                  ? pill("#ecfdf5", "#065f46")
                  : pill("#f3f4f6", "#111827");

                return (
                  <tr key={a.id}>
                    <td style={td}>
                      <button
                        style={codePill}
                        onClick={() => (typeof onOpenAssignment === "function" ? onOpenAssignment(a.id) : null)}
                        title="Open assignment"
                      >
                        {a.assignment_code ? String(a.assignment_code) : `#${a.id}`}
                      </button>
                    </td>

                    <td style={td}>{safeDate(a.created_at)}</td>

                    <td style={td}>
                      <div style={{ fontSize: "0.9rem", color: "#111827", fontWeight: 650 }}>
                        {a.borrower_name || a.valuer_client_name || "—"}
                      </div>
                      <div style={{ ...muted, fontSize: "0.82rem", marginTop: "0.2rem" }}>
                        {a.branch_name || a.bank_name || "—"}
                      </div>
                    </td>

                    <td style={td}>
                      <span style={statusPill}>{a.status || "—"}</span>
                    </td>

                    <td style={td}>
                      <span style={payPill}>{unpaidCompleted ? "UNPAID" : paid ? "PAID" : "—"}</span>
                    </td>

                    <td style={td}>{money(a.fees)}</td>

                    <td style={td}>#{a.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!error && rows.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={muted}>
            Sorted by <b style={{ color: "#111827" }}>{sortLabel[sortBy] || sortBy}</b> ({sortDir})
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <button style={btnSecondary} disabled={skip === 0 || loading} onClick={() => setSkip((s) => Math.max(0, s - limit))}>
              Prev
            </button>

            <button style={btnSecondary} disabled={!hasMore || loading} onClick={() => setSkip((s) => s + limit)}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssignmentsModule;