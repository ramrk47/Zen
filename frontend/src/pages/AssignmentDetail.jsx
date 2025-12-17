import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

async function fetchAuthedBlob(url, userEmail) {
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-User-Email": userEmail },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
  }
  const blob = await res.blob();
  return {
    blob,
    contentType: res.headers.get("content-type") || "",
  };
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
        <span style={{ fontWeight: 700 }}>From:</span> {formatStatus(p.from)}{" "}
        <span style={{ fontWeight: 700, marginLeft: "0.5rem" }}>To:</span> {formatStatus(p.to)}
      </div>
    );
  }

  if (t === "FILE_UPLOADED") {
    return (
      <div style={{ fontSize: "0.85rem", color: "#374151", marginTop: "0.25rem" }}>
        <span style={{ fontWeight: 700 }}>File:</span> {p.filename || "-"}
        {p.size_bytes ? <span style={{ marginLeft: "0.5rem" }}>({prettyBytes(p.size_bytes)})</span> : null}
      </div>
    );
  }

  if (t === "ASSIGNMENT_UPDATED") {
    const fields = Array.isArray(p.changed_fields) ? p.changed_fields : [];
    return (
      <div style={{ fontSize: "0.85rem", color: "#374151", marginTop: "0.25rem" }}>
        <span style={{ fontWeight: 700 }}>Changed:</span>{" "}
        {fields.length ? fields.join(", ") : "(details not available)"}
      </div>
    );
  }

  // fallback (compact json)
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

function AssignmentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [assignment, setAssignment] = useState(null);

  // editable fields
  const [status, setStatus] = useState("PENDING");
  const [borrowerName, setBorrowerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landArea, setLandArea] = useState("");
  const [builtupArea, setBuiltupArea] = useState("");
  const [notes, setNotes] = useState("");

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
  const [previewKind, setPreviewKind] = useState("none"); // image | pdf | text | office | other | none
  const [previewText, setPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const previewUrlRef = useRef("");

  // activity
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const downloadUrl = useMemo(() => {
    return (fileId) => `${API_BASE}/api/files/download/${fileId}`;
  }, []);

  const cleanupPreviewUrl = () => {
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch {
        // ignore
      }
      previewUrlRef.current = "";
    }
  };

  useEffect(() => {
    return () => cleanupPreviewUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFiles = async () => {
    if (!userEmail) return;
    try {
      const fRes = await fetch(`${API_BASE}/api/files/${id}`, {
        headers: { "X-User-Email": userEmail },
      });
      if (fRes.ok) {
        const arr = await fRes.json();
        const list = Array.isArray(arr) ? arr : [];
        setFiles(list);
        if (!previewFileId && list.length > 0) setPreviewFileId(list[0].id);
      } else {
        setFiles([]);
      }
    } catch {
      setFiles([]);
    }
  };

  const loadActivity = async () => {
    if (!userEmail) return;
    setActivityLoading(true);
    setActivityError("");
    try {
      const res = await fetch(`${API_BASE}/api/activity/assignment/${id}`, {
        headers: { "X-User-Email": userEmail },
      });
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
    setLoading(true);
    setError("");

    if (!userEmail) {
      setLoading(false);
      setError("Missing user identity. Please login again.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/assignments/${id}`, {
        headers: { "X-User-Email": userEmail },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }

      const data = await res.json();
      setAssignment(data);

      setStatus(data?.status || "PENDING");
      setBorrowerName(data?.borrower_name || "");
      setPhone(data?.phone || "");
      setAddress(data?.address || "");
      setLandArea(data?.land_area ?? "");
      setBuiltupArea(data?.builtup_area ?? "");
      setNotes(data?.notes || "");

      if (isAdmin) {
        setFees(data?.fees ?? "");
        setIsPaid(!!data?.is_paid);
      } else {
        setFees("");
        setIsPaid(false);
      }

      await loadFiles();
      await loadActivity();
    } catch (e) {
      console.error(e);
      setError("Failed to load assignment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    if (!userEmail) {
      setSaving(false);
      setError("Missing user identity. Please login again.");
      return;
    }

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

      if (isAdmin) {
        payload.fees = fees === "" ? 0 : Number(fees);
        payload.is_paid = !!isPaid;
      }

      const res = await fetch(`${API_BASE}/api/assignments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }

      const updated = await res.json();
      setAssignment(updated);

      // refresh activity after save
      await loadActivity();
    } catch (e) {
      console.error(e);
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;

    if (!userEmail) {
      setUploadError("Missing user identity. Please login again.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const form = new FormData();
      form.append("uploaded", file);

      const res = await fetch(`${API_BASE}/api/files/upload/${id}`, {
        method: "POST",
        headers: { "X-User-Email": userEmail },
        body: form,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status}) ${text}`);
      }

      await loadFiles();
      await loadActivity();
    } catch (e) {
      console.error(e);
      setUploadError("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const forceDownload = async (f) => {
    if (!f?.id) return;
    if (!userEmail) {
      setError("Missing user identity. Please login again.");
      return;
    }

    try {
      const { blob } = await fetchAuthedBlob(downloadUrl(f.id), userEmail);
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
        } catch {
          // ignore
        }
      }, 1500);
    } catch (e) {
      console.error(e);
      setError("Download failed.");
    }
  };

  const openPreview = async (f) => {
    if (!f?.id) return;
    if (!userEmail) {
      setPreviewError("Missing user identity. Please login again.");
      return;
    }

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
      const { blob, contentType } = await fetchAuthedBlob(downloadUrl(f.id), userEmail);
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
  }, [previewFileId]);

  // styles
  const pageStyle = { maxWidth: "980px", margin: "0 auto" };
  const subtleTextStyle = { fontSize: "0.85rem", color: "#6b7280" };
  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    padding: "1rem 1.25rem",
    marginTop: "0.75rem",
  };
  const gridTwoCol = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "0.75rem 1.5rem",
  };
  const labelStyle = {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    color: "#6b7280",
    letterSpacing: "0.04em",
    marginBottom: "0.2rem",
  };
  const inputStyle = {
    width: "100%",
    padding: "0.4rem 0.5rem",
    fontSize: "0.9rem",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
  };
  const textareaStyle = { ...inputStyle, minHeight: "90px", resize: "vertical" };
  const pillStyle = {
    display: "inline-block",
    padding: "0.15rem 0.55rem",
    borderRadius: "999px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    fontSize: "0.8rem",
    color: "#374151",
  };
  const btn = {
    padding: "0.35rem 0.8rem",
    fontSize: "0.85rem",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <button
            type="button"
            onClick={() => navigate("/assignments")}
            style={{
              padding: "0.3rem 0.7rem",
              fontSize: "0.85rem",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              marginBottom: "0.5rem",
            }}
          >
            ← Back
          </button>

          <h1 style={{ margin: 0 }}>Assignment #{id}</h1>
          <div style={subtleTextStyle}>
            {assignment?.assignment_code ? <span style={pillStyle}>{assignment.assignment_code}</span> : <span />}
            <span style={{ marginLeft: "0.6rem" }}>Created: {formatDate(assignment?.created_at)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end" }}>
          <button type="button" onClick={fetchAssignment} style={btn}>
            Refresh
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            style={{
              ...btn,
              border: "none",
              backgroundColor: saving ? "#9ca3af" : "#16a34a",
              color: "#ffffff",
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {loading && <p style={{ marginTop: "0.75rem" }}>Loading…</p>}
      {error && <p style={{ marginTop: "0.75rem", color: "red" }}>{error}</p>}

      {/* SUMMARY */}
      <section style={cardStyle}>
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>Summary</h2>
        <div style={gridTwoCol}>
          <div>
            <div style={labelStyle}>Case Type</div>
            <div style={{ fontWeight: 600 }}>{assignment?.case_type || "-"}</div>
          </div>
          <div>
            <div style={labelStyle}>Bank / Client</div>
            <div style={{ fontWeight: 600 }}>{assignment?.bank_name || assignment?.valuer_client_name || "-"}</div>
          </div>
          <div>
            <div style={labelStyle}>Branch</div>
            <div style={{ fontWeight: 600 }}>{assignment?.branch_name || "-"}</div>
          </div>
          <div>
            <div style={labelStyle}>Status</div>
            <div style={{ fontWeight: 600 }}>{formatStatus(assignment?.status)}</div>
          </div>
        </div>
      </section>

      {/* EDIT */}
      <section style={cardStyle}>
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>Edit</h2>

        <div style={gridTwoCol}>
          <div>
            <div style={labelStyle}>Status</div>
            <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={labelStyle}>Borrower Name</div>
            <input style={inputStyle} value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} />
          </div>

          <div>
            <div style={labelStyle}>Phone</div>
            <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div>
            <div style={labelStyle}>Land Area (sqft)</div>
            <input type="number" style={inputStyle} value={landArea} onChange={(e) => setLandArea(e.target.value)} />
          </div>

          <div>
            <div style={labelStyle}>Built-up Area (sqft)</div>
            <input
              type="number"
              style={inputStyle}
              value={builtupArea}
              onChange={(e) => setBuiltupArea(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <div style={labelStyle}>Address</div>
          <textarea style={textareaStyle} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <div style={labelStyle}>Notes</div>
          <textarea style={textareaStyle} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isAdmin ? (
          <div style={{ ...gridTwoCol, marginTop: "0.75rem" }}>
            <div>
              <div style={labelStyle}>Fees (₹)</div>
              <input type="number" style={inputStyle} value={fees} onChange={(e) => setFees(e.target.value)} />
            </div>
            <div>
              <div style={labelStyle}>Paid?</div>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
                <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                Mark as paid
              </label>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "0.75rem", ...subtleTextStyle }}>Finance fields are hidden for employees.</div>
        )}
      </section>

      {/* FILES + PREVIEW */}
      <section style={cardStyle}>
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>Files</h2>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
            disabled={uploading}
          />
          {uploading && <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Uploading…</span>}
        </div>

        {uploadError && <p style={{ color: "red", marginTop: "0.5rem" }}>{uploadError}</p>}

        {files.length === 0 ? (
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#6b7280" }}>No files uploaded yet.</p>
        ) : (
          <div style={{ marginTop: "0.85rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 320px) 1fr", gap: "0.9rem" }}>
              {/* file list */}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
                {files.map((f, idx) => {
                  const active = f.id === previewFileId;
                  const ext = getExt(f.filename);

                  return (
                    <div
                      key={f.id}
                      onClick={() => setPreviewFileId(f.id)}
                      style={{
                        padding: "0.6rem 0.7rem",
                        cursor: "pointer",
                        backgroundColor: active ? "#eff6ff" : "#ffffff",
                        borderBottom: idx === files.length - 1 ? "none" : "1px solid #f3f4f6",
                      }}
                      title="Click to preview"
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>{f.filename}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.15rem" }}>
                        {ext ? `.${ext}` : "file"} • Uploaded: {formatDate(f.uploaded_at)}
                        {f.size_bytes ? ` • ${prettyBytes(f.size_bytes)}` : ""}
                      </div>

                      <div style={{ marginTop: "0.45rem", display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
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
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.75rem", minHeight: "260px" }}>
                {previewError ? <div style={{ color: "red", fontSize: "0.9rem" }}>{previewError}</div> : null}

                {previewLoading ? (
                  <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>Loading preview…</div>
                ) : previewKind === "image" && previewUrl ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>Image preview</div>
                      <button type="button" style={btn} onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
                        Open in new tab
                      </button>
                    </div>
                    <div style={{ marginTop: "0.6rem" }}>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ maxWidth: "100%", maxHeight: "520px", borderRadius: "10px", border: "1px solid #e5e7eb" }}
                      />
                    </div>
                  </div>
                ) : previewKind === "pdf" && previewUrl ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>PDF preview</div>
                      <button type="button" style={btn} onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
                        Open in new tab
                      </button>
                    </div>
                    <div style={{ marginTop: "0.6rem" }}>
                      <iframe
                        title="PDF Preview"
                        src={previewUrl}
                        style={{ width: "100%", height: "540px", border: "1px solid #e5e7eb", borderRadius: "10px" }}
                      />
                    </div>
                  </div>
                ) : previewKind === "text" ? (
                  <div>
                    <div style={{ fontWeight: 700, color: "#111827" }}>Text preview</div>
                    <pre
                      style={{
                        marginTop: "0.6rem",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "0.75rem",
                        maxHeight: "540px",
                        overflow: "auto",
                        fontSize: "0.85rem",
                      }}
                    >
                      {previewText || "(empty)"}
                    </pre>
                  </div>
                ) : previewKind === "office" ? (
                  <div>
                    <div style={{ fontWeight: 700, color: "#111827" }}>Office file</div>
                    <div style={{ marginTop: "0.35rem", fontSize: "0.9rem", color: "#6b7280" }}>
                      Word/Excel/PowerPoint preview is disabled (keeps app stable).
                    </div>
                    <div style={{ marginTop: "0.65rem", fontSize: "0.9rem" }}>
                      Use <b>Open / Download</b> to open it locally.
                    </div>
                  </div>
                ) : previewKind === "other" ? (
                  <div>
                    <div style={{ fontWeight: 700, color: "#111827" }}>Preview</div>
                    <div style={{ marginTop: "0.35rem", fontSize: "0.9rem", color: "#6b7280" }}>
                      This file type can’t be rendered inline. Use Open / Download.
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>Select a file to preview.</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: "0.75rem", ...subtleTextStyle }}>
              Tip: upload site photos, sanction letters, RTC, EC, plans, report PDFs, etc.
            </div>
          </div>
        )}
      </section>

      {/* ACTIVITY */}
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <h2 style={{ marginBottom: "0.1rem", fontSize: "1rem" }}>Activity</h2>
          <button type="button" style={btn} onClick={loadActivity} disabled={activityLoading}>
            {activityLoading ? "Refreshing…" : "Refresh activity"}
          </button>
        </div>

        {activityError ? <p style={{ marginTop: "0.5rem", color: "red" }}>{activityError}</p> : null}

        {activityLoading ? (
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#6b7280" }}>Loading activity…</p>
        ) : activities.length === 0 ? (
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#6b7280" }}>
            No activity logged yet. (Create/update/status change/file upload will appear here.)
          </p>
        ) : (
          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {activities.map((a) => (
              <div
                key={a.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "0.75rem",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800, color: "#111827" }}>{prettyActivityTitle(a.type)}</div>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{formatDate(a.created_at)}</div>
                </div>
                <div style={{ marginTop: "0.25rem", fontSize: "0.85rem", color: "#6b7280" }}>
                  Actor User ID: {a.actor_user_id ?? "-"}
                </div>
                {renderPayload(a.type, a.payload)}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AssignmentDetailPage;