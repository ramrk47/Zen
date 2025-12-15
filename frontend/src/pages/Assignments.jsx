// src/pages/Assignments.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";
import { apiFetch } from "../api/apiFetch";

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

const CASE_TYPE_OPTIONS = ["ALL", "BANK", "EXTERNAL_VALUER", "DIRECT_CLIENT"];

function formatStatus(status) {
  return STATUS_LABELS[status] || status || "-";
}

function formatCaseType(caseType) {
  if (!caseType) return "-";
  if (caseType === "EXTERNAL_VALUER") return "External Valuer";
  if (caseType === "DIRECT_CLIENT") return "Direct Client";
  return caseType;
}

function uniqSorted(arr) {
  return [...new Set(arr.filter(Boolean).map((x) => String(x).trim()))].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );
}

function chipLabel(key, value) {
  if (key === "status") return `Status: ${formatStatus(value)}`;
  if (key === "caseType") return `Case: ${formatCaseType(value)}`;
  if (key === "bank") return `Bank: ${value}`;
  if (key === "branch") return `Branch: ${value}`;
  if (key === "propertyType") return `Property: ${value}`;
  return `${key}: ${value}`;
}

function formatMoney(n) {
  return (Number(n || 0) || 0).toLocaleString("en-IN");
}

function safeText(v) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

function getFileLabel(f) {
  return (
    f?.original_name ||
    f?.filename ||
    f?.file_name ||
    f?.name ||
    f?.key ||
    `File ${safeText(f?.id)}`
  );
}

function getFileHref(f) {
  return f?.url || f?.file_url || f?.download_url || f?.path || f?.s3_url || "";
}

