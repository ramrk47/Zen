// frontend/src/pages/Assignments.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";
import { apiFetch } from "../api/apiFetch";

const STATUS_OPTIONS = ["PENDING", "SITE_VISIT", "UNDER_PROCESS", "SUBMITTED", "COMPLETED", "CANCELLED"];

const STATUS_LABELS = {
  PENDING: "Pending",
  SITE_VISIT: "Site Visit",
  UNDER_PROCESS: "Under Process",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const CASE_TYPE_OPTIONS = ["ALL", "BANK", "EXTERNAL_VALUER", "DIRECT_CLIENT"];

// --- helpers ---
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
  if (key === "createdFrom") return `From: ${value}`;
  if (key === "createdTo") return `To: ${value}`;
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
  return f?.original_name || f?.filename || f?.file_name || f?.name || f?.key || `File ${safeText(f?.id)}`;
}

function getFileHref(f) {
  const href = f?.url || f?.file_url || f?.download_url || f?.path || f?.s3_url || "";
  if (!href) return "";
  if (href.startsWith("/uploads/")) return `http://127.0.0.1:8000${href}`;
  if (href.startsWith("uploads/")) return `http://127.0.0.1:8000/${href}`;
  return href;
}

function statusKind(status) {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED") return "ok";
  if (s === "CANCELLED") return "bad";
  if (s === "SITE_VISIT") return "info";
  if (s === "PENDING") return "warn";
  return "neutral";
}

function badgeStyle(kind) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.15rem 0.55rem",
    borderRadius: 999,
    fontSize: "0.82rem",
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#374151",
    whiteSpace: "nowrap",
    fontWeight: 800,
  };
  if (kind === "ok") return { ...base, background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" };
  if (kind === "warn") return { ...base, background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" };
  if (kind === "bad") return { ...base, background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" };
  if (kind === "info") return { ...base, background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8" };
  return base;
}

function ymd(d) {
  // returns YYYY-MM-DD in local time
  const pad = (n) => String(n).padStart(2, "0");
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function startOfTodayYMD() {
  return ymd(new Date());
}

function addDaysYMD(baseYmd, days) {
  const dt = new Date(`${baseYmd}T00:00:00`);
  dt.setDate(dt.getDate() + days);
  return ymd(dt);
}

function parseCreatedAtToDate(assignment) {
  // supports created_at, createdAt, created_date, etc. (best effort)
  const raw =
    assignment?.created_at ||
    assignment?.createdAt ||
    assignment?.created_date ||
    assignment?.createdDate ||
    "";

  if (!raw) return null;

  // If it's ISO-ish, Date can parse it.
  // If it's "YYYY-MM-DD", add time to avoid timezone weirdness.
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) return new Date(`${raw}T00:00:00`);
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function inCreatedDateRange(assignment, fromYmd, toYmd) {
  if (!fromYmd && !toYmd) return true;

  const dt = parseCreatedAtToDate(assignment);
  if (!dt) return false; // if we filter by created date, hide rows with unknown created date

  const day = ymd(dt);

  if (fromYmd && day < fromYmd) return false;
  if (toYmd && day > toYmd) return false;
  return true;
}

function useDebouncedValue(value, delayMs = 180) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const UI_PREF_KEY = "zenops_assignments_ui";

function loadUIPrefs() {
  try {
    const raw = localStorage.getItem(UI_PREF_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveUIPrefs(prefs) {
  try {
    localStorage.setItem(UI_PREF_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export default function AssignmentsPage() {
  const navigate = useNavigate();

  const user = getCurrentUser();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  // separate errors: auth vs general
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");

  // UI controls (persisted)
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
  const debouncedSearch = useDebouncedValue(searchTerm, 180);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [caseTypeFilter, setCaseTypeFilter] = useState("ALL");
  const [bankFilter, setBankFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("ALL");

  // ✅ created date range filter (YYYY-MM-DD)
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  // race guard: ignore stale fetch responses
  const reqSeq = useRef(0);

  // load UI prefs on mount
  useEffect(() => {
    const p = loadUIPrefs();
    if (p) {
      if (typeof p.showFilters === "boolean") setShowFilters(p.showFilters);
      if (typeof p.compactMode === "boolean") setCompactMode(p.compactMode);
    }
  }, []);

  // save UI prefs
  useEffect(() => {
    saveUIPrefs({ showFilters, compactMode });
  }, [showFilters, compactMode]);

  const openDrawer = (assignment) => {
    setSelected(assignment);
    setDrawerOpen(true);
    setDrawerError("");
    setDrawerDetail(null);
  };

  const closeDrawer = () => setDrawerOpen(false);

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
    const mySeq = ++reqSeq.current;

    setLoading(true);
    setError("");
    setAuthError("");

    try {
      // ✅ canonical path for @router.get("/") under prefix "/api/assignments"
      const res = await apiFetch("/api/assignments/");
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.assignments) ? data.assignments : [];

      // sort by id desc (stable)
      const sorted = [...arr].sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));

      if (mySeq !== reqSeq.current) return;

      setAssignments(sorted);

      // Keep drawer row data in sync after refresh
      if (selected?.id) {
        const fresh = sorted.find((x) => x.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (err) {
      if (mySeq !== reqSeq.current) return;

      const msg = String(err?.message || "");
      console.error("Failed to fetch assignments", err);

      if (msg.startsWith("UNAUTHORIZED")) {
        setAuthError("Session invalid / expired. Please login again.");
      } else {
        setError(msg || "Failed to load assignments.");
      }
    } finally {
      if (mySeq === reqSeq.current) setLoading(false);
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
      const assignment = data?.assignment || null;
      const files = Array.isArray(data?.files) ? data.files : [];
      setDrawerDetail({ assignment, files });
    } catch (err) {
      const msg = String(err?.message || "");
      console.error("Failed to fetch assignment detail", err);

      if (msg.startsWith("UNAUTHORIZED")) setDrawerError("Session invalid / expired. Please login again.");
      else setDrawerError(msg || "Failed to load assignment detail.");
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

  const propertyTypeOptions = useMemo(() => uniqSorted(assignments.map((a) => a.property_type)), [assignments]);

  // Reset dependent filters
  useEffect(() => {
    setBranchFilter("ALL");
  }, [bankFilter]);

  const visibleAssignments = useMemo(() => {
    return assignments.filter((a) => {
      // ✅ created date range filter
      if (!inCreatedDateRange(a, createdFrom, createdTo)) return false;

      // Debounced global search includes everything
      const q = debouncedSearch.trim().toLowerCase();
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
          a.created_at,
          a.createdAt,
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
  }, [
    assignments,
    debouncedSearch,
    statusFilter,
    caseTypeFilter,
    bankFilter,
    branchFilter,
    propertyTypeFilter,
    createdFrom,
    createdTo,
  ]);

  const totalPages = Math.max(1, Math.ceil(visibleAssignments.length / PAGE_SIZE));

  useEffect(() => {
    // When filters/search change, jump back to page 1
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, caseTypeFilter, bankFilter, branchFilter, propertyTypeFilter, createdFrom, createdTo]);

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
    setCreatedFrom("");
    setCreatedTo("");
  };

  const applyCreatedPreset = (preset) => {
    if (preset === "ALL") {
      setCreatedFrom("");
      setCreatedTo("");
      return;
    }
    const today = startOfTodayYMD();
    if (preset === "TODAY") {
      setCreatedFrom(today);
      setCreatedTo(today);
      return;
    }
    if (preset === "7D") {
      setCreatedFrom(addDaysYMD(today, -6)); // includes today = 7 days
      setCreatedTo(today);
      return;
    }
    if (preset === "30D") {
      setCreatedFrom(addDaysYMD(today, -29));
      setCreatedTo(today);
      return;
    }
  };

  const activeChips = useMemo(() => {
    const chips = [];
    if (createdFrom) chips.push({ key: "createdFrom", value: createdFrom, onClear: () => setCreatedFrom("") });
    if (createdTo) chips.push({ key: "createdTo", value: createdTo, onClear: () => setCreatedTo("") });

    if (statusFilter !== "ALL") chips.push({ key: "status", value: statusFilter, onClear: () => setStatusFilter("ALL") });
    if (caseTypeFilter !== "ALL") chips.push({ key: "caseType", value: caseTypeFilter, onClear: () => setCaseTypeFilter("ALL") });
    if (bankFilter !== "ALL") chips.push({ key: "bank", value: bankFilter, onClear: () => setBankFilter("ALL") });
    if (branchFilter !== "ALL") chips.push({ key: "branch", value: branchFilter, onClear: () => setBranchFilter("ALL") });
    if (propertyTypeFilter !== "ALL") chips.push({ key: "propertyType", value: propertyTypeFilter, onClear: () => setPropertyTypeFilter("ALL") });
    return chips;
  }, [statusFilter, caseTypeFilter, bankFilter, branchFilter, propertyTypeFilter, createdFrom, createdTo]);

  // Drawer data preference
  const drawerAssignment = drawerDetail?.assignment || selected || null;
  const drawerFiles = drawerDetail?.files || [];

  // ---------- styles ----------
  const shell = { display: "flex", flexDirection: "column", gap: "0.9rem", position: "relative" };

  const topBar = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
  };

  const leftTitleRow = { display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" };
  const titleStyle = { fontSize: "1.6rem", fontWeight: 900, margin: 0, letterSpacing: "-0.01em" };

  const pillBtn = {
    padding: "0.45rem 0.9rem",
    fontSize: "0.9rem",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  };

  const primaryBtn = { ...pillBtn, border: "none", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: 900 };

  const subtle = { fontSize: "0.85rem", color: "#6b7280" };

  const searchWrap = { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" };

  const searchInput = {
    padding: "0.55rem 0.85rem",
    fontSize: "0.95rem",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    width: "min(560px, 92vw)",
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

  const filtersPanel = {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
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
    padding: "0.45rem 0.6rem",
    fontSize: "0.9rem",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
  };

  const dateInput = {
    padding: "0.42rem 0.6rem",
    fontSize: "0.9rem",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
  };

  const chipsRow = { display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" };

  const chip = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.25rem 0.55rem",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    fontSize: "0.82rem",
    color: "#374151",
    fontWeight: 700,
  };

  const chipX = { border: "none", background: "transparent", cursor: "pointer", fontSize: "1rem", lineHeight: 1, color: "#6b7280" };

  const tableWrapper = { backgroundColor: "#ffffff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" };

  const table = { width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" };

  const th = {
    textAlign: "left",
    padding: "0.7rem 0.85rem",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 900,
    fontSize: "0.78rem",
    color: "#4b5563",
    backgroundColor: "#f9fafb",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  };

  const td = { padding: "0.7rem 0.85rem", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" };

  const idCell = {
    ...td,
    cursor: "pointer",
    fontWeight: 900,
    color: "#111827",
    textDecoration: "underline",
    textUnderlineOffset: 2,
  };

  const row = { cursor: "pointer" };
  const rowHoverBg = "#f9fafb";

  // Drawer styles
  const overlayStyle = { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.25)", zIndex: 50 };

  const drawerStyle = {
    position: "fixed",
    top: 0,
    right: 0,
    height: "100vh",
    width: 440,
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

  const drawerTitle = { margin: 0, fontSize: "1.05rem", fontWeight: 900, lineHeight: 1.2 };
  const drawerSub = { marginTop: "0.25rem", fontSize: "0.85rem", color: "#6b7280" };

  const drawerBody = { padding: "0.9rem 1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.8rem" };

  const section = { border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem 0.85rem", backgroundColor: "#fff" };

  const sectionTitle = { margin: 0, fontSize: "0.78rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" };

  const kvGrid = { marginTop: "0.6rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 0.75rem" };

  const kv = { display: "flex", flexDirection: "column", gap: "0.15rem" };
  const k = { fontSize: "0.72rem", color: "#6b7280" };
  const v = { fontSize: "0.92rem", color: "#111827", fontWeight: 800, wordBreak: "break-word" };

  const drawerFooter = {
    padding: "0.85rem 1rem",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    gap: "0.5rem",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const closeBtn = { border: "none", background: "transparent", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1, color: "#6b7280" };

  const secondaryBtn = { ...pillBtn, fontSize: "0.85rem", padding: "0.4rem 0.85rem" };
  const openBtn = { ...secondaryBtn, border: "none", backgroundColor: "#2563eb", color: "#fff", fontWeight: 900 };

  const linkStyle = { color: "#2563eb", textDecoration: "underline", textUnderlineOffset: 2 };

  return (
    <div style={shell}>
      {/* Top bar */}
      <div style={topBar}>
        <div style={leftTitleRow}>
          <h1 style={titleStyle}>Assignments</h1>

          <button type="button" style={primaryBtn} onClick={() => navigate("/assignments/new")}>
            + New Assignment
          </button>

          <button type="button" style={pillBtn} onClick={() => setShowFilters((v2) => !v2)}>
            {showFilters ? "Hide Filters" : "Filters"}
          </button>

          <button type="button" style={pillBtn} onClick={() => setCompactMode((v2) => !v2)} title="Reduce visible columns">
            {compactMode ? "Comfort" : "Compact"}
          </button>

          <button type="button" style={pillBtn} onClick={clearFilters}>
            Clear
          </button>

          <button type="button" style={pillBtn} onClick={fetchAssignments} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div style={searchWrap}>
          <input
            type="text"
            placeholder="Search: borrower, phone, address, notes, code…"
            style={searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={subtle}>
            Showing {pagedAssignments.length} of {visibleAssignments.length} (Total {assignments.length})
          </div>
        </div>
      </div>

      {/* Auth banner - no auto redirect */}
      {authError && (
        <div style={banner("warn")}>
          <div style={{ fontWeight: 900 }}>{authError}</div>
          <button type="button" style={pillBtn} onClick={() => navigate("/login", { replace: true })}>
            Go to Login
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={banner("error")}>
          <div style={{ fontWeight: 900, whiteSpace: "pre-wrap" }}>{error}</div>
          <button type="button" style={pillBtn} onClick={fetchAssignments} disabled={loading}>
            Retry
          </button>
        </div>
      )}

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
          {!isAdmin && <span style={subtle}>(Employee view: fees/payments hidden)</span>}
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div style={filtersPanel}>
          <div style={filtersGrid}>
            {/* ✅ Created date filter */}
            <div style={field}>
              <span style={label}>Created (quick)</span>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                <button type="button" style={pillBtn} onClick={() => applyCreatedPreset("TODAY")}>Today</button>
                <button type="button" style={pillBtn} onClick={() => applyCreatedPreset("7D")}>Last 7D</button>
                <button type="button" style={pillBtn} onClick={() => applyCreatedPreset("30D")}>Last 30D</button>
                <button type="button" style={pillBtn} onClick={() => applyCreatedPreset("ALL")}>All</button>
              </div>
              <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} style={dateInput} />
                <span style={subtle}>to</span>
                <input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} style={dateInput} />
              </div>
              <div style={{ marginTop: "0.35rem", ...subtle }}>
                Note: If created date is missing on a row, it won’t show when this filter is active.
              </div>
            </div>

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
              <select style={select} value={propertyTypeFilter} onChange={(e) => setPropertyTypeFilter(e.target.value)}>
                <option value="ALL">All</option>
                {propertyTypeOptions.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={subtle}>Tip: Keep filters closed. Use Search daily. Use chips to clear fast.</div>
        </div>
      )}

      {/* Empty / loading */}
      {loading && <div style={subtle}>Loading…</div>}

      {!loading && assignments.length === 0 && !error && !authError && <div style={subtle}>No assignments yet. Create your first one.</div>}

      {/* Table */}
      {!loading && assignments.length > 0 && (
        <div style={tableWrapper}>
          {visibleAssignments.length === 0 ? (
            <div style={{ ...subtle, padding: "0.85rem 1rem" }}>
              No assignments match the current filters.
              {createdFrom || createdTo ? (
                <div style={{ marginTop: "0.35rem" }}>
                  Try: Created → All (or remove From/To).
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {/* Pagination header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.65rem 0.85rem",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#fff",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={subtle}>
                  Page {pageSafe} of {totalPages} • {visibleAssignments.length} results
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button type="button" style={pillBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}>
                    ← Prev
                  </button>
                  <button type="button" style={pillBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}>
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
                    <th style={th}>Change</th>
                  </tr>
                </thead>

                <tbody>
                  {pagedAssignments.map((a) => (
                    <tr
                      key={a.id}
                      style={row}
                      title="Click row for quick preview"
                      onClick={() => openDrawer(a)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = rowHoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                    >
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

                      <td style={td}>{safeText(a.assignment_code)}</td>
                      {!compactMode && <td style={td}>{formatCaseType(a.case_type)}</td>}
                      <td style={td}>{safeText(a.bank_name || a.valuer_client_name)}</td>
                      {!compactMode && <td style={td}>{safeText(a.borrower_name)}</td>}
                      <td style={td}>
                        <span style={badgeStyle(statusKind(a.status))}>{formatStatus(a.status)}</span>
                      </td>

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

              {/* Pagination footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.65rem 0.85rem",
                  backgroundColor: "#fff",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={subtle}>
                  Showing {pageStart + 1}-{Math.min(pageEnd, visibleAssignments.length)} of {visibleAssignments.length}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button type="button" style={pillBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}>
                    ← Prev
                  </button>
                  <button type="button" style={pillBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}>
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
                  ID: {safeText(drawerAssignment?.id)} •{" "}
                  <span style={badgeStyle(statusKind(drawerAssignment?.status))}>{formatStatus(drawerAssignment?.status)}</span>
                  {drawerLoading ? " • Loading…" : ""}
                </div>
              </div>
              <button type="button" style={closeBtn} onClick={closeDrawer} aria-label="Close">
                ×
              </button>
            </div>

            <div style={drawerBody}>
              {drawerError ? <div style={{ color: "#991b1b", fontWeight: 800 }}>{drawerError}</div> : null}

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