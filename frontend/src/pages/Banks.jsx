// src/pages/Banks.jsx
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

  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState("");

  // ✅ NEW: bank + branch summary
  const [bankSummary, setBankSummary] = useState(null);
  const [bankSummaryLoading, setBankSummaryLoading] = useState(false);

  const [branchSummaryMap, setBranchSummaryMap] = useState({});
  const [branchSummaryLoading, setBranchSummaryLoading] = useState(false);

  const authedFetch = async (url, opts = {}) => {
    if (!userEmail) throw new Error("Not authenticated");
    const headers = { ...(opts.headers || {}), "X-User-Email": userEmail };
    return fetch(url, { ...opts, headers });
  };

  // Load banks
  useEffect(() => {
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

    if (userEmail) loadBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const selectedBank = useMemo(
    () => banks.find((b) => String(b.id) === String(selectedId)) || null,
    [banks, selectedId]
  );

  // Load branches for selected bank
  useEffect(() => {
    const loadBranches = async () => {
      setBranches([]);
      setBranchesError("");
      setBranchSummaryMap({});

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
      } catch (e) {
        setBranchesError(e?.message || "Failed to load branches");
      } finally {
        setBranchesLoading(false);
      }
    };

    if (userEmail) loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, selectedBank?.id]);

  // ✅ NEW: load bank summary (soft fail)
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

  // ✅ NEW: load branch summaries (soft fail, parallel)
  useEffect(() => {
    const loadBranchSummaries = async () => {
      setBranchSummaryMap({});
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

        const next = {};
        for (const [id, data] of entries) next[id] = data;
        setBranchSummaryMap(next);
      } finally {
        setBranchSummaryLoading(false);
      }
    };

    if (userEmail) loadBranchSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, branches?.length]);

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

  const muted = { color: "#6b7280", fontSize: "0.92rem" };

  const grid2 = { display: "grid", gridTemplateColumns: "360px 1fr", gap: "1rem" };

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
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.75rem",
    marginTop: "0.85rem",
  };

  const branchTile = {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "0.85rem",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: "0.55rem",
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
  });

  const pillsRow = { display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" };

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

  return (
    <div style={pageStyle}>
      <div style={rowStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Banks & Branches</h1>
          <div style={{ ...muted, marginTop: "0.25rem" }}>
            Minimal overview here. Deep details inside Bank → Branch pages.
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
        <div style={{ ...cardStyle, borderColor: "#fecaca", background: "#fff1f2" }}>
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

            <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.6rem" }}>
              {banks.length === 0 ? (
                <div style={muted}>No banks yet.</div>
              ) : (
                banks.map((b) => (
                  <button
                    key={b.id}
                    style={bankButton(String(selectedId) === String(b.id))}
                    onClick={() => setSelectedId(b.id)}
                  >
                    {b.name}
                  </button>
                ))
              )}
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              {isAdmin ? (
                <button style={btnStyle} disabled>
                  + Add Bank (next)
                </button>
              ) : (
                <button style={disabledBtnStyle} disabled>
                  Admin only
                </button>
              )}
            </div>
          </div>

          {/* Right: selected bank + branch tiles */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>
                  {selectedBank ? selectedBank.name : "Select a bank"}
                </h2>

                {/* ✅ NEW: summary pills under bank name (small + clean) */}
                {selectedBank && (
                  <div style={{ marginTop: "0.35rem", ...pillsRow }}>
                    {bankSummaryLoading ? (
                      <span style={pillStyle("#f3f4f6", "#111827")}>Loading counts…</span>
                    ) : bankSummary ? (
                      <>
                        <span style={pillStyle("#fff7ed", "#9a3412")}>
                          Pending: {bankSummary.pending ?? 0}
                        </span>
                        <span style={pillStyle("#fff1f2", "#9f1239")}>
                          Completed-Unpaid: {bankSummary.completed_unpaid ?? 0}
                        </span>
                      </>
                    ) : (
                      <span style={pillStyle("#f3f4f6", "#111827")}>
                        Counts not connected yet
                      </span>
                    )}
                  </div>
                )}

                <div style={{ ...muted, marginTop: "0.55rem" }}>
                  Branch tiles here are intentionally minimal (name + open).
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

            {/* Branch tiles */}
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
                      const s = branchSummaryMap?.[br.id] || null;

                      return (
                        <div key={br.id} style={branchTile}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "center" }}>
                            <div style={{ fontWeight: 900 }}>{br.name}</div>
                            <button
                              style={secondaryBtnStyle}
                              onClick={() => navigate(`/settings/branches/${br.id}`)}
                            >
                              Open
                            </button>
                          </div>

                          {/* ✅ NEW: tiny pills inside branch tile */}
                          <div style={pillsRow}>
                            {branchSummaryLoading ? (
                              <span style={pillStyle("#f3f4f6", "#111827")}>…</span>
                            ) : s ? (
                              <>
                                <span style={pillStyle("#fff7ed", "#9a3412")}>
                                  P: {s.pending ?? 0}
                                </span>
                                <span style={pillStyle("#fff1f2", "#9f1239")}>
                                  U: {s.completed_unpaid ?? 0}
                                </span>
                              </>
                            ) : (
                              <span style={pillStyle("#f3f4f6", "#111827")}>—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ marginTop: "0.9rem", ...muted, fontSize: "0.88rem" }}>
                  Want to add/edit branches? Do it inside Bank Detail.
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