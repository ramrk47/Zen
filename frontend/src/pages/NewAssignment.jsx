// src/pages/NewAssignment.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  // core fields
  const [caseType, setCaseType] = useState("BANK");

  // Master data lists
  const [banks, setBanks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [clients, setClients] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);

  // Selected master data IDs
  const [bankId, setBankId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [clientId, setClientId] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");

  // NEW: allow quick-typed client name (does NOT create master record)
  const [newClientName, setNewClientName] = useState("");

  // Derived objects
  const selectedBank = useMemo(
    () => banks.find((b) => String(b.id) === String(bankId)) || null,
    [banks, bankId]
  );
  const selectedBranch = useMemo(
    () => branches.find((br) => String(br.id) === String(branchId)) || null,
    [branches, branchId]
  );
  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === String(clientId)) || null,
    [clients, clientId]
  );
  const selectedPropertyType = useMemo(
    () => propertyTypes.find((p) => String(p.id) === String(propertyTypeId)) || null,
    [propertyTypes, propertyTypeId]
  );

  // Other assignment fields
  const [borrowerName, setBorrowerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landArea, setLandArea] = useState("");
  const [builtupArea, setBuiltupArea] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [fees, setFees] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [notes, setNotes] = useState("");

  // "provision" fields
  const [locationLink, setLocationLink] = useState("");
  const [files, setFiles] = useState([]);

  const [loadingMaster, setLoadingMaster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  // ---------- Master data fetch ----------
  useEffect(() => {
    const loadMaster = async () => {
      setLoadingMaster(true);
      setMasterError("");

      try {
        const [banksRes, clientsRes, propRes] = await Promise.all([
          fetch(`${API_BASE}/api/master/banks`),
          fetch(`${API_BASE}/api/master/clients`),
          fetch(`${API_BASE}/api/master/property-types`),
        ]);

        if (!banksRes.ok || !clientsRes.ok || !propRes.ok) {
          setMasterError("Failed to load master data. Check backend /api/master/* endpoints.");
          setLoadingMaster(false);
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
        setMasterError("Failed to load master data.");
      } finally {
        setLoadingMaster(false);
      }
    };

    loadMaster();
  }, []);

  // Load branches when bankId changes (dependent dropdown)
  useEffect(() => {
    const loadBranches = async () => {
      setBranches([]);
      setBranchId("");

      if (!bankId) return;

      try {
        const res = await fetch(
          `${API_BASE}/api/master/branches?bank_id=${encodeURIComponent(bankId)}`
        );
        if (!res.ok) {
          console.error("Failed to load branches", res.status);
          return;
        }
        const json = await res.json();
        setBranches(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("Branches load error:", e);
      }
    };

    loadBranches();
  }, [bankId]);

  // Reset party selections when caseType changes (prevents wrong payload)
  useEffect(() => {
    setError("");

    if (caseType === "BANK") {
      setClientId("");
      setNewClientName("");
    } else {
      // For non-bank cases, clear bank+branch
      setBankId("");
      setBranchId("");
      setBranches([]);
    }
  }, [caseType]);

  const handleFilesChange = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // --- Validate minimum required selections ---
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
        const typed = (newClientName || "").trim();
        if (!clientId && !typed) {
          setError("Please select an existing Client OR type a new Client name.");
          setSaving(false);
          return;
        }
      }

      // Build payload using IDs (preferred). Backend will auto-fill legacy names from IDs.
      const payload = {
        case_type: caseType,

        bank_id: caseType === "BANK" ? Number(bankId) : null,
        branch_id: caseType === "BANK" ? Number(branchId) : null,

        // For non-bank: prefer client_id, else fallback to valuer_client_name string
        client_id: caseType !== "BANK" && clientId ? Number(clientId) : null,
        valuer_client_name:
          caseType !== "BANK" && !clientId
            ? (newClientName || "").trim() || null
            : null,

        property_type_id: propertyTypeId ? Number(propertyTypeId) : null,

        borrower_name: borrowerName || null,
        phone: phone || null,
        address: address || null,
        land_area: landArea ? Number(landArea) : null,
        builtup_area: builtupArea ? Number(builtupArea) : null,
        status,
        fees: fees ? Number(fees) : 0,
        is_paid: isPaid,
        notes: notes || null,

        // locationLink/files remain UI-only until file API + model support exists
      };

      const res = await fetch(`${API_BASE}/api/assignments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Create failed", res.status);
        const text = await res.text();
        console.error("Response body:", text);
        setError("Failed to create assignment. Check console for details.");
        setSaving(false);
        return;
      }

      const created = await res.json();

      if (created && created.id) {
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
  const pageStyle = {
    maxWidth: "900px",
    margin: "0 auto",
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    padding: "1rem 1.25rem",
    marginTop: "0.75rem",
  };

  const headingStyle = {
    fontSize: "1.3rem",
    fontWeight: 600,
    marginBottom: "0.25rem",
  };

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

  const textareaStyle = {
    ...inputStyle,
    minHeight: "90px",
    resize: "vertical",
  };

  const selectStyle = {
    ...inputStyle,
    backgroundColor: "#fff",
  };

  const gridTwoCol = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.75rem 1.5rem",
  };

  const sectionTitleStyle = {
    fontSize: "1rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
  };

  const hintStyle = {
    fontSize: "0.75rem",
    color: "#6b7280",
    marginTop: "0.2rem",
  };

  const filesListStyle = {
    fontSize: "0.8rem",
    color: "#4b5563",
    marginTop: "0.4rem",
  };

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
        Create a new valuation assignment. Bank/Branch/Property Type are controlled. Client can be selected or typed quickly.
      </p>

      {masterError && (
        <div style={{ ...cardStyle, borderColor: "#fca5a5", backgroundColor: "#fff1f2" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Master Data not loaded</div>
          <div style={{ fontSize: "0.85rem", color: "#7f1d1d" }}>{masterError}</div>
          <div style={hintStyle}>
            Fix backend first, then refresh. Without master data this form cannot enforce tagging.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic info */}
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
                    {c === "EXTERNAL_VALUER"
                      ? "External Valuer"
                      : c === "DIRECT_CLIENT"
                      ? "Direct Client"
                      : c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={labelStyle}>Status</div>
              <select
                style={selectStyle}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
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
                    disabled={!bankId}
                  >
                    <option value="">
                      {bankId ? "-- Select Branch --" : "-- Select Bank first --"}
                    </option>
                    {branches.map((br) => (
                      <option key={br.id} value={br.id}>
                        {br.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={labelStyle}>
                    {caseType === "EXTERNAL_VALUER" ? "External Valuer (Select Existing)" : "Direct Client (Select Existing)"}
                  </div>
                  <select
                    style={selectStyle}
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      if (e.target.value) setNewClientName("");
                    }}
                  >
                    <option value="">-- Select --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <div style={hintStyle}>
                    If not in list, type a new name below (fast entry; no master record created yet).
                  </div>
                </div>

                <div>
                  <div style={labelStyle}>Or Type New Client Name</div>
                  <input
                    style={inputStyle}
                    value={newClientName}
                    onChange={(e) => {
                      setNewClientName(e.target.value);
                      if (e.target.value.trim()) setClientId("");
                    }}
                    placeholder="e.g. Ramesh Patil / XYZ Enterprises"
                  />
                  <div style={hintStyle}>
                    This will save to the assignment as text. Admin can later add it to Master Clients cleanly.
                  </div>
                </div>
              </>
            )}

            <div>
              <div style={labelStyle}>Borrower Name</div>
              <input
                style={inputStyle}
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
              />
            </div>

            <div>
              <div style={labelStyle}>Phone</div>
              <input
                style={inputStyle}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
              />
            </div>
          </div>
        </div>

        {/* Property */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Property</h2>

          <div style={gridTwoCol}>
            <div>
              <div style={labelStyle}>Address</div>
              <textarea
                style={textareaStyle}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Property address"
              />
            </div>

            <div>
              <div style={labelStyle}>Property Type</div>
              <select
                style={selectStyle}
                value={propertyTypeId}
                onChange={(e) => setPropertyTypeId(e.target.value)}
              >
                <option value="">-- Select Property Type --</option>
                {propertyTypes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div style={hintStyle}>Controlled to avoid duplicates.</div>
            </div>

            <div>
              <div style={labelStyle}>Land Area (sqft)</div>
              <input
                type="number"
                style={inputStyle}
                value={landArea}
                onChange={(e) => setLandArea(e.target.value)}
                placeholder="e.g. 1200"
              />
            </div>

            <div>
              <div style={labelStyle}>Built-up Area (sqft)</div>
              <input
                type="number"
                style={inputStyle}
                value={builtupArea}
                onChange={(e) => setBuiltupArea(e.target.value)}
                placeholder="e.g. 900"
              />
              <div style={hintStyle}>Multi-floor built-up area comes next (Step 3).</div>
            </div>
          </div>
        </div>

        {/* Money + notes */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Fees & Notes</h2>

          <div style={gridTwoCol}>
            <div>
              <div style={labelStyle}>Fees (₹)</div>
              <input
                type="number"
                style={inputStyle}
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="e.g. 1500"
              />
              <div style={hintStyle}>(Role-based hiding for employees comes next.)</div>
            </div>

            <div>
              <div style={labelStyle}>Paid?</div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.9rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                />
                Mark as paid
              </label>
            </div>
          </div>

          <div style={{ marginTop: "0.75rem" }}>
            <div style={labelStyle}>Internal Notes</div>
            <textarea
              style={textareaStyle}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra context about this assignment…"
            />
          </div>
        </div>

        {/* Location + Attachments (provisions) */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Location & Attachments</h2>

          <div style={gridTwoCol}>
            <div>
              <div style={labelStyle}>Location Link</div>
              <input
                style={inputStyle}
                value={locationLink}
                onChange={(e) => setLocationLink(e.target.value)}
                placeholder="Google Maps link or GPS note"
              />
              <div style={hintStyle}>Stored in UI for now. We’ll wire it to backend later.</div>
            </div>

            <div>
              <div style={labelStyle}>Attach Files (photos, docs)</div>
              <input type="file" multiple onChange={handleFilesChange} />
              <div style={hintStyle}>Upload endpoint comes later.</div>

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

        {/* Save button */}
        <div
          style={{
            ...cardStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            {error && <span style={{ color: "red", fontSize: "0.85rem" }}>{error}</span>}
          </div>
          <div>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "0.4rem 1rem",
                fontSize: "0.9rem",
                borderRadius: "999px",
                border: "none",
                backgroundColor: saving ? "#9ca3af" : "#16a34a",
                color: "#ffffff",
                cursor: saving ? "default" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Create Assignment"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default NewAssignmentPage;