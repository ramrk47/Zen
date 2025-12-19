// /Users/dr.156/valuation-ops/frontend/src/pages/AssignmentDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";
import { apiFetch } from "../api/apiFetch";

const API_BASE = "http://127.0.0.1:8000";

const STATUS_OPTIONS = ["PENDING", "SITE_VISIT", "UNDER_PROCESS", "SUBMITTED", "COMPLETED", "CANCELLED"];

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

function formatDate(dt) {
  if (!dt) return "-";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toLocaleString("en-IN");
  } catch {
    return String(dt);
  }
}

function safeText(v) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

function getExt(name) {
  const s = String(name || "").toLowerCase();
  const i = s.lastIndexOf(".");
  return i >= 0 ? s.slice(i + 1) : "";
}
function isImageExt(ext) {
  return ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext);
}
function isPdfExt(ext) {
  return ext === "pdf";
}
function isTextExt(ext) {
  return ["txt", "csv", "log", "md", "json"].includes(ext);
}
function isOfficeExt(ext) {
  return ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
}

function prettyBytes(n) {
  const bytes = Number(n);
  if (!bytes || Number.isNaN(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let idx = 0;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx += 1;
  }
  return `${v.toFixed(v < 10 && idx > 0 ? 1 : 0)} ${units[idx]}`;
}

function prettyActivityTitle(type) {
  const t = String(type || "").toUpperCase();
  if (t === "ASSIGNMENT_CREATED") return "Assignment created";
  if (t === "ASSIGNMENT_UPDATED") return "Assignment updated";
  if (t === "STATUS_CHANGED") return "Status changed";
  if (t === "FILE_UPLOADED") return "File uploaded";
  if (t === "ASSIGNMENT_DELETED") return "Assignment deleted";
  return t || "Activity";
}

function renderPayload(type, payload) {
  const t = String(type || "").toUpperCase();
  const p = payload && typeof payload === "object" ? payload : null;
  if (!p) return null;

  if (t === "STATUS_CHANGED") {
    return (
      <div style={{ fontSize: "0.85rem", color: "#374151", marginTop: "0.25rem" }}>
        <span style={{ fontWeight: 800 }}>From:</span> {formatStatus(p.from)}{" "}
        <span style={{ fontWeight: 800, marginLeft: "0.5rem" }}>To:</span> {formatStatus(p.to)}
      </div>
    );
  }

  if (t === "FILE_UPLOADED") {
    return (
      <div style={{ fontSize: "0.85rem", color: "#374151", marginTop: "0.25rem" }}>
        <span style={{ fontWeight: 800 }}>File:</span> {p.filename || "-"}
        {p.size_bytes ? <span style={{ marginLeft: "0.5rem" }}>({prettyBytes(p.size_bytes)})</span> : null}
      </div>
    );
  }

  if (t === "ASSIGNMENT_UPDATED") {
    const fields = Array.isArray(p.changed_fields) ? p.changed_fields : [];
    return (
      <div style={{ fontSize: "0.85rem", color: "#374151", marginTop: "0.25rem" }}>
        <span style={{ fontWeight: 800 }}>Changed:</span> {fields.length ? fields.join(", ") : "(details not available)"}
      </div>
    );
  }

  try {
    const s = JSON.stringify(p, null, 2);
    return (
      <pre
        style={{
          marginTop: "0.35rem",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "0.6rem",
          maxHeight: "220px",
          overflow: "auto",
          fontSize: "0.8rem",
          color: "#374151",
        }}
      >
        {s}
      </pre>
    );
  } catch {
    return null;
  }
}

async function fetchBlobViaApiFetch(urlPath) {
  const res = await apiFetch(urlPath.startsWith("http") ? urlPath.replace(API_BASE, "") : urlPath, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
  }
  const blob = await res.blob();
  return { blob, contentType: res.headers.get("content-type") || "" };
}

export default function AssignmentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const user = getCurrentUser();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  // race-guard
  const reqSeq = useRef(0);

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(false);

  // editable fields
  const [status, setStatus] = useState("PENDING");
  const [borrowerName, setBorrowerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landArea, setLandArea] = useState("");
  const [builtupArea, setBuiltupArea] = useState("");
  const [notes, setNotes] = useState("");

  // header fields (dropdown-backed)
  const [headerEditEnabled, setHeaderEditEnabled] = useState(false);
  const [banks, setBanks] = useState([]); // [{id, name}]
  const [branches, setBranches] = useState([]); // [{id, name, bank_id}]
  const [propertyTypes, setPropertyTypes] = useState([]); // [{id, name}] OR [{id:<string>, name:<string>}]
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState("");

  const [bankId, setBankId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");

  // admin money fields
  const [fees, setFees] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  // files
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // preview
  const [previewFileId, setPreviewFileId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewKind, setPreviewKind] = useState("none");
  const [previewText, setPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const previewUrlRef = useRef("");

  // activity
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // edit UX
  const [editMode, setEditMode] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");

  const downloadUrl = useMemo(() => (fileId) => `${API_BASE}/api/files/download/${fileId}`, []);

  const cleanupPreviewUrl = () => {
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch {}
      previewUrlRef.current = "";
    }
  };

  useEffect(() => {
    return () => cleanupPreviewUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeList = (raw, fallbackKey = "items") => {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw?.[fallbackKey])) return raw[fallbackKey];
    if (raw && Array.isArray(raw?.banks)) return raw.banks;
    if (raw && Array.isArray(raw?.branches)) return raw.branches;
    if (raw && Array.isArray(raw?.property_types)) return raw.property_types;
    return [];
  };

  const loadMasterData = async () => {
    setMasterLoading(true);
    setMasterError("");
    try {
      // Banks
      const bRes = await apiFetch("/api/banks");
      const bJson = bRes.ok ? await bRes.json() : [];
      const bList = normalizeList(bJson, "banks");
      const banksNorm = bList
        .map((x) => ({
          id: x.id,
          name: x.name || x.bank_name || x.title || String(x.id),
        }))
        .filter((x) => x.id !== undefined && x.id !== null);

      // Property types (adjust if needed)
      const pRes = await apiFetch("/api/master/property-types");
      const pJson = pRes.ok ? await pRes.json() : [];
      const pList = normalizeList(pJson, "items");
      const pNorm = (Array.isArray(pJson) ? pJson : pList).map((x, idx) =>
        typeof x === "string"
          ? { id: x, name: x }
          : { id: x.id ?? idx, name: x.name || x.title || String(x.id ?? idx) }
      );

      setBanks(banksNorm);
      setPropertyTypes(pNorm);
    } catch (e) {
      console.error(e);
      setMasterError("Failed to load dropdown options. Check /api/banks and /api/master/property-types.");
    } finally {
      setMasterLoading(false);
    }
  };

  const loadBranchesForBank = async (bId) => {
    if (!bId) {
      setBranches([]);
      return;
    }
    try {
      const res = await apiFetch(`/api/branches?bank_id=${encodeURIComponent(bId)}`);
      const json = res.ok ? await res.json() : [];
      const list = normalizeList(json, "branches");
      const norm = list
        .map((x) => ({
          id: x.id,
          name: x.name || x.branch_name || x.title || String(x.id),
          bank_id: x.bank_id,
        }))
        .filter((x) => x.id !== undefined && x.id !== null);

      setBranches(norm);
    } catch (e) {
      console.error(e);
      setBranches([]);
    }
  };

  useEffect(() => {
    // Bank change should reload branches and reset branch selection
    const run = async () => {
      if (!bankId) {
        setBranches([]);
        setBranchId("");
        return;
      }
      await loadBranchesForBank(bankId);
      // branchId may become invalid after reload
      setBranchId((prev) => prev);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankId]);

  const buildSnapshotFromData = (data) => {
    const a = data || {};
    const bId = a?.bank_id ?? a?.bank?.id ?? "";
    const brId = a?.branch_id ?? a?.branch?.id ?? "";
    const ptId = a?.property_type_id ?? a?.propertyType?.id ?? "";

    return JSON.stringify({
      status: a.status || "PENDING",
      borrower_name: a.borrower_name || "",
      phone: a.phone || "",
      address: a.address || "",
      land_area: a.land_area ?? "",
      builtup_area: a.builtup_area ?? "",
      notes: a.notes || "",
      fees: isAdmin ? a.fees ?? "" : "",
      is_paid: isAdmin ? !!a.is_paid : false,
      bank_id: bId ? String(bId) : "",
      branch_id: brId ? String(brId) : "",
      property_type_id: ptId ? String(ptId) : "",
    });
  };

  const buildSnapshotFromState = () => {
    return JSON.stringify({
      status,
      borrower_name: borrowerName || "",
      phone: phone || "",
      address: address || "",
      land_area: landArea ?? "",
      builtup_area: builtupArea ?? "",
      notes: notes || "",
      fees: isAdmin ? fees ?? "" : "",
      is_paid: isAdmin ? !!isPaid : false,
      bank_id: bankId || "",
      branch_id: branchId || "",
      property_type_id: propertyTypeId || "",
    });
  };

  const hydrateFormFromAssignment = (data) => {
    setStatus(data?.status || "PENDING");
    setBorrowerName(data?.borrower_name || "");
    setPhone(data?.phone || "");
    setAddress(data?.address || "");
    setLandArea(data?.land_area ?? "");
    setBuiltupArea(data?.builtup_area ?? "");
    setNotes(data?.notes || "");

    const bId = data?.bank_id ?? data?.bank?.id ?? "";
    const brId = data?.branch_id ?? data?.branch?.id ?? "";
    const ptId = data?.property_type_id ?? data?.propertyType?.id ?? "";

    setBankId(bId ? String(bId) : "");
    setBranchId(brId ? String(brId) : "");
    setPropertyTypeId(ptId ? String(ptId) : "");

    if (isAdmin) {
      setFees(data?.fees ?? "");
      setIsPaid(!!data?.is_paid);
    } else {
      setFees("");
      setIsPaid(false);
    }

    // baseline for dirty-check
    setLastSavedSnapshot(buildSnapshotFromData(data));
  };

  const loadFiles = async (assignmentId) => {
    try {
      const res = await apiFetch(`/api/files/${assignmentId}`);
      if (!res.ok) {
        setFiles([]);
        return;
      }
      const arr = await res.json();
      const list = Array.isArray(arr) ? arr : [];
      setFiles(list);
      if (!previewFileId && list.length > 0) setPreviewFileId(list[0].id);
    } catch {
      setFiles([]);
    }
  };

  const loadActivity = async (assignmentId) => {
    setActivityLoading(true);
    setActivityError("");
    try {
      const res = await apiFetch(`/api/activity/assignment/${assignmentId}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }
      const arr = await res.json();
      setActivities(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.error(e);
      setActivities([]);
      setActivityError("Failed to load activity.");
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchAssignment = async () => {
    const mySeq = ++reqSeq.current;

    setLoading(true);
    setError("");

    try {
      const res = await apiFetch(`/api/assignments/${id}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }
      const data = await res.json();

      if (mySeq !== reqSeq.current) return;

      setAssignment(data);
      hydrateFormFromAssignment(data);

      await Promise.all([loadFiles(id), loadActivity(id)]);
    } catch (e) {
      console.error(e);
      if (mySeq === reqSeq.current) setError(String(e?.message || "Failed to load assignment."));
    } finally {
      if (mySeq === reqSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const bankNameSelected = useMemo(() => {
    const b = banks.find((x) => String(x.id) === String(bankId));
    return b?.name || "";
  }, [banks, bankId]);

  const branchNameSelected = useMemo(() => {
    const br = branches.find((x) => String(x.id) === String(branchId));
    return br?.name || "";
  }, [branches, branchId]);

  const propertyTypeSelected = useMemo(() => {
    const pt = propertyTypes.find((x) => String(x.id) === String(propertyTypeId));
    return pt?.name || "";
  }, [propertyTypes, propertyTypeId]);

  // Dirty check should only shout when the user is actively editing.
  // We compare against the last saved backend state (stored in lastSavedSnapshot).
  const isDirty = useMemo(() => {
    if (!editMode) return false;
    if (!lastSavedSnapshot) return false;
    return buildSnapshotFromState() !== lastSavedSnapshot;
  }, [editMode, lastSavedSnapshot, status, borrowerName, phone, address, landArea, builtupArea, notes, fees, isPaid, isAdmin, bankId, branchId, propertyTypeId]);

  const unlockHeaderEdit = async () => {
    const ok = window.confirm(
      "Are you sure you want to edit Bank / Branch / Property Type?\n\nThis affects filters, reports, and analytics."
    );
    if (!ok) return;

    // load dropdowns only when needed
    if (banks.length === 0 || propertyTypes.length === 0) {
      await loadMasterData();
    }

    // if we have a bank selected, load branches
    if (bankId) await loadBranchesForBank(bankId);

    setHeaderEditEnabled(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const payload = {
        status,
        borrower_name: borrowerName || null,
        phone: phone || null,
        address: address || null,
        land_area: landArea === "" ? null : Number(landArea),
        builtup_area: builtupArea === "" ? null : Number(builtupArea),
        notes: notes || null,
      };

      // Header fields:
      // Prefer ID-based payload if backend supports it; also send names as fallback-friendly.
      // Backend can ignore whichever it doesn't use.
      payload.bank_id = bankId ? Number(bankId) : null;
      payload.branch_id = branchId ? Number(branchId) : null;
      payload.property_type_id = propertyTypeId === "" ? null : (isNaN(Number(propertyTypeId)) ? propertyTypeId : Number(propertyTypeId));

      payload.bank_name = bankNameSelected || null;
      payload.branch_name = branchNameSelected || null;
      payload.property_type = propertyTypeSelected || null;

      if (isAdmin) {
        payload.fees = fees === "" ? 0 : Number(fees);
        payload.is_paid = !!isPaid;
      }

      const res = await apiFetch(`/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }

      const updated = await res.json();
      setAssignment(updated);
      hydrateFormFromAssignment(updated);
      // exit edit mode and reset dirty baseline
      setEditMode(false);
      setHeaderEditEnabled(false);

      await loadActivity(id);
    } catch (e) {
      console.error(e);
      setError(String(e?.message || "Failed to save changes."));
    } finally {
      setSaving(false);
    }
  };
  const handleReset = () => {
    if (!assignment) return;
    hydrateFormFromAssignment(assignment);
    setEditMode(false);
    setHeaderEditEnabled(false);
  };
  // Quick actions

  const handleDelete = async () => {
    const ok = window.confirm("Delete this assignment permanently?\n\nThis cannot be undone.");
    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      const res = await apiFetch(`/api/assignments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }
      navigate("/assignments", { replace: true });
    } catch (e) {
      console.error(e);
      setError(String(e?.message || "Delete failed."));
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");

    try {
      const form = new FormData();
      form.append("uploaded", file);

      const res = await apiFetch(`/api/files/upload/${id}`, { method: "POST", body: form });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status}) ${text}`);
      }

      await Promise.all([loadFiles(id), loadActivity(id)]);
    } catch (e) {
      console.error(e);
      setUploadError(String(e?.message || "Failed to upload file."));
    } finally {
      setUploading(false);
    }
  };

  const forceDownload = async (f) => {
    if (!f?.id) return;
    try {
      const { blob } = await fetchBlobViaApiFetch(downloadUrl(f.id));
      const objUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objUrl;
      a.download = f?.filename || `file_${f.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => {
        try {
          URL.revokeObjectURL(objUrl);
        } catch {}
      }, 1500);
    } catch (e) {
      console.error(e);
      setError("Download failed.");
    }
  };

  const openPreview = async (f) => {
    if (!f?.id) return;

    setPreviewLoading(true);
    setPreviewError("");
    setPreviewText("");

    cleanupPreviewUrl();
    setPreviewUrl("");
    setPreviewKind("none");

    const ext = getExt(f.filename);
    if (isOfficeExt(ext)) {
      setPreviewKind("office");
      setPreviewLoading(false);
      return;
    }

    try {
      const { blob, contentType } = await fetchBlobViaApiFetch(downloadUrl(f.id));
      const ct = String(contentType || f.content_type || "").toLowerCase();

      if (ct.startsWith("image/") || isImageExt(ext)) {
        const objUrl = URL.createObjectURL(blob);
        previewUrlRef.current = objUrl;
        setPreviewUrl(objUrl);
        setPreviewKind("image");
      } else if (ct.includes("pdf") || isPdfExt(ext)) {
        const objUrl = URL.createObjectURL(blob);
        previewUrlRef.current = objUrl;
        setPreviewUrl(objUrl);
        setPreviewKind("pdf");
      } else if (ct.startsWith("text/") || isTextExt(ext) || ext === "") {
        const text = await blob.text();
        setPreviewText(text.slice(0, 200000));
        setPreviewKind("text");
      } else {
        const objUrl = URL.createObjectURL(blob);
        previewUrlRef.current = objUrl;
        setPreviewUrl(objUrl);
        setPreviewKind("other");
      }
    } catch (e) {
      console.error(e);
      setPreviewError("Preview failed. Try Open / Download.");
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!previewFileId) return;
    const f = files.find((x) => x.id === previewFileId);
    if (!f) return;
    openPreview(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewFileId, files]);

  // Quick actions
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
    } catch {}
  };

  const whatsappLink = useMemo(() => {
    const p = String(phone || "").replace(/[^\d]/g, "");
    if (!p) return "";
    const normalized = p.length === 10 ? `91${p}` : p;
    return `https://wa.me/${normalized}`;
  }, [phone]);

  // --- styles ---
  const pageStyle = { maxWidth: 1040, margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.9rem" };
  const header = { display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" };
  const title = { margin: 0, fontSize: "1.8rem", fontWeight: 950, letterSpacing: "-0.01em" };
  const subtle = { fontSize: "0.88rem", color: "#6b7280" };

  const pill = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.18rem 0.6rem",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    fontSize: "0.82rem",
    color: "#374151",
    fontWeight: 800,
    whiteSpace: "nowrap",
  };

  const pillWarn = { ...pill, background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" };

  const btn = {
    padding: "0.45rem 0.9rem",
    fontSize: "0.9rem",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
  };

  const btnPrimary = { ...btn, border: "none", background: "#16a34a", color: "#fff", fontWeight: 900 };
  const btnBlue = { ...btn, border: "none", background: "#2563eb", color: "#fff", fontWeight: 900 };
  const btnDanger = { ...btn, border: "none", background: "#dc2626", color: "#fff", fontWeight: 950 };

  const card = { background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1rem 1.1rem" };
  const sectionTitle = { margin: 0, fontSize: "0.95rem", fontWeight: 950, color: "#111827" };
  const gridTwo = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem 1rem" };

  const label = { fontSize: "0.75rem", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.06em", marginBottom: "0.2rem" };

  const input = {
    width: "100%",
    padding: "0.55rem 0.65rem",
    fontSize: "0.92rem",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
  };

  const textarea = { ...input, minHeight: 96, resize: "vertical" };
  const split = { display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "0.9rem", alignItems: "start" };
  const fileList = { border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" };
  const fileRow = (active) => ({ padding: "0.65rem 0.75rem", cursor: "pointer", background: active ? "#eff6ff" : "#fff", borderBottom: "1px solid #f3f4f6" });
  const fileMeta = { fontSize: "0.82rem", color: "#6b7280", marginTop: "0.15rem" };
  const previewBox = { border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.85rem", minHeight: 280 };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={header}>
        <div>
          <button type="button" onClick={() => navigate("/assignments")} style={btn}>
            ← Back
          </button>

          <div style={{ marginTop: "0.55rem" }}>
            <h1 style={title}>Assignment #{id}</h1>
            <div style={subtle}>
              {assignment?.assignment_code ? <span style={pill}>{assignment.assignment_code}</span> : null}
              <span style={{ marginLeft: "0.6rem" }}>Created: {formatDate(assignment?.created_at)}</span>
              {isDirty ? <span style={{ marginLeft: "0.6rem", ...pillWarn }}>Unsaved changes</span> : null}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" onClick={fetchAssignment} style={btn} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          {!editMode ? (
            <button type="button" onClick={() => setEditMode(true)} style={btnPrimary} disabled={saving || loading}>
              Edit
            </button>
          ) : (
            <>
              <button type="button" onClick={handleReset} style={btn} disabled={saving}>
                Reset
              </button>
              <button type="button" onClick={handleSave} style={btnPrimary} disabled={saving || !isDirty}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
          {isAdmin ? (
            <button type="button" onClick={handleDelete} style={btnDanger} disabled={saving}>
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {loading && <div style={subtle}>Loading…</div>}
      {error && <div style={{ ...card, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b", fontWeight: 800 }}>{error}</div>}

      {/* Summary */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <h2 style={sectionTitle}>Summary</h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={pill}>{formatStatus(assignment?.status)}</span>
            {isAdmin ? (
              <button type="button" style={btn} onClick={unlockHeaderEdit} disabled={headerEditEnabled}>
                {headerEditEnabled ? "Header editing enabled" : "Edit header fields"}
              </button>
            ) : null}
          </div>
        </div>

        {masterError ? (
          <div style={{ marginTop: "0.65rem", color: "#991b1b", fontWeight: 800 }}>
            {masterError}
          </div>
        ) : null}

        <div style={{ marginTop: "0.75rem", ...gridTwo }}>
          <div>
            <div style={label}>Case Type</div>
            <div style={{ fontWeight: 900, color: "#111827" }}>{safeText(assignment?.case_type)}</div>
          </div>

          <div>
            <div style={label}>Bank</div>
            {!headerEditEnabled ? (
              <div style={{ fontWeight: 900, color: "#111827" }}>{safeText(assignment?.bank_name || assignment?.valuer_client_name)}</div>
            ) : (
              <select
                style={input}
                value={bankId}
                onChange={(e) => {
                  setBankId(e.target.value);
                  setBranchId("");
                }}
                disabled={masterLoading || !editMode}
              >
                <option value="">Select bank</option>
                {banks.map((b) => (
                  <option key={String(b.id)} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div style={label}>Branch</div>
            {!headerEditEnabled ? (
              <div style={{ fontWeight: 900, color: "#111827" }}>{safeText(assignment?.branch_name)}</div>
            ) : (
              <select
                style={input}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={!bankId || masterLoading || !editMode}
              >
                <option value="">{bankId ? "Select branch" : "Select bank first"}</option>
                {branches.map((br) => (
                  <option key={String(br.id)} value={String(br.id)}>
                    {br.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div style={label}>Property Type</div>
            {!headerEditEnabled ? (
              <div style={{ fontWeight: 900, color: "#111827" }}>{safeText(assignment?.property_type)}</div>
            ) : (
              <select
                style={input}
                value={propertyTypeId}
                onChange={(e) => setPropertyTypeId(e.target.value)}
                disabled={masterLoading || !editMode}
              >
                <option value="">Select property type</option>
                {propertyTypes.map((pt) => (
                  <option key={String(pt.id)} value={String(pt.id)}>
                    {pt.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {headerEditEnabled ? (
          <div style={{ marginTop: "0.65rem", ...subtle }}>
            Header edits use dropdowns to prevent mismatched data. Save to apply.
          </div>
        ) : null}
      </section>

      {/* Edit */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <h2 style={sectionTitle}>Edit</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {assignment?.assignment_code ? (
              <button type="button" style={btn} onClick={() => copyToClipboard(assignment.assignment_code)}>
                Copy code
              </button>
            ) : null}
            {phone ? (
              <>
                <button type="button" style={btn} onClick={() => copyToClipboard(phone)}>
                  Copy phone
                </button>
                {whatsappLink ? (
                  <button type="button" style={btnBlue} onClick={() => window.open(whatsappLink, "_blank", "noopener,noreferrer")}>
                    WhatsApp
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: "0.8rem", ...gridTwo }}>
          <div>
            <div style={label}>Status</div>
            <select
              style={input}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={!editMode}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={label}>Borrower Name</div>
            <input
              style={input}
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              disabled={!editMode}
            />
          </div>

          <div>
            <div style={label}>Phone</div>
            <input
              style={input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!editMode}
            />
          </div>

          <div>
            <div style={label}>Land Area (sqft)</div>
            <input
              type="number"
              style={input}
              value={landArea}
              onChange={(e) => setLandArea(e.target.value)}
              disabled={!editMode}
            />
          </div>

          <div>
            <div style={label}>Built-up Area (sqft)</div>
            <input
              type="number"
              style={input}
              value={builtupArea}
              onChange={(e) => setBuiltupArea(e.target.value)}
              disabled={!editMode}
            />
          </div>

          {isAdmin ? (
            <>
              <div>
                <div style={label}>Fees (₹)</div>
                <input
                  type="number"
                  style={input}
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  disabled={!editMode}
                />
              </div>

              <div>
                <div style={label}>Paid?</div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", fontSize: "0.95rem", color: "#111827", fontWeight: 800 }}>
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    disabled={!editMode}
                  />
                  Mark as paid
                </label>
              </div>
            </>
          ) : (
            <div style={{ gridColumn: "1 / -1", ...subtle }}>Finance fields are hidden for employees.</div>
          )}
        </div>

        <div style={{ marginTop: "0.85rem" }}>
          <div style={label}>Address</div>
          <textarea
            style={textarea}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={!editMode}
          />
        </div>

        <div style={{ marginTop: "0.85rem" }}>
          <div style={label}>Notes</div>
          <textarea
            style={textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!editMode}
          />
        </div>
      </section>

      {/* Files + Preview */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <h2 style={sectionTitle}>Files</h2>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
              disabled={uploading}
            />
            {uploading ? <span style={subtle}>Uploading…</span> : null}
          </div>
        </div>

        {uploadError ? <div style={{ marginTop: "0.6rem", color: "#991b1b", fontWeight: 800 }}>{uploadError}</div> : null}

        {files.length === 0 ? (
          <div style={{ marginTop: "0.6rem", ...subtle }}>No files uploaded yet.</div>
        ) : (
          <div style={{ marginTop: "0.85rem", ...split }}>
            {/* list */}
            <div style={fileList}>
              {files.map((f, idx) => {
                const active = f.id === previewFileId;
                const ext = getExt(f.filename);
                const last = idx === files.length - 1;

                return (
                  <div
                    key={f.id}
                    onClick={() => setPreviewFileId(f.id)}
                    style={{ ...fileRow(active), borderBottom: last ? "none" : "1px solid #f3f4f6" }}
                    title="Click to preview"
                  >
                    <div style={{ fontWeight: 950, color: "#111827" }}>{safeText(f.filename)}</div>
                    <div style={fileMeta}>
                      {ext ? `.${ext}` : "file"} • {formatDate(f.uploaded_at)} {f.size_bytes ? ` • ${prettyBytes(f.size_bytes)}` : ""}
                    </div>

                    <div style={{ marginTop: "0.55rem", display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={btn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewFileId(f.id);
                        }}
                      >
                        Preview
                      </button>

                      <button
                        type="button"
                        style={btn}
                        onClick={(e) => {
                          e.stopPropagation();
                          forceDownload(f);
                        }}
                      >
                        Open / Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* preview */}
            <div style={previewBox}>
              {previewError ? <div style={{ color: "#991b1b", fontWeight: 800 }}>{previewError}</div> : null}

              {previewLoading ? (
                <div style={subtle}>Loading preview…</div>
              ) : previewKind === "image" && previewUrl ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ fontWeight: 950, color: "#111827" }}>Image preview</div>
                    <button type="button" style={btn} onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
                      Open in new tab
                    </button>
                  </div>
                  <div style={{ marginTop: "0.7rem" }}>
                    <img src={previewUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: 560, borderRadius: 12, border: "1px solid #e5e7eb" }} />
                  </div>
                </div>
              ) : previewKind === "pdf" && previewUrl ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ fontWeight: 950, color: "#111827" }}>PDF preview</div>
                    <button type="button" style={btn} onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
                      Open in new tab
                    </button>
                  </div>
                  <div style={{ marginTop: "0.7rem" }}>
                    <iframe title="PDF Preview" src={previewUrl} style={{ width: "100%", height: 560, border: "1px solid #e5e7eb", borderRadius: 12 }} />
                  </div>
                </div>
              ) : previewKind === "text" ? (
                <div>
                  <div style={{ fontWeight: 950, color: "#111827" }}>Text preview</div>
                  <pre
                    style={{
                      marginTop: "0.7rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      backgroundColor: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: "0.85rem",
                      maxHeight: 560,
                      overflow: "auto",
                      fontSize: "0.85rem",
                      color: "#374151",
                    }}
                  >
                    {previewText || "(empty)"}
                  </pre>
                </div>
              ) : previewKind === "office" ? (
                <div>
                  <div style={{ fontWeight: 950, color: "#111827" }}>Office file</div>
                  <div style={{ marginTop: "0.4rem", ...subtle }}>Word/Excel/PowerPoint preview is disabled to keep the app stable.</div>
                  <div style={{ marginTop: "0.7rem", fontSize: "0.92rem", color: "#111827" }}>
                    Use <b>Open / Download</b>.
                  </div>
                </div>
              ) : previewKind === "other" ? (
                <div>
                  <div style={{ fontWeight: 950, color: "#111827" }}>Preview</div>
                  <div style={{ marginTop: "0.4rem", ...subtle }}>This file type can’t be rendered inline. Use Open / Download.</div>
                </div>
              ) : (
                <div style={subtle}>Select a file to preview.</div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: "0.75rem", ...subtle }}>
          Tip: Upload site photos, RTC/EC, plans, sanction letters, report PDF — this becomes your “case folder”.
        </div>
      </section>

      {/* Activity */}
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <h2 style={sectionTitle}>Activity</h2>
          <button type="button" style={btn} onClick={() => loadActivity(id)} disabled={activityLoading}>
            {activityLoading ? "Refreshing…" : "Refresh activity"}
          </button>
        </div>

        {activityError ? <div style={{ marginTop: "0.55rem", color: "#991b1b", fontWeight: 800 }}>{activityError}</div> : null}

        {activityLoading ? (
          <div style={{ marginTop: "0.65rem", ...subtle }}>Loading activity…</div>
        ) : activities.length === 0 ? (
          <div style={{ marginTop: "0.65rem", ...subtle }}>No activity logged yet. (Create/update/status change/file upload will appear here.)</div>
        ) : (
          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {activities.map((a) => (
              <div key={a.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: "0.8rem", backgroundColor: "#ffffff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 950, color: "#111827" }}>{prettyActivityTitle(a.type)}</div>
                  <div style={subtle}>{formatDate(a.created_at)}</div>
                </div>
                <div style={{ marginTop: "0.25rem", ...subtle }}>Actor User ID: {a.actor_user_id ?? "-"}</div>
                {renderPayload(a.type, a.payload)}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}