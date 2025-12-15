import React, { useEffect, useMemo, useState } from "react";
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

function AssignmentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [assignment, setAssignment] = useState(null);

  // editable fields (keep minimal & safe)
  const [status, setStatus] = useState("PENDING");
  const [borrowerName, setBorrowerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landArea, setLandArea] = useState("");
  const [builtupArea, setBuiltupArea] = useState("");
  const [notes, setNotes] = useState("");

  // admin money fields (only shown if admin)
  const [fees, setFees] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  // files
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadFiles = async () => {
    if (!userEmail) return;
    try {
      const fRes = await fetch(`${API_BASE}/api/files/${id}`, {
        headers: { "X-User-Email": userEmail },
      });
      if (fRes.ok) {
        const fJson = await fRes.json();
        setFiles(Array.isArray(fJson) ? fJson : []);
      } else {
        setFiles([]);
      }
    } catch {
      setFiles([]);
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

      // seed form
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
    } catch (e) {
      console.error(e);
      setUploadError("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const downloadUrl = useMemo(() => {
    return (fileId) => `${API_BASE}/api/files/download/${fileId}`;
  }, []);

  // ---------- styles ----------
  const pageStyle = { maxWidth: "980px", margin: "0 auto" };

  const topRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginBottom: "0.75rem",
  };

  const subtleTextStyle = { fontSize: "0.85rem", color: "#6b7280" };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    padding: "1rem 1.25rem",
    marginTop: "0.75rem",
  };

  const sectionStyle = cardStyle;

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

  return (
    <div style={pageStyle}>
      <div style={topRowStyle}>
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
            {assignment?.assignment_code ? (
              <span style={pillStyle}>{assignment.assignment_code}</span>
            ) : (
              <span />
            )}
            <span style={{ marginLeft: "0.6rem" }}>
              Created: {formatDate(assignment?.created_at)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={fetchAssignment}
            style={{
              padding: "0.35rem 0.8rem",
              fontSize: "0.85rem",
              borderRadius: "999px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            style={{
              padding: "0.35rem 0.9rem",
              fontSize: "0.85rem",
              borderRadius: "999px",
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
      <section style={sectionStyle}>
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>Summary</h2>
        <div style={gridTwoCol}>
          <div>
            <div style={labelStyle}>Case Type</div>
            <div style={{ fontWeight: 600 }}>{assignment?.case_type || "-"}</div>
          </div>
          <div>
            <div style={labelStyle}>Bank / Client</div>
            <div style={{ fontWeight: 600 }}>
              {assignment?.bank_name || assignment?.valuer_client_name || "-"}
            </div>
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
      <section style={sectionStyle}>
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
            <input type="number" style={inputStyle} value={builtupArea} onChange={(e) => setBuiltupArea(e.target.value)} />
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
          <div style={{ marginTop: "0.75rem", ...subtleTextStyle }}>
            Finance fields are hidden for employees.
          </div>
        )}
      </section>

      {/* FILES */}
      <section style={sectionStyle}>
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
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#6b7280" }}>
            No files uploaded yet.
          </p>
        ) : (
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem 1rem" }}>
              {files.map((f) => (
                <React.Fragment key={f.id}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{f.filename}</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      Uploaded: {formatDate(f.uploaded_at)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <a
                      href={downloadUrl(f.id)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: "0.85rem",
                        textDecoration: "none",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "999px",
                        border: "1px solid #d1d5db",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      Download
                    </a>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: "0.75rem", ...subtleTextStyle }}>
          Tip: upload site photos, documents, sanction letters, etc.
        </div>
      </section>
    </div>
  );
}

export default AssignmentDetailPage;