// src/pages/NewAssignment.jsx
import React, { useState } from "react";
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

const CASE_TYPE_OPTIONS = [
  "BANK",
  "EXTERNAL_VALUER",
  "DIRECT_CLIENT",
];

function NewAssignmentPage() {
  const navigate = useNavigate();

  // core fields
  const [caseType, setCaseType] = useState("BANK");
  const [bankName, setBankName] = useState("");
  const [valuerClientName, setValuerClientName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [borrowerName, setBorrowerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [landArea, setLandArea] = useState("");
  const [builtupArea, setBuiltupArea] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [fees, setFees] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [notes, setNotes] = useState("");

  // "provision" fields
  const [locationLink, setLocationLink] = useState("");
  const [files, setFiles] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFilesChange = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // basic payload – keep it lean so backend won't complain
      const payload = {
        case_type: caseType,
        bank_name: bankName || null,
        valuer_client_name: valuerClientName || null,
        branch_name: branchName || null,
        borrower_name: borrowerName || null,
        phone: phone || null,
        address: address || null,
        property_type: propertyType || null,
        land_area: landArea ? Number(landArea) : null,
        builtup_area: builtupArea ? Number(builtupArea) : null,
        status,
        fees: fees ? Number(fees) : 0,
        is_paid: isPaid,
        notes: notes || null,
        // NOTE: locationLink and files are UI-only for now.
        // We'll wire them to a proper upload endpoint later.
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

      // Later: after we have a /api/files upload, we'll loop `files` here
      // and POST them with assignment_id = created.id.
      // For now, we just navigate.

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
        Create a new valuation assignment. Only the main details are required;
        attachments and location are optional for now.
      </p>

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
        </div>

        {/* Parties */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Parties</h2>

          <div style={gridTwoCol}>
            <div>
              <div style={labelStyle}>Bank Name (for BANK cases)</div>
              <input
                style={inputStyle}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. SBI, BOI…"
              />
            </div>

            <div>
              <div style={labelStyle}>External / Direct Client</div>
              <input
                style={inputStyle}
                value={valuerClientName}
                onChange={(e) => setValuerClientName(e.target.value)}
                placeholder="Name of external valuer or direct client"
              />
            </div>

            <div>
              <div style={labelStyle}>Branch</div>
              <input
                style={inputStyle}
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Mudhol, Jamkhandi…"
              />
            </div>

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
              <input
                style={inputStyle}
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                placeholder="Residential, Commercial, Plot…"
              />
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
              <div style={hintStyle}>
                This is just stored in the UI for now. We&apos;ll wire it to a backend
                field / map view later.
              </div>
            </div>

            <div>
              <div style={labelStyle}>Attach Files (photos, docs)</div>
              <input
                type="file"
                multiple
                onChange={handleFilesChange}
              />
              <div style={hintStyle}>
                You can already select files here. Uploading + saving them to the server
                will be hooked in once the file API is ready.
              </div>
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
        <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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