function AssignmentsPage() {
  const navigate = useNavigate();

  const user = getCurrentUser();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // UI controls
  const [showFilters, setShowFilters] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  // Pagination
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  // Drawer preview
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [drawerDetail, setDrawerDetail] = useState(null); // { assignment, files }

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [caseTypeFilter, setCaseTypeFilter] = useState("ALL");
  const [bankFilter, setBankFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("ALL");

  const openDrawer = (assignment) => {
    setSelected(assignment);
    setDrawerOpen(true);
    setDrawerError("");
    setDrawerDetail(null);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeDrawer();
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

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

      // Keep drawer row data in sync after refresh
      if (selected?.id) {
        const fresh = sorted.find((x) => x.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (err) {
      console.error("Failed to fetch assignments", err);
      if (err?.message === "UNAUTHORIZED") setError("Session expired. Please login again.");
      else setError("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDrawerDetail = async (assignmentId) => {
    if (!assignmentId) return;

    setDrawerLoading(true);
    setDrawerError("");

    try {
      const res = await apiFetch(`/api/assignments/${assignmentId}/detail`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }
      const data = await res.json();
      // Expected: { assignment: {...}, files: [...] }
      const assignment = data?.assignment || null;
      const files = Array.isArray(data?.files) ? data.files : [];
      setDrawerDetail({ assignment, files });
    } catch (err) {
      console.error("Failed to fetch assignment detail", err);
      if (err?.message === "UNAUTHORIZED") setDrawerError("Session expired. Please login again.");
      else setDrawerError("Failed to load assignment detail.");
    } finally {
      setDrawerLoading(false);
    }
  };

  useEffect(() => {
    if (!drawerOpen) return;
    if (!selected?.id) return;
    fetchDrawerDetail(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen, selected?.id]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await apiFetch(`/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`Status update failed for ${id}: ${res.status}`, text);
        return;
      }

      const updated = await res.json();
      setAssignments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      if (selected?.id === id) setSelected(updated);
      if (drawerDetail?.assignment?.id === id) {
        setDrawerDetail((prev) => ({
          assignment: { ...(prev?.assignment || {}), ...updated },
          files: prev?.files || [],
        }));
      }
    } catch (err) {
      console.error("Error updating status", err);
    }
  };

  // Derived filter option lists
  const bankOptions = useMemo(() => uniqSorted(assignments.map((a) => a.bank_name)), [assignments]);

  const branchOptions = useMemo(() => {
    const base = bankFilter === "ALL" ? assignments : assignments.filter((a) => a.bank_name === bankFilter);
    return uniqSorted(base.map((a) => a.branch_name));
  }, [assignments, bankFilter]);

  const propertyTypeOptions = useMemo(() => {
    return uniqSorted(assignments.map((a) => a.property_type));
  }, [assignments]);

  // Reset dependent filters
  useEffect(() => {
    setBranchFilter("ALL");
  }, [bankFilter]);

  const visibleAssignments = useMemo(() => {
    return assignments.filter((a) => {
      // Global search includes everything
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        const haystack = [
          a.id,
          a.assignment_code,
          a.case_type,
          a.bank_name,
          a.branch_name,
          a.valuer_client_name,
          a.borrower_name,
          a.phone,
          a.address,
          a.property_type,
          a.land_area,
          a.builtup_area,
          a.status,
          a.notes,
          a.fees,
          a.is_paid ? "paid" : "unpaid",
          a.site_visit_date,
          a.report_due_date,
          a.assigned_to,
        ]
          .filter((x) => x !== null && x !== undefined)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (caseTypeFilter !== "ALL" && a.case_type !== caseTypeFilter) return false;
      if (bankFilter !== "ALL" && a.bank_name !== bankFilter) return false;
      if (branchFilter !== "ALL" && a.branch_name !== branchFilter) return false;
      if (propertyTypeFilter !== "ALL" && (a.property_type || "") !== propertyTypeFilter) return false;

      return true;
    });
  }, [assignments, searchTerm, statusFilter, caseTypeFilter, bankFilter, branchFilter, propertyTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleAssignments.length / PAGE_SIZE));

  useEffect(() => {
    // When filters/search change, jump back to page 1 to avoid empty pages
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, caseTypeFilter, bankFilter, branchFilter, propertyTypeFilter]);

  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const pageStart = (pageSafe - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedAssignments = visibleAssignments.slice(pageStart, pageEnd);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCaseTypeFilter("ALL");
    setBankFilter("ALL");
    setBranchFilter("ALL");
    setPropertyTypeFilter("ALL");
  };

  const activeChips = useMemo(() => {
    const chips = [];
    if (statusFilter !== "ALL") chips.push({ key: "status", value: statusFilter, onClear: () => setStatusFilter("ALL") });
    if (caseTypeFilter !== "ALL") chips.push({ key: "caseType", value: caseTypeFilter, onClear: () => setCaseTypeFilter("ALL") });
    if (bankFilter !== "ALL") chips.push({ key: "bank", value: bankFilter, onClear: () => setBankFilter("ALL") });
    if (branchFilter !== "ALL") chips.push({ key: "branch", value: branchFilter, onClear: () => setBranchFilter("ALL") });
    if (propertyTypeFilter !== "ALL") chips.push({ key: "propertyType", value: propertyTypeFilter, onClear: () => setPropertyTypeFilter("ALL") });
    return chips;
  }, [statusFilter, caseTypeFilter, bankFilter, branchFilter, propertyTypeFilter]);

  // Drawer data preference: use detail when available (richer), otherwise row data
  const drawerAssignment = drawerDetail?.assignment || selected || null;
  const drawerFiles = drawerDetail?.files || [];

  // ---------- styles ----------
  const shell = { display: "flex", flexDirection: "column", gap: "0.8rem", position: "relative" };

  const topBar = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
  };

  const leftTitleRow = { display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" };

  const titleStyle = { fontSize: "1.35rem", fontWeight: 700, margin: 0 };

  const pillBtn = {
    padding: "0.35rem 0.85rem",
    fontSize: "0.85rem",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  };

  const primaryBtn = {
    padding: "0.35rem 0.85rem",
    fontSize: "0.85rem",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
  };

  const searchWrap = { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" };

  const searchInput = {
    padding: "0.45rem 0.75rem",
    fontSize: "0.92rem",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    width: "min(560px, 92vw)",
  };

  const smallText = { fontSize: "0.85rem", color: "#6b7280" };

  const filtersPanel = {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "0.9rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  };

  const filtersGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.6rem 0.8rem",
    alignItems: "end",
  };

  const field = { display: "flex", flexDirection: "column", gap: "0.25rem" };

  const label = { fontSize: "0.78rem", color: "#6b7280" };

  const select = {
    padding: "0.4rem 0.6rem",
    fontSize: "0.9rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
  };

  const chipsRow = {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    alignItems: "center",
  };

  const chip = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.25rem 0.55rem",
    borderRadius: "999px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    fontSize: "0.82rem",
    color: "#374151",
  };

  const chipX = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.95rem",
    lineHeight: 1,
    color: "#6b7280",
  };

  const tableWrapper = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
  };

  const table = { width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" };

  const th = {
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

  const td = { padding: "0.65rem 0.85rem", borderBottom: "1px solid #f3f4f6" };

  const idCell = {
    ...td,
    cursor: "pointer",
    fontWeight: 700,
    color: "#111827",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  };

  const rowStyle = { cursor: "pointer" };

  const rowHover = { backgroundColor: "#f9fafb" };

  // Drawer styles
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 50,
  };

  const drawerStyle = {
    position: "fixed",
    top: 0,
    right: 0,
    height: "100vh",
    width: "420px",
    maxWidth: "92vw",
    backgroundColor: "#ffffff",
    borderLeft: "1px solid #e5e7eb",
    zIndex: 51,
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
  };

  const drawerHeader = {
    padding: "0.9rem 1rem",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
  };

  const drawerTitle = {
    margin: 0,
    fontSize: "1.05rem",
    fontWeight: 800,
    lineHeight: 1.2,
  };

  const drawerSub = {
    marginTop: "0.25rem",
    fontSize: "0.85rem",
    color: "#6b7280",
  };

  const drawerBody = {
    padding: "0.9rem 1rem",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
  };

  const section = {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "0.75rem 0.85rem",
    backgroundColor: "#ffffff",
  };

  const sectionTitle = {
    margin: 0,
    fontSize: "0.78rem",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const kvGrid = {
    marginTop: "0.6rem",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.5rem 0.75rem",
  };

  const kv = { display: "flex", flexDirection: "column", gap: "0.15rem" };

  const k = { fontSize: "0.72rem", color: "#6b7280" };

  const v = {
    fontSize: "0.92rem",
    color: "#111827",
    fontWeight: 600,
    wordBreak: "break-word",
  };

  const drawerFooter = {
    padding: "0.85rem 1rem",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    gap: "0.5rem",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const closeBtn = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "1.2rem",
    lineHeight: 1,
    color: "#6b7280",
  };

  const secondaryBtn = {
    padding: "0.35rem 0.85rem",
    fontSize: "0.85rem",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  };

  const openBtn = {
    padding: "0.35rem 0.85rem",
    fontSize: "0.85rem",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
  };

  const linkStyle = {
    color: "#2563eb",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  };

  return (
    <div style={shell}>
      {/* Top bar */}
      <div style={topBar}>
        <div style={leftTitleRow}>
          <h1 style={titleStyle}>Assignments</h1>
          <button type="button" style={primaryBtn} onClick={() => navigate("/assignments/new")}
          >
            + New Assignment
          </button>
          <button type="button" style={pillBtn} onClick={() => setShowFilters((v2) => !v2)}>
            {showFilters ? "Hide Filters" : "Filters"}
          </button>
          <button
            type="button"
            style={pillBtn}
            onClick={() => setCompactMode((v2) => !v2)}
            title="Reduce visible columns in the table"
          >
            {compactMode ? "Comfort" : "Compact"}
          </button>
          <button type="button" style={pillBtn} onClick={clearFilters}>
            Clear
          </button>
        </div>

        <div style={searchWrap}>
          <input
            type="text"
            placeholder="Search anything: address, borrower, phone, notes…"
            style={searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={smallText}>
            Showing {pagedAssignments.length} of {visibleAssignments.length} (Total {assignments.length})
          </div>
        </div>
      </div>

      {/* Chips */}
      {(activeChips.length > 0 || !isAdmin) && (
        <div style={chipsRow}>
          {activeChips.map((c) => (
            <span key={`${c.key}:${c.value}`} style={chip}>
              {chipLabel(c.key, c.value)}
              <button type="button" style={chipX} onClick={c.onClear} aria-label="Clear filter">
                ×
              </button>
            </span>
          ))}
          {!isAdmin && <span style={smallText}>(Employee view: fees/payments hidden)</span>}
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div style={filtersPanel}>
          <div style={filtersGrid}>
            <div style={field}>
              <span style={label}>Status</span>
              <select style={select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {formatStatus(s)}
                  </option>
                ))}
              </select>
            </div>

            <div style={field}>
              <span style={label}>Case type</span>
              <select style={select} value={caseTypeFilter} onChange={(e) => setCaseTypeFilter(e.target.value)}>
                {CASE_TYPE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c === "ALL" ? "All" : formatCaseType(c)}
                  </option>
                ))}
              </select>
            </div>

            <div style={field}>
              <span style={label}>Bank</span>
              <select style={select} value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}>
                <option value="ALL">All</option>
                {bankOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div style={field}>
              <span style={label}>Branch</span>
              <select
                style={select}
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                disabled={bankFilter === "ALL" || branchOptions.length === 0}
                title={bankFilter === "ALL" ? "Pick a bank first" : ""}
              >
                <option value="ALL">All</option>
                {branchOptions.map((br) => (
                  <option key={br} value={br}>
                    {br}
                  </option>
                ))}
              </select>
            </div>

            <div style={field}>
              <span style={label}>Property type</span>
              <select
                style={select}
                value={propertyTypeFilter}
                onChange={(e) => setPropertyTypeFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                {propertyTypeOptions.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={smallText}>Tip: Use Search + chips daily. Keep Filters closed most of the time.</div>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && assignments.length === 0 && !error && (
        <p style={{ fontSize: "0.92rem", color: "#6b7280" }}>No assignments yet.</p>
      )}

      {!loading && assignments.length > 0 && (
        <div style={tableWrapper}>
          {visibleAssignments.length === 0 ? (
            <p style={{ ...smallText, padding: "0.85rem 1rem" }}>No assignments match the current filters.</p>
          ) : (
            <>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.6rem 0.85rem",
                borderBottom: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}>
                <div style={smallText}>
                  Page {pageSafe} of {totalPages} • {visibleAssignments.length} results
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    style={pillBtn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageSafe <= 1}
                    title="Previous page"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    style={pillBtn}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageSafe >= totalPages}
                    title="Next page"
                  >
                    Next →
                  </button>
                </div>
              </div>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>ID</th>
                    <th style={th}>Code</th>
                    {!compactMode && <th style={th}>Case</th>}
                    <th style={th}>Bank / Client</th>
                    {!compactMode && <th style={th}>Borrower</th>}
                    <th style={th}>Status</th>
                    {isAdmin && !compactMode && <th style={th}>Fees (₹)</th>}
                    {isAdmin && !compactMode && <th style={th}>Paid?</th>}
                    <th style={th}>Change Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAssignments.map((a) => (
                    <tr
                      key={a.id}
                      style={rowStyle}
                      onClick={() => openDrawer(a)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = rowHover.backgroundColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                      title="Click row for quick preview"
                    >
                      {/* ID keeps direct navigation */}
                      <td
                        style={idCell}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/assignments/${a.id}`);
                        }}
                        title="Open full detail"
                      >
                        {a.id}
                      </td>

                      <td style={td}>{a.assignment_code}</td>
                      {!compactMode && <td style={td}>{formatCaseType(a.case_type)}</td>}
                      <td style={td}>{a.bank_name || a.valuer_client_name || "-"}</td>
                      {!compactMode && <td style={td}>{a.borrower_name || "-"}</td>}
                      <td style={td}>{formatStatus(a.status)}</td>
                      {isAdmin && !compactMode && <td style={td}>{formatMoney(a.fees)}</td>}
                      {isAdmin && !compactMode && <td style={td}>{a.is_paid ? "Yes" : "No"}</td>}

                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        <select value={a.status} style={select} onChange={(e) => handleStatusChange(a.id, e.target.value)}>
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
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.6rem 0.85rem",
                backgroundColor: "#ffffff",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}>
                <div style={smallText}>
                  Showing {pageStart + 1}-{Math.min(pageEnd, visibleAssignments.length)} of {visibleAssignments.length}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    style={pillBtn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageSafe <= 1}
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    style={pillBtn}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageSafe >= totalPages}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div style={overlayStyle} onClick={closeDrawer} />
          <div style={drawerStyle} role="dialog" aria-modal="true">
            <div style={drawerHeader}>
              <div>
                <h3 style={drawerTitle}>{drawerAssignment?.assignment_code || "Assignment Preview"}</h3>
                <div style={drawerSub}>
                  ID: {safeText(drawerAssignment?.id)} • Status: {formatStatus(drawerAssignment?.status)}
                  {drawerLoading ? " • Loading…" : ""}
                </div>
              </div>
              <button type="button" style={closeBtn} onClick={closeDrawer} aria-label="Close">
                ×
              </button>
            </div>

            <div style={drawerBody}>
              {drawerError ? (
                <div style={{ color: "red", fontSize: "0.9rem" }}>{drawerError}</div>
              ) : null}

              <div style={section}>
                <p style={sectionTitle}>Core</p>
                <div style={kvGrid}>
                  <div style={kv}>
                    <div style={k}>Case type</div>
                    <div style={v}>{formatCaseType(drawerAssignment?.case_type)}</div>
                  </div>
                  <div style={kv}>
                    <div style={k}>Borrower</div>
                    <div style={v}>{safeText(drawerAssignment?.borrower_name)}</div>
                  </div>
                  <div style={kv}>
                    <div style={k}>Bank</div>
                    <div style={v}>{safeText(drawerAssignment?.bank_name)}</div>
                  </div>
                  <div style={kv}>
                    <div style={k}>Branch</div>
                    <div style={v}>{safeText(drawerAssignment?.branch_name)}</div>
                  </div>
                  <div style={kv}>
                    <div style={k}>Client (valuer)</div>
                    <div style={v}>{safeText(drawerAssignment?.valuer_client_name)}</div>
                  </div>
                  <div style={kv}>
                    <div style={k}>Property type</div>
                    <div style={v}>{safeText(drawerAssignment?.property_type)}</div>
                  </div>
                </div>
              </div>

              <div style={section}>
                <p style={sectionTitle}>Contact & Address</p>
                <div style={kvGrid}>
                  <div style={kv}>
                    <div style={k}>Phone</div>
                    <div style={v}>{safeText(drawerAssignment?.phone)}</div>
                  </div>
                  <div style={kv} />
                  <div style={{ ...kv, gridColumn: "1 / -1" }}>
                    <div style={k}>Address</div>
                    <div style={v}>{safeText(drawerAssignment?.address)}</div>
                  </div>
                </div>
              </div>

              <div style={section}>
                <p style={sectionTitle}>Areas & Dates</p>
                <div style={kvGrid}>
                  <div style={kv}>
                    <div style={k}>Land area</div>
                    <div style={v}>{safeText(drawerAssignment?.land_area)}</div>
                  </div>
                  <div style={kv}>
                    <div style={k}>Built-up area</div>
                    <div style={v}>{safeText(drawerAssignment?.builtup_area)}</div>
                  </div>
                  <div style={kv}>
                    <div style={k}>Site visit</div>
                    <div style={v}>{safeText(drawerAssignment?.site_visit_date)}</div>
                  </div>
                  <div style={kv}>
                    <div style={k}>Report due</div>
                    <div style={v}>{safeText(drawerAssignment?.report_due_date)}</div>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div style={section}>
                  <p style={sectionTitle}>Finance</p>
                  <div style={kvGrid}>
                    <div style={kv}>
                      <div style={k}>Fees (₹)</div>
                      <div style={v}>{formatMoney(drawerAssignment?.fees)}</div>
                    </div>
                    <div style={kv}>
                      <div style={k}>Paid?</div>
                      <div style={v}>{drawerAssignment?.is_paid ? "Yes" : "No"}</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={section}>
                <p style={sectionTitle}>Notes</p>
                <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#111827", whiteSpace: "pre-wrap" }}>
                  {safeText(drawerAssignment?.notes)}
                </div>
              </div>

              <div style={section}>
                <p style={sectionTitle}>Files</p>
                {drawerLoading && drawerFiles.length === 0 ? (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#6b7280" }}>Loading files…</div>
                ) : drawerFiles.length === 0 ? (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#6b7280" }}>No files uploaded.</div>
                ) : (
                  <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {drawerFiles.map((f) => {
                      const href = getFileHref(f);
                      const text = getFileLabel(f);
                      return (
                        <div key={String(f?.id || href || text)} style={{ fontSize: "0.9rem" }}>
                          {href ? (
                            <a href={href} target="_blank" rel="noreferrer" style={linkStyle}>
                              {text}
                            </a>
                          ) : (
                            <span>{text}</span>
                          )}
                          {f?.created_at ? (
                            <span style={{ color: "#6b7280", marginLeft: "0.4rem", fontSize: "0.82rem" }}>
                              ({String(f.created_at).slice(0, 10)})
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={drawerFooter}>
              <button
                type="button"
                style={secondaryBtn}
                onClick={() => (drawerAssignment?.id ? fetchDrawerDetail(drawerAssignment.id) : null)}
                disabled={!drawerAssignment?.id || drawerLoading}
                title="Re-fetch / detail refresh"
              >
                Refresh detail
              </button>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" style={secondaryBtn} onClick={closeDrawer}>
                  Close
                </button>
                {drawerAssignment?.id ? (
                  <button type="button" style={openBtn} onClick={() => navigate(`/assignments/${drawerAssignment.id}`)}>
                    Open full detail →
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AssignmentsPage;