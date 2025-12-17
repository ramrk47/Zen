// src/pages/BankDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";
import AssignmentsModule from "../shared/AssignmentsModule";

const API_BASE = "http://127.0.0.1:8000";

function BankDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bank, setBank] = useState(null);
  const [branches, setBranches] = useState([]);

  // compact->edit toggle for bank account block
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    name: "",
    account_name: "",
    account_number: "",
    ifsc: "",
    account_bank_name: "",
    account_branch_name: "",
    upi_id: "",
    invoice_notes: "",
  });

  // add branch (admin)
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
  });
  const [savingBranch, setSavingBranch] = useState(false);

  const authedFetch = async (url, opts = {}) => {
    if (!userEmail) throw new Error("Not authenticated");
    const headers = { ...(opts.headers || {}), "X-User-Email": userEmail };
    return fetch(url, { ...opts, headers });
  };

  // ---------- Load bank + branches ----------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const bankRes = await authedFetch(`${API_BASE}/api/master/banks/${id}`);
        if (!bankRes.ok) {
          const text = await bankRes.text().catch(() => "");
          throw new Error(text || `HTTP ${bankRes.status}`);
        }
        const bankData = await bankRes.json();
        setBank(bankData);

        setBankForm({
          name: bankData?.name || "",
          account_name: bankData?.account_name || "",
          account_number: bankData?.account_number || "",
          ifsc: bankData?.ifsc || "",
          account_bank_name: bankData?.account_bank_name || "",
          account_branch_name: bankData?.account_branch_name || "",
          upi_id: bankData?.upi_id || "",
          invoice_notes: bankData?.invoice_notes || "",
        });

        const brRes = await authedFetch(
          `${API_BASE}/api/master/branches?bank_id=${encodeURIComponent(id)}`
        );
        if (!brRes.ok) {
          const text = await brRes.text().catch(() => "");
          throw new Error(text || `HTTP ${brRes.status}`);
        }
        const brData = await brRes.json();
        setBranches(Array.isArray(brData) ? brData : []);
      } catch (e) {
        setError(e?.message || "Failed to load bank");
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userEmail]);

  const bankTitle = useMemo(() => bank?.name || `Bank #${id}`, [bank, id]);

  // ---------- Save bank ----------
  const saveBank = async () => {
    if (!isAdmin) return;

    try {
      const payload = {
        name: bankForm.name?.trim() || null,
        account_name: bankForm.account_name?.trim() || null,
        account_number: bankForm.account_number?.trim() || null,
        ifsc: bankForm.ifsc?.trim() || null,
        account_bank_name: bankForm.account_bank_name?.trim() || null,
        account_branch_name: bankForm.account_branch_name?.trim() || null,
        upi_id: bankForm.upi_id?.trim() || null,
        invoice_notes: bankForm.invoice_notes?.trim() || null,
      };

      const res = await authedFetch(`${API_BASE}/api/master/banks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const updated = await res.json();
      setBank(updated);
      setIsEditingBank(false);
    } catch (e) {
      alert(e?.message || "Failed to save bank details");
    }
  };

  // ---------- Add branch ----------
  const addBranch = async () => {
    if (!isAdmin) return;
    if (!branchForm.name.trim()) return;

    setSavingBranch(true);
    try {
      const payload = {
        bank_id: Number(id),
        name: branchForm.name.trim(),
        contact_name: branchForm.contact_name?.trim() || null,
        phone: branchForm.phone?.trim() || null,
        email: branchForm.email?.trim() || null,
      };

      const res = await authedFetch(`${API_BASE}/api/master/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const created = await res.json();
      setBranches((prev) => {
        const next = [...prev, created];
        next.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        return next;
      });

      setBranchForm({ name: "", contact_name: "", phone: "", email: "" });
      setShowAddBranch(false);
    } catch (e) {
      alert(e?.message || "Failed to create branch");
    } finally {
      setSavingBranch(false);
    }
  };

  // ---------- Styles ----------
  const pageStyle = { maxWidth: "980px", display: "flex", flexDirection: "column", gap: "1rem" };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "1rem",
    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
  };

  const rowStyle = { display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" };

  const btnStyle = {
    padding: "0.5rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  };

  const secondaryBtnStyle = { ...btnStyle, background: "#fff", color: "#111827" };
  const disabledBtnStyle = { ...btnStyle, background: "#f3f4f6", color: "#9ca3af", border: "1px solid #e5e7eb", cursor: "not-allowed" };

  const labelStyle = { fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.35rem" };
  const inputStyle = { width: "100%", padding: "0.55rem 0.65rem", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "0.95rem", background: "#fff" };

  const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.9rem", marginTop: "0.75rem" };

  // compact black bank block
  const compactBlock = {
    background: "#0b1220",
    color: "#fff",
    borderRadius: "14px",
    padding: "0.9rem",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  const compactRow = { display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" };
  const compactMuted = { color: "rgba(255,255,255,0.72)", fontSize: "0.88rem" };

  const branchGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.85rem", marginTop: "0.85rem" };
  const branchTile = { border: "1px solid #e5e7eb", borderRadius: "14px", padding: "0.85rem", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" };

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
          <h1 style={{ margin: 0 }}>{bankTitle}</h1>
          <div style={{ color: "#6b7280", fontSize: "0.92rem", marginTop: "0.25rem" }}>
            Bank invoice defaults are kept minimal here. Branch work is the priority.
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <button style={secondaryBtnStyle} onClick={() => navigate("/settings/banks")}>
            ← Back to Banks
          </button>
        </div>
      </div>

      {loading && (
        <div style={cardStyle}>
          <div style={{ color: "#6b7280" }}>Loading bank…</div>
        </div>
      )}

      {error && (
        <div style={{ ...cardStyle, borderColor: "#fecaca", background: "#fff1f2" }}>
          <div style={{ fontWeight: 800, color: "#9f1239" }}>Failed to load</div>
          <div style={{ color: "#9f1239", marginTop: "0.25rem" }}>{error}</div>
        </div>
      )}

      {!loading && !error && bank && (
        <>
          {/* Bank compact block */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Bank Invoice Defaults</h2>
                <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  Keep this small. Edit only when needed.
                </div>
              </div>

              {isAdmin ? (
                !isEditingBank ? (
                  <button style={btnStyle} onClick={() => setIsEditingBank(true)}>
                    Edit
                  </button>
                ) : (
                  <>
                    <button style={secondaryBtnStyle} onClick={() => setIsEditingBank(false)}>
                      Cancel
                    </button>
                    <button style={btnStyle} onClick={saveBank}>
                      Save
                    </button>
                  </>
                )
              ) : (
                <button style={disabledBtnStyle} disabled>
                  Admin only
                </button>
              )}
            </div>

            {!isEditingBank ? (
              <div style={{ marginTop: "0.85rem" }}>
                <div style={compactBlock}>
                  <div style={compactRow}>
                    <div style={{ fontWeight: 900, fontSize: "1rem" }}>
                      {bank.name}
                    </div>
                    <div style={compactMuted}>Bank ID: {id}</div>
                  </div>

                  <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.35rem" }}>
                    <div style={compactMuted}>
                      <b style={{ color: "#fff" }}>Account Name:</b>{" "}
                      {bank.account_name || "—"}
                    </div>
                    <div style={compactMuted}>
                      <b style={{ color: "#fff" }}>Account No:</b>{" "}
                      {bank.account_number || "—"}
                    </div>
                    <div style={compactMuted}>
                      <b style={{ color: "#fff" }}>IFSC:</b> {bank.ifsc || "—"}
                    </div>
                    <div style={compactMuted}>
                      <b style={{ color: "#fff" }}>Bank / Branch:</b>{" "}
                      {(bank.account_bank_name || "—")} / {(bank.account_branch_name || "—")}
                    </div>
                    <div style={compactMuted}>
                      <b style={{ color: "#fff" }}>UPI:</b> {bank.upi_id || "—"}
                    </div>
                    {bank.invoice_notes ? (
                      <div style={{ ...compactMuted, marginTop: "0.35rem" }}>
                        <b style={{ color: "#fff" }}>Invoice Notes:</b> {bank.invoice_notes}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div style={grid2}>
                <div>
                  <div style={labelStyle}>Bank Name</div>
                  <input
                    style={inputStyle}
                    value={bankForm.name}
                    onChange={(e) => setBankForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div>
                  <div style={labelStyle}>Account Name</div>
                  <input
                    style={inputStyle}
                    value={bankForm.account_name}
                    onChange={(e) => setBankForm((p) => ({ ...p, account_name: e.target.value }))}
                  />
                </div>

                <div>
                  <div style={labelStyle}>Account Number</div>
                  <input
                    style={inputStyle}
                    value={bankForm.account_number}
                    onChange={(e) => setBankForm((p) => ({ ...p, account_number: e.target.value }))}
                  />
                </div>

                <div>
                  <div style={labelStyle}>IFSC</div>
                  <input
                    style={inputStyle}
                    value={bankForm.ifsc}
                    onChange={(e) => setBankForm((p) => ({ ...p, ifsc: e.target.value }))}
                  />
                </div>

                <div>
                  <div style={labelStyle}>Account Bank Name</div>
                  <input
                    style={inputStyle}
                    value={bankForm.account_bank_name}
                    onChange={(e) => setBankForm((p) => ({ ...p, account_bank_name: e.target.value }))}
                  />
                </div>

                <div>
                  <div style={labelStyle}>Account Branch Name</div>
                  <input
                    style={inputStyle}
                    value={bankForm.account_branch_name}
                    onChange={(e) => setBankForm((p) => ({ ...p, account_branch_name: e.target.value }))}
                  />
                </div>

                <div>
                  <div style={labelStyle}>UPI ID</div>
                  <input
                    style={inputStyle}
                    value={bankForm.upi_id}
                    onChange={(e) => setBankForm((p) => ({ ...p, upi_id: e.target.value }))}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={labelStyle}>Invoice Notes</div>
                  <textarea
                    style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
                    value={bankForm.invoice_notes}
                    onChange={(e) => setBankForm((p) => ({ ...p, invoice_notes: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Branch tiles */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Branches</h2>
                <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  Minimal here: just names + direct links. Full details inside branch.
                </div>
              </div>

              {isAdmin ? (
                <button style={btnStyle} onClick={() => setShowAddBranch((v) => !v)}>
                  + Add Branch
                </button>
              ) : (
                <button style={disabledBtnStyle} disabled>
                  Admin only
                </button>
              )}
            </div>

            {showAddBranch && isAdmin && (
              <div style={{ marginTop: "0.85rem", ...cardStyle, background: "#f9fafb" }}>
                <div style={{ fontWeight: 850 }}>New Branch (minimal)</div>
                <div style={grid2}>
                  <div>
                    <div style={labelStyle}>Branch Name *</div>
                    <input
                      style={inputStyle}
                      value={branchForm.name}
                      onChange={(e) => setBranchForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., SBI Mudhol"
                    />
                  </div>

                  <div>
                    <div style={labelStyle}>Contact Name</div>
                    <input
                      style={inputStyle}
                      value={branchForm.contact_name}
                      onChange={(e) => setBranchForm((p) => ({ ...p, contact_name: e.target.value }))}
                      placeholder="e.g., Branch Manager"
                    />
                  </div>

                  <div>
                    <div style={labelStyle}>Phone</div>
                    <input
                      style={inputStyle}
                      value={branchForm.phone}
                      onChange={(e) => setBranchForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <div style={labelStyle}>Email</div>
                    <input
                      style={inputStyle}
                      value={branchForm.email}
                      onChange={(e) => setBranchForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <button
                    style={secondaryBtnStyle}
                    onClick={() => setShowAddBranch(false)}
                    disabled={savingBranch}
                  >
                    Cancel
                  </button>
                  <button
                    style={{
                      ...btnStyle,
                      background: savingBranch ? "#9ca3af" : "#111827",
                      cursor: savingBranch ? "not-allowed" : "pointer",
                    }}
                    onClick={addBranch}
                    disabled={savingBranch || !branchForm.name.trim()}
                  >
                    {savingBranch ? "Creating…" : "Create Branch"}
                  </button>
                </div>
              </div>
            )}

            {branches.length === 0 ? (
              <div style={{ marginTop: "0.85rem", color: "#6b7280" }}>No branches yet.</div>
            ) : (
              <div style={branchGrid}>
                {branches.map((br) => (
                  <div key={br.id} style={branchTile}>
                    <div style={{ fontWeight: 800 }}>{br.name}</div>
                    <button
                      style={secondaryBtnStyle}
                      onClick={() => navigate(`/settings/branches/${br.id}`)}
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments (This Bank) */}
          <div style={cardStyle}>
            <AssignmentsModule
              scopeLabel="This Bank"
              bankId={Number(id)}
              authedFetch={authedFetch}
              onOpenAssignment={(assignmentId) => navigate(`/assignments/${assignmentId}`)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default BankDetailPage;