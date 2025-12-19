import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";
import AssignmentsModule from "../shared/AssignmentsModule";

const API_BASE = "http://127.0.0.1:8000";

function BranchDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [branch, setBranch] = useState(null);

  // edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    is_active: true,

    contact_name: "",
    contact_role: "",
    phone: "",
    whatsapp: "",
    email: "",

    address: "",
    city: "",
    district: "",
    notes: "",

    expected_frequency_days: "",
    expected_weekly_revenue: "",
  });

  const authedFetch = async (url, opts = {}) => {
    if (!userEmail) throw new Error("Missing user identity");
    const headers = { ...(opts.headers || {}), "X-User-Email": userEmail };
    return fetch(url, { ...opts, headers });
  };

  // ---------- Load branch ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      if (!userEmail) {
        setError("Not authenticated. Please login again.");
        setLoading(false);
        return;
      }

      try {
        const res = await authedFetch(`${API_BASE}/api/master/branches/${id}`);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setBranch(data);

        setForm({
          name: data?.name || "",
          is_active: data?.is_active ?? true,

          contact_name: data?.contact_name || "",
          contact_role: data?.contact_role || "",
          phone: data?.phone || "",
          whatsapp: data?.whatsapp || "",
          email: data?.email || "",

          address: data?.address || "",
          city: data?.city || "",
          district: data?.district || "",
          notes: data?.notes || "",

          expected_frequency_days:
            data?.expected_frequency_days === null || data?.expected_frequency_days === undefined
              ? ""
              : String(data.expected_frequency_days),
          expected_weekly_revenue:
            data?.expected_weekly_revenue === null || data?.expected_weekly_revenue === undefined
              ? ""
              : String(data.expected_weekly_revenue),
        });
      } catch (e) {
        setError(e?.message || "Failed to load branch");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userEmail]);

  const branchTitle = useMemo(() => branch?.name || `Branch #${id}`, [branch, id]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!isAdmin) return;

    try {
      const payload = {
        name: form.name?.trim() || null,
        is_active: !!form.is_active,

        contact_name: form.contact_name?.trim() || null,
        contact_role: form.contact_role?.trim() || null,
        phone: form.phone?.trim() || null,
        whatsapp: form.whatsapp?.trim() || null,
        email: form.email?.trim() || null,

        address: form.address?.trim() || null,
        city: form.city?.trim() || null,
        district: form.district?.trim() || null,
        notes: form.notes?.trim() || null,

        expected_frequency_days:
          form.expected_frequency_days === "" ? null : Number(form.expected_frequency_days),
        expected_weekly_revenue:
          form.expected_weekly_revenue === "" ? null : Number(form.expected_weekly_revenue),
      };

      const res = await authedFetch(`${API_BASE}/api/master/branches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const updated = await res.json();
      setBranch(updated);
      setIsEditing(false);
    } catch (e) {
      alert(e?.message || "Failed to save branch");
    }
  };

  // ---------- Styles (same “clean card” UX) ----------
  const pageStyle = { maxWidth: "980px", display: "flex", flexDirection: "column", gap: "1rem" };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "1rem",
    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
  };

  const rowStyle = { display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" };

  const pillStyle = (bg, fg) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "0.25rem 0.6rem",
    borderRadius: "999px",
    fontSize: "0.78rem",
    background: bg,
    color: fg,
    border: "1px solid rgba(0,0,0,0.06)",
    fontWeight: 650,
    whiteSpace: "nowrap",
  });

  const btnStyle = {
    padding: "0.5rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  };

  const secondaryBtnStyle = { ...btnStyle, background: "#fff", color: "#111827" };

  const inputStyle = {
    width: "100%",
    padding: "0.55rem 0.65rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    background: "#fff",
  };

  const labelStyle = { fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.35rem" };

  const grid2 = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "0.9rem",
    marginTop: "0.75rem",
  };

  if (!userEmail) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Not logged in</h2>
          <div style={{ color: "#6b7280" }}>Please login again.</div>
          <button style={{ ...btnStyle, marginTop: "0.75rem" }} onClick={() => navigate("/login")}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={rowStyle}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>{branchTitle}</h1>
            <span style={branch?.is_active ? pillStyle("#ecfdf5", "#065f46") : pillStyle("#fff1f2", "#9f1239")}>
              {branch?.is_active ? "ACTIVE" : "INACTIVE"}
            </span>
            <span style={pillStyle("#f3f4f6", "#111827")}>Branch ID: {id}</span>
            {branch?.bank_id ? <span style={pillStyle("#f3f4f6", "#111827")}>Bank ID: {branch.bank_id}</span> : null}
          </div>
          <div style={{ color: "#6b7280", fontSize: "0.92rem", marginTop: "0.25rem" }}>
            Keep this page minimal. Ops details here; summary stays on Banks page.
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <button style={secondaryBtnStyle} onClick={() => navigate("/settings/banks")}>
            ← Back to Banks
          </button>

          {isAdmin &&
            (!isEditing ? (
              <button style={btnStyle} onClick={() => setIsEditing(true)}>
                Edit Branch
              </button>
            ) : (
              <>
                <button style={secondaryBtnStyle} onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button style={btnStyle} onClick={handleSave}>
                  Save
                </button>
              </>
            ))}
        </div>
      </div>

      {loading && (
        <div style={cardStyle}>
          <div style={{ color: "#6b7280" }}>Loading branch…</div>
        </div>
      )}

      {error && (
        <div style={{ ...cardStyle, borderColor: "#fecaca", background: "#fff1f2" }}>
          <div style={{ fontWeight: 700, color: "#9f1239" }}>Failed to load</div>
          <div style={{ color: "#9f1239", marginTop: "0.25rem" }}>{error}</div>
        </div>
      )}

      {!loading && !error && branch && (
        <>
          {/* Snapshot card */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>Branch Snapshot</h2>
                <div style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                  Contact + ops fields you actually use.
                </div>
              </div>
              {!isAdmin && <span style={pillStyle("#f3f4f6", "#111827")}>Read-only (Employee)</span>}
            </div>

            <div style={grid2}>
              <div>
                <div style={labelStyle}>Branch Name</div>
                {isEditing ? (
                  <input style={inputStyle} value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
                ) : (
                  <div style={{ fontSize: "1rem", fontWeight: 650 }}>{branch.name}</div>
                )}
              </div>

              <div>
                <div style={labelStyle}>Active</div>
                {isEditing ? (
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="checkbox" checked={!!form.is_active} onChange={(e) => handleChange("is_active", e.target.checked)} />
                    <span style={{ color: "#111827", fontWeight: 650 }}>{form.is_active ? "Active" : "Inactive"}</span>
                  </label>
                ) : (
                  <div style={{ color: "#111827", fontWeight: 650 }}>{branch.is_active ? "Active" : "Inactive"}</div>
                )}
              </div>

              <div>
                <div style={labelStyle}>Contact Name</div>
                {isEditing ? (
                  <input style={inputStyle} value={form.contact_name} onChange={(e) => handleChange("contact_name", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.contact_name || "—"}</div>
                )}
              </div>

              <div>
                <div style={labelStyle}>Contact Role</div>
                {isEditing ? (
                  <input style={inputStyle} value={form.contact_role} onChange={(e) => handleChange("contact_role", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.contact_role || "—"}</div>
                )}
              </div>

              <div>
                <div style={labelStyle}>Phone</div>
                {isEditing ? (
                  <input style={inputStyle} value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.phone || "—"}</div>
                )}
              </div>

              <div>
                <div style={labelStyle}>WhatsApp</div>
                {isEditing ? (
                  <input style={inputStyle} value={form.whatsapp} onChange={(e) => handleChange("whatsapp", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.whatsapp || "—"}</div>
                )}
              </div>

              <div>
                <div style={labelStyle}>Email</div>
                {isEditing ? (
                  <input style={inputStyle} value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.email || "—"}</div>
                )}
              </div>

              <div>
                <div style={labelStyle}>Expected Frequency (days)</div>
                {isEditing ? (
                  <input type="number" style={inputStyle} value={form.expected_frequency_days} onChange={(e) => handleChange("expected_frequency_days", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.expected_frequency_days ?? "—"}</div>
                )}
              </div>

              <div>
                <div style={labelStyle}>Expected Weekly Revenue</div>
                {isEditing ? (
                  <input type="number" style={inputStyle} value={form.expected_weekly_revenue} onChange={(e) => handleChange("expected_weekly_revenue", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.expected_weekly_revenue ?? "—"}</div>
                )}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={labelStyle}>Address</div>
                {isEditing ? (
                  <input style={inputStyle} value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.address || "—"}</div>
                )}
              </div>

              <div>
                <div style={labelStyle}>City</div>
                {isEditing ? (
                  <input style={inputStyle} value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.city || "—"}</div>
                )}
              </div>

              <div>
                <div style={labelStyle}>District</div>
                {isEditing ? (
                  <input style={inputStyle} value={form.district} onChange={(e) => handleChange("district", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.district || "—"}</div>
                )}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={labelStyle}>Notes</div>
                {isEditing ? (
                  <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} />
                ) : (
                  <div style={{ color: "#111827" }}>{branch.notes || "—"}</div>
                )}
              </div>
            </div>
          </div>

          {/* Assignments (This Branch) — shared module, compact mode */}
          <div style={cardStyle}>
            <AssignmentsModule
              scopeLabel="This Branch"
              branchId={Number(id)}
              authedFetch={authedFetch}
              onOpenAssignment={(assignmentId) => navigate(`/assignments/${assignmentId}`)}
              compact
            />
          </div>
        </>
      )}
    </div>
  );
}

export default BranchDetailPage;