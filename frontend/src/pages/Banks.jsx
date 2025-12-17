import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";

function BanksPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [bankSearch, setBankSearch] = useState("");

  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState("");

  // bank summary
  const [bankSummary, setBankSummary] = useState(null);
  const [bankSummaryLoading, setBankSummaryLoading] = useState(false);

  // branch summaries map: { [branchId]: {loading:boolean, data:any|null} }
  const [branchSummaryMap, setBranchSummaryMap] = useState({});
  const [branchSummaryLoading, setBranchSummaryLoading] = useState(false);

  // ✅ Add bank modal state
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [creatingBank, setCreatingBank] = useState(false);
  const [createBankError, setCreateBankError] = useState("");

  const authedFetch = async (url, opts = {}) => {
    if (!userEmail) throw new Error("Not authenticated");
    const headers = { ...(opts.headers || {}), "X-User-Email": userEmail };
    return fetch(url, { ...opts, headers });
  };

  const loadBanks = async () => {
    setBanksLoading(true);
    setBanksError("");

    try {
      const res = await authedFetch(`${API_BASE}/api/master/banks`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      setBanks(arr);

      if (!selectedId && arr.length > 0) setSelectedId(arr[0].id);
    } catch (e) {
      setBanksError(e?.message || "Failed to load banks");
    } finally {
      setBanksLoading(false);
    }
  };

  // Load banks
  useEffect(() => {
    if (userEmail) loadBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const selectedBank = useMemo(
    () => banks.find((b) => String(b.id) === String(selectedId)) || null,
    [banks, selectedId]
  );

  const filteredBanks = useMemo(() => {
    const q = (bankSearch || "").trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => String(b.name || "").toLowerCase().includes(q));
  }, [banks, bankSearch]);

  // Load branches for selected bank
  useEffect(() => {
    const loadBranches = async () => {
      setBranches([]);
      setBranchesError("");
      setBranchSummaryMap({});
      setBranchSummaryLoading(false);

      if (!selectedBank?.id) return;

      setBranchesLoading(true);
      try {
        const res = await authedFetch(
          `${API_BASE}/api/master/branches?bank_id=${encodeURIComponent(selectedBank.id)}`
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        setBranches(arr);

        // init per-branch summary state so tiles don't all show "…" together
        const init = {};
        for (const br of arr) init[br.id] = { loading: true, data: null };
        setBranchSummaryMap(init);
      } catch (e) {
        setBranchesError(e?.message || "Failed to load branches");
      } finally {
        setBranchesLoading(false);
      }
    };

    if (userEmail) loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, selectedBank?.id]);

  // Load bank summary (soft fail)
  useEffect(() => {
    const loadBankSummary = async () => {
      setBankSummary(null);
      if (!selectedBank?.id) return;

      setBankSummaryLoading(true);
      try {
        const res = await authedFetch(
          `${API_BASE}/api/assignments/summary?bank_id=${encodeURIComponent(selectedBank.id)}`
        );
        if (!res.ok) return; // soft fail
        const data = await res.json();
        setBankSummary(data || null);
      } catch {
        // soft fail
      } finally {
        setBankSummaryLoading(false);
      }
    };

    if (userEmail) loadBankSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, selectedBank?.id]);

  // Load branch summaries (soft fail, parallel)
  useEffect(() => {
    const loadBranchSummaries = async () => {
      if (!branches?.length) return;

      setBranchSummaryLoading(true);
      try {
        const entries = await Promise.all(
          branches.map(async (br) => {
            try {
              const res = await authedFetch(
                `${API_BASE}/api/assignments/summary?branch_id=${encodeURIComponent(br.id)}`
              );
              if (!res.ok) return [br.id, null];
              const data = await res.json();
              return [br.id, data || null];
            } catch {
              return [br.id, null];
            }
          })
        );

        setBranchSummaryMap((prev) => {
          const next = { ...(prev || {}) };
          for (const [id, data] of entries) next[id] = { loading: false, data };
          return next;
        });
      } finally {
        setBranchSummaryLoading(false);
      }
    };

    if (userEmail) loadBranchSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, branches?.length]);

  // ✅ Create bank
  const createBank = async () => {
    if (!isAdmin) return;
    const name = (newBankName || "").trim();
    if (!name) return;

    setCreatingBank(true);
    setCreateBankError("");
    try {
      const res = await authedFetch(`${API_BASE}/api/master/banks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const created = await res.json();

      // refresh banks and select the newly created one
      await loadBanks();
      setBankSearch("");
      if (created?.id) setSelectedId(created.id);

      setShowAddBank(false);
      setNewBankName("");
    } catch (e) {
      setCreateBankError(e?.message || "Failed to create bank");
    } finally {
      setCreatingBank(false);
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

  const disabledBtnStyle = {
    ...btnStyle,
    background: "#f3f4f6",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
    cursor: "not-allowed",
  };

  const dangerCard = {
    ...cardStyle,
    borderColor: "#fecaca",
    background: "#fff1f2",
  };

  const muted = { color: "#6b7280", fontSize: "0.92rem" };

  const grid2 = { display: "grid", gridTemplateColumns: "360px 1fr", gap: "1rem" };

  const inputStyle = {
    width: "100%",
    padding: "0.55rem 0.65rem",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    background: "#fff",
  };

  const bankButton = (active) => ({
    width: "100%",
    textAlign: "left",
    padding: "0.65rem 0.75rem",
    borderRadius: "12px",
    border: active ? "1px solid #111827" : "1px solid #e5e7eb",
    background: active ? "#0b1220" : "#fff",
    color: active ? "#fff" : "#111827",
    cursor: "pointer",
    fontWeight: 800,
  });

  const branchGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "0.75rem",
    marginTop: "0.85rem",
  };

  const branchTile = {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "0.85rem",
    background: "#fff",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "0.65rem",
    alignItems: "center",
  };

  const pillStyle = (bg, fg) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "0.25rem 0.6rem",
    borderRadius: "999px",
    fontSize: "0.78rem",
    background: bg,
    color: fg,
    border: "1px solid rgba(0,0,0,0.06)",
    fontWeight: 750,
    lineHeight: 1,
    whiteSpace: "nowrap",
  });

  const pillsRow = { display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" };

  const thinDivider = { height: 1, background: "#eef2f7", marginTop: "0.85rem" };

  // modal-ish block
  const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 50,
  };

  const modal = {
    width: "min(520px, 100%)",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    boxShadow: "0 15px 50px rgba(0,0,0,0.25)",
    padding: "1rem",
  };

  if (!userEmail) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Not logged in</h2>
          <div style={muted}>Please login again.</div>
          <button style={{ ...btnStyle, marginTop: "0.75rem" }} onClick={() => navigate("/login")}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const bankCounts = {
    pending: bankSummary?.pending ?? null,
    completed: bankSummary?.completed ?? null,
    unpaid: bankSummary?.completed_unpaid ?? null,
    total: bankSummary?.total ?? null,
  };

  return (
    <div style={pageStyle}>
      {/* Add Bank Modal */}
      {showAddBank && (
        <div style={overlay} onMouseDown={() => !creatingBank && setShowAddBank(false)}>
          <div style={modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>Add Bank</div>
                <div style={{ ...muted, marginTop: "0.15rem" }}>Minimal: just a name. Details can be edited inside Bank.</div>
              </div>
              <button style={secondaryBtnStyle} disabled={creatingBank} onClick={() => setShowAddBank(false)}>
                Close
              </button>
            </div>

            <div style={{ marginTop: "0.9rem" }}>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.35rem" }}>Bank Name *</div>
              <input
                style={inputStyle}
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="e.g., SBI"
                onKeyDown={(e) => {
                  if (e.key === "Enter") createBank();
                }}
                autoFocus
              />
              {createBankError ? (
                <div style={{ marginTop: "0.6rem", color: "#9f1239", fontSize: "0.9rem" }}>
                  ⚠️ {createBankError}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: "0.95rem", display: "flex", justifyContent: "flex-end", gap: "0.6rem", flexWrap: "wrap" }}>
              <button style={secondaryBtnStyle} disabled={creatingBank} onClick={() => setShowAddBank(false)}>
                Cancel
              </button>
              <button
                style={{
                  ...btnStyle,
                  background: creatingBank ? "#9ca3af" : "#111827",
                  cursor: creatingBank ? "not-allowed" : "pointer",
                }}
                disabled={creatingBank || !String(newBankName || "").trim()}
                onClick={createBank}
              >
                {creatingBank ? "Creating…" : "Create Bank"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={rowStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Banks & Branches</h1>
          <div style={{ ...muted, marginTop: "0.25rem" }}>
            Quick overview. Go inside a bank/branch for full details.
          </div>
        </div>

        <button style={secondaryBtnStyle} onClick={() => navigate("/settings")}>
          ← Back to Settings
        </button>
      </div>

      {banksLoading && (
        <div style={cardStyle}>
          <div style={muted}>Loading banks…</div>
        </div>
      )}

      {banksError && (
        <div style={dangerCard}>
          <div style={{ fontWeight: 800, color: "#9f1239" }}>Failed to load banks</div>
          <div style={{ color: "#9f1239", marginTop: "0.25rem" }}>{banksError}</div>
        </div>
      )}

      {!banksLoading && !banksError && (
        <div style={grid2}>
          {/* Left: banks list */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Banks</h2>
              <span style={{ ...muted, fontSize: "0.85rem" }}>Count: {banks.length}</span>
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <input
                style={inputStyle}
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="Search bank…"
              />
            </div>

            <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.6rem" }}>
              {filteredBanks.length === 0 ? (
                <div style={muted}>No matching banks.</div>
              ) : (
                filteredBanks.map((b) => (
                  <button
                    key={b.id}
                    style={bankButton(String(selectedId) === String(b.id))}
                    onClick={() => setSelectedId(b.id)}
                    title={b.name}
                  >
                    {b.name}
                  </button>
                ))
              )}
            </div>

            <div style={thinDivider} />

            <div style={{ marginTop: "0.85rem", display: "flex", justifyContent: "space-between", gap: "0.6rem" }}>
              {isAdmin ? (
                <button style={btnStyle} onClick={() => { setCreateBankError(""); setNewBankName(""); setShowAddBank(true); }}>
                  + Add Bank
                </button>
              ) : (
                <button style={disabledBtnStyle} disabled>
                  Admin only
                </button>
              )}

              <button
                style={secondaryBtnStyle}
                onClick={() => {
                  setBankSearch("");
                  if (banks?.length) setSelectedId(banks[0].id);
                }}
                title="Reset selection"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Right: selected bank + branch tiles */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>
                  {selectedBank ? selectedBank.name : "Select a bank"}
                </h2>

                {selectedBank && (
                  <div style={{ marginTop: "0.35rem", ...pillsRow }}>
                    {bankSummaryLoading ? (
                      <span style={pillStyle("#f3f4f6", "#111827")}>Loading…</span>
                    ) : bankSummary ? (
                      <>
                        <span style={pillStyle("#fff7ed", "#9a3412")}>Pending: {bankCounts.pending ?? 0}</span>
                        <span style={pillStyle("#fff1f2", "#9f1239")}>Unpaid: {bankCounts.unpaid ?? 0}</span>
                        <span style={pillStyle("#ecfdf5", "#065f46")}>Completed: {bankCounts.completed ?? 0}</span>
                        <span style={pillStyle("#f3f4f6", "#111827")}>Total: {bankCounts.total ?? 0}</span>
                      </>
                    ) : (
                      <span style={pillStyle("#f3f4f6", "#111827")}>Counts not connected</span>
                    )}
                  </div>
                )}

                <div style={{ ...muted, marginTop: "0.55rem" }}>
                  Branches (name + quick status). Open a branch for deep work.
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                <button
                  style={btnStyle}
                  disabled={!selectedBank}
                  onClick={() => navigate(`/settings/banks/${selectedBank.id}`)}
                >
                  Open Bank
                </button>
              </div>
            </div>

            {branchesLoading && <div style={{ ...muted, marginTop: "0.85rem" }}>Loading branches…</div>}

            {branchesError && (
              <div style={{ marginTop: "0.85rem", color: "#b45309", fontSize: "0.9rem" }}>
                ⚠️ {branchesError}
              </div>
            )}

            {!branchesLoading && !branchesError && (
              <>
                {branches.length === 0 ? (
                  <div style={{ ...muted, marginTop: "0.85rem" }}>No branches yet for this bank.</div>
                ) : (
                  <div style={branchGrid}>
                    {branches.map((br) => {
                      const node = branchSummaryMap?.[br.id] || { loading: branchSummaryLoading, data: null };
                      const s = node?.data || null;

                      const pending = s?.pending ?? 0;
                      const unpaid = s?.completed_unpaid ?? 0;

                      return (
                        <div key={br.id} style={branchTile}>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: "0.98rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {br.name}
                            </div>
                            <div style={{ marginTop: "0.4rem", ...pillsRow }}>
                              {node?.loading ? (
                                <span style={pillStyle("#f3f4f6", "#111827")}>Loading…</span>
                              ) : s ? (
                                <>
                                  <span style={pillStyle("#fff7ed", "#9a3412")}>P: {pending}</span>
                                  <span style={pillStyle("#fff1f2", "#9f1239")}>U: {unpaid}</span>
                                </>
                              ) : (
                                <span style={pillStyle("#f3f4f6", "#111827")}>—</span>
                              )}
                            </div>
                          </div>

                          <button
                            style={secondaryBtnStyle}
                            onClick={() => navigate(`/settings/branches/${br.id}`)}
                          >
                            Open
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ marginTop: "0.9rem", ...muted, fontSize: "0.88rem" }}>
                  Add/edit branches inside Bank Detail.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BanksPage;