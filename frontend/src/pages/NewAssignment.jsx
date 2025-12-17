// src/pages/NewAssignment.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const CASE_TYPE_OPTIONS = ["BANK", "EXTERNAL_VALUER", "DIRECT_CLIENT"];

function NewAssignmentPage() {
  const navigate = useNavigate();

  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  // core fields
  const [caseType, setCaseType] = useState("BANK");

  // master lists
  const [banks, setBanks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [clients, setClients] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);

  // selected IDs
  const [bankId, setBankId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [clientId, setClientId] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");

  // other fields
  const [borrowerName, setBorrowerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landArea, setLandArea] = useState("");
  const [builtupArea, setBuiltupArea] = useState("");
  const [status, setStatus] = useState("PENDING");

  // admin-only fields (UI)
  const [fees, setFees] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  const [notes, setNotes] = useState("");

  // UI placeholders
  const [locationLink, setLocationLink] = useState("");
  const [files, setFiles] = useState([]);

  const [loadingMaster, setLoadingMaster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  // upload UI
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadError, setUploadError] = useState("");

  const authedFetch = async (url, opts = {}) => {
    if (!userEmail) throw new Error("Missing user identity");
    const headers = {
      ...(opts.headers || {}),
      "X-User-Email": userEmail,
    };
    return fetch(url, { ...opts, headers });
  };

  const uploadOneFile = async (assignmentId, file) => {
    const form = new FormData();
    // backend expects field name: "uploaded"
    form.append("uploaded", file);

    const res = await authedFetch(`${API_BASE}/api/files/upload/${assignmentId}`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Upload failed (${res.status}) ${text}`);
    }
    return res.json().catch(() => ({}));
  };

  const uploadSelectedFiles = async (assignmentId) => {
    const list = Array.isArray(files) ? files : [];
    if (list.length === 0) return;

    setUploadingFiles(true);
    setUploadError("");
    setUploadProgress({ done: 0, total: list.length });

    try {
      // sequential = stable
      for (let i = 0; i < list.length; i += 1) {
        await uploadOneFile(assignmentId, list[i]);
        setUploadProgress({ done: i + 1, total: list.length });
      }
    } catch (e) {
      console.error("File upload error:", e);
      setUploadError("Some files failed to upload. You can retry from the Assignment page.");
    } finally {
      setUploadingFiles(false);
    }
  };

  // ---------- Master data fetch ----------
  useEffect(() => {
    const loadMaster = async () => {
      setLoadingMaster(true);
      setMasterError("");

      if (!userEmail) {
        setMasterError("Missing user identity. Please login again.");
        setLoadingMaster(false);
        return;
      }

      try {
        const [banksRes, clientsRes, propRes] = await Promise.all([
          authedFetch(`${API_BASE}/api/master/banks`),
          authedFetch(`${API_BASE}/api/master/clients`),
          authedFetch(`${API_BASE}/api/master/property-types`),
        ]);

        if (!banksRes.ok || !clientsRes.ok || !propRes.ok) {
          setMasterError("Failed to load master data. Check backend /api/master/* endpoints.");
          return;
        }

        const [banksJson, clientsJson, propJson] = await Promise.all([
          banksRes.json(),
          clientsRes.json(),
          propRes.json(),
        ]);

        setBanks(Array.isArray(banksJson) ? banksJson : []);
        setClients(Array.isArray(clientsJson) ? clientsJson : []);
        setPropertyTypes(Array.isArray(propJson) ? propJson : []);
      } catch (e) {
        console.error("Master load error:", e);
        setMasterError(
          e?.message === "Missing user identity"
            ? "Missing user identity. Please login again."
            : "Failed to load master data."
        );
      } finally {
        setLoadingMaster(false);
      }
    };

    loadMaster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // Load branches when bankId changes
  useEffect(() => {
    const loadBranches = async () => {
      setBranches([]);
      setBranchId("");

      if (!bankId) return;
      if (!userEmail) return;

      try {
        const res = await authedFetch(
          `${API_BASE}/api/master/branches?bank_id=${encodeURIComponent(bankId)}`
        );
        if (!res.ok) return;
        const json = await res.json();
        setBranches(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("Branches load error:", e);
      }
    };

    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankId, userEmail]);

  // Reset selections when caseType changes
  useEffect(() => {
    setError("");
    setUploadError("");

    if (caseType === "BANK") {
      setClientId("");
    } else {
      setBankId("");
      setBranchId("");
      setBranches([]);
    }
  }, [caseType]);

  // If not admin, hard-lock money states
  useEffect(() => {
    if (!isAdmin) {
      setFees("");
      setIsPaid(false);
    }
  }, [isAdmin]);

  const handleFilesChange = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setUploadError("");
    setUploadProgress({ done: 0, total: 0 });

    if (!userEmail) {
      setSaving(false);
      setError("Missing user identity. Please login again.");
      return;
    }

    try {
      if (caseType === "BANK") {
        if (!bankId) {
          setError("Please select a Bank.");
          setSaving(false);
          return;
        }
        if (!branchId) {
          setError("Please select a Branch (depends on Bank).");
          setSaving(false);
          return;
        }
      } else {
        if (!clientId) {
          setError("Please select a Client.");
          setSaving(false);
          return;
        }
      }

      const payload = {
        case_type: caseType,

        bank_id: caseType === "BANK" ? Number(bankId) : null,
        branch_id: caseType === "BANK" ? Number(branchId) : null,

        client_id: caseType !== "BANK" ? Number(clientId) : null,
        valuer_client_name: null,

        property_type_id: propertyTypeId ? Number(propertyTypeId) : null,

        borrower_name: borrowerName || null,
        phone: phone || null,
        address: address || null,
        land_area: landArea ? Number(landArea) : null,
        builtup_area: builtupArea ? Number(builtupArea) : null,
        status,
        notes: notes || null,

        // UI-only for now (backend can ignore safely if schema doesn’t include it)
        // location_link: locationLink || null,
      };

      if (isAdmin) {
        payload.fees = fees ? Number(fees) : 0;
        payload.is_paid = isPaid;
      }

      const res = await authedFetch(`${API_BASE}/api/assignments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Create failed", res.status, text);
        setError("Failed to create assignment. Check console for details.");
        setSaving(false);
        return;
      }

      const created = await res.json();

      if (created?.id) {
        // upload selected files before navigating
        await uploadSelectedFiles(created.id);
        navigate(`/assignments/${created.id}`);
      } else {
        navigate("/assignments");
      }
    } catch (err) {
      console.error("Error creating assignment", err);
      setError("Error creating assignment.");
    } finally {
      setSaving(false);
    }
  };

  // ------- styles -------
  const pageStyle = { maxWidth: "900px", margin: "0 auto" };
  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    padding: "1rem 1.25rem",
    marginTop: "0.75rem",
  };
  const headingStyle = { fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.25rem" };
  const labelStyle = {
    fontSize: "0.8rem",
    textTransform: "uppercase",
    color: "#6b7280",
    letterSpacing: "0.04em",
    marginBottom: "0.2rem",
  };
  const inputStyle = {
    width: "100%",
    padding: "0.4rem 0.5rem",
    fontSize: "0.9rem",
    borderRadius: "4px",
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
  };
  const textareaStyle = { ...inputStyle, minHeight: "90px", resize: "vertical" };
  const selectStyle = { ...inputStyle, backgroundColor: "#fff" };
  const gridTwoCol = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.75rem 1.5rem",
  };
  const sectionTitleStyle = { fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" };
  const hintStyle = { fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem" };
  const filesListStyle = { fontSize: "0.8rem", color: "#4b5563", marginTop: "0.4rem" };

  return (
    <div style={pageStyle}>
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

      <h1 style={headingStyle}>New Assignment</h1>
      <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
        Banks/Branches/Clients/Property Types are controlled.
        {isAdmin ? " (Admin: Fees visible)" : " (Employee: Fees hidden)"}
      </p>

      {masterError && (
        <div style={{ ...cardStyle, borderColor: "#fca5a5", backgroundColor: "#fff1f2" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Master Data not loaded</div>
          <div style={{ fontSize: "0.85rem", color: "#7f1d1d" }}>{masterError}</div>
          <div style={hintStyle}>Fix backend first, then refresh.</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Basic Details</h2>

          <div style={gridTwoCol}>
            <div>
              <div style={labelStyle}>Case Type</div>
              <select
                style={selectStyle}
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
              >
                {CASE_TYPE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c === "EXTERNAL_VALUER" ? "External Valuer" : c === "DIRECT_CLIENT" ? "Direct Client" : c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={labelStyle}>Status</div>
              <select style={selectStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "PENDING"
                      ? "Pending"
                      : s === "SITE_VISIT"
                      ? "Site Visit"
                      : s === "UNDER_PROCESS"
                      ? "Under Process"
                      : s === "SUBMITTED"
                      ? "Submitted"
                      : s === "COMPLETED"
                      ? "Completed"
                      : s === "CANCELLED"
                      ? "Cancelled"
                      : s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingMaster && <div style={hintStyle}>Loading master data…</div>}
        </div>

        {/* Parties */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Parties</h2>

          <div style={gridTwoCol}>
            {caseType === "BANK" ? (
              <>
                <div>
                  <div style={labelStyle}>Bank</div>
                  <select
                    style={selectStyle}
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    disabled={!userEmail}
                  >
                    <option value="">-- Select Bank --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={labelStyle}>Branch (depends on Bank)</div>
                  <select
                    style={selectStyle}
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    disabled={!userEmail || !bankId}
                  >
                    <option value="">{bankId ? "-- Select Branch --" : "-- Select Bank first --"}</option>
                    {branches.map((br) => (
                      <option key={br.id} value={br.id}>
                        {br.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <div style={labelStyle}>{caseType === "EXTERNAL_VALUER" ? "External Valuer (Client)" : "Direct Client"}</div>
                <select
                  style={selectStyle}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={!userEmail}
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div style={hintStyle}>If missing: add it in Master Clients (admin).</div>
              </div>
            )}

            <div>
              <div style={labelStyle}>Borrower Name</div>
              <input style={inputStyle} value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} disabled={!userEmail} />
            </div>

            <div>
              <div style={labelStyle}>Phone</div>
              <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!userEmail} />
            </div>
          </div>
        </div>

        {/* Property */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Property</h2>

          <div style={gridTwoCol}>
            <div>
              <div style={labelStyle}>Address</div>
              <textarea style={textareaStyle} value={address} onChange={(e) => setAddress(e.target.value)} disabled={!userEmail} />
            </div>

            <div>
              <div style={labelStyle}>Property Type</div>
              <select style={selectStyle} value={propertyTypeId} onChange={(e) => setPropertyTypeId(e.target.value)} disabled={!userEmail}>
                <option value="">-- Select Property Type --</option>
                {propertyTypes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={labelStyle}>Land Area (sqft)</div>
              <input type="number" style={inputStyle} value={landArea} onChange={(e) => setLandArea(e.target.value)} disabled={!userEmail} />
            </div>

            <div>
              <div style={labelStyle}>Built-up Area (sqft)</div>
              <input type="number" style={inputStyle} value={builtupArea} onChange={(e) => setBuiltupArea(e.target.value)} disabled={!userEmail} />
            </div>
          </div>
        </div>

        {/* Fees & Notes */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Fees & Notes</h2>

          {isAdmin ? (
            <div style={gridTwoCol}>
              <div>
                <div style={labelStyle}>Fees (₹)</div>
                <input type="number" style={inputStyle} value={fees} onChange={(e) => setFees(e.target.value)} disabled={!userEmail} />
              </div>

              <div>
                <div style={labelStyle}>Paid?</div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
                  <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} disabled={!userEmail} />
                  Mark as paid
                </label>
              </div>
            </div>
          ) : (
            <div style={hintStyle}>Fees are hidden for employees.</div>
          )}

          <div style={{ marginTop: "0.75rem" }}>
            <div style={labelStyle}>Internal Notes</div>
            <textarea style={textareaStyle} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!userEmail} />
          </div>
        </div>

        {/* Location + Attachments */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Location & Attachments</h2>

          <div style={gridTwoCol}>
            <div>
              <div style={labelStyle}>Location Link</div>
              <input style={inputStyle} value={locationLink} onChange={(e) => setLocationLink(e.target.value)} disabled={!userEmail} />
              <div style={hintStyle}>UI only for now. We’ll wire it later.</div>
            </div>

            <div>
              <div style={labelStyle}>Attach Files (photos, docs)</div>
              <input type="file" multiple onChange={handleFilesChange} disabled={!userEmail || saving || uploadingFiles} />
              <div style={hintStyle}>Files will upload automatically after you click <b>Create Assignment</b>.</div>

              {uploadingFiles && (
                <div style={{ ...hintStyle, marginTop: "0.35rem" }}>
                  Uploading: {uploadProgress.done}/{uploadProgress.total}
                </div>
              )}

              {uploadError && (
                <div style={{ marginTop: "0.35rem", color: "#b91c1c", fontSize: "0.85rem" }}>{uploadError}</div>
              )}

              {files.length > 0 && (
                <div style={filesListStyle}>
                  Selected:
                  <ul>
                    {files.map((f) => (
                      <li key={f.name}>
                        {f.name} ({Math.round(f.size / 1024)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save */}
        <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>{error && <span style={{ color: "red", fontSize: "0.85rem" }}>{error}</span>}</div>

          <button
            type="submit"
            disabled={saving || uploadingFiles || !userEmail}
            style={{
              padding: "0.4rem 1rem",
              fontSize: "0.9rem",
              borderRadius: "999px",
              border: "none",
              backgroundColor: saving || uploadingFiles ? "#9ca3af" : "#16a34a",
              color: "#ffffff",
              cursor: saving || uploadingFiles ? "default" : "pointer",
            }}
          >
            {saving ? "Saving…" : uploadingFiles ? "Uploading…" : "Create Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewAssignmentPage;