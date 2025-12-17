import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";

function MasterDataPage() {
  const user = getCurrentUser();
  const userEmail = (user?.email || "").trim();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [tab, setTab] = useState("BANKS"); // BANKS | CLIENTS | PROPERTY
  const [banks, setBanks] = useState([]);
  const [clients, setClients] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);

  const [selectedBankId, setSelectedBankId] = useState("");
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const authedFetch = async (url, opts = {}) => {
    if (!userEmail) throw new Error("Missing user identity");
    return fetch(url, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        "X-User-Email": userEmail,
      },
    });
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [b, c, p] = await Promise.all([
        authedFetch(`${API_BASE}/api/master/banks`),
        authedFetch(`${API_BASE}/api/master/clients`),
        authedFetch(`${API_BASE}/api/master/property-types`),
      ]);

      if (!b.ok || !c.ok || !p.ok) throw new Error("Master GET failed");

      setBanks(await b.json());
      setClients(await c.json());
      setPropertyTypes(await p.json());
    } catch (e) {
      console.error(e);
      setError("Failed to load master data.");
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async (bankId) => {
    setBranches([]);
    if (!bankId) return;
    try {
      const res = await authedFetch(`${API_BASE}/api/master/branches?bank_id=${encodeURIComponent(bankId)}`);
      if (!res.ok) return;
      setBranches(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  useEffect(() => {
    loadBranches(selectedBankId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBankId]);

  const pageStyle = { maxWidth: "900px" };
  const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1rem" };
  const btn = { padding: "0.35rem 0.8rem", borderRadius: "999px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" };
  const tabBtn = (active) => ({
    ...btn,
    background: active ? "#111827" : "#fff",
    color: active ? "#fff" : "#111827",
    border: active ? "1px solid #111827" : "1px solid #d1d5db",
  });

  if (!isAdmin) {
    return (
      <div style={pageStyle}>
        <h1>Master Data</h1>
        <div style={{ ...card, color: "#6b7280" }}>Admin only.</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: "0.25rem" }}>Master Data</h1>
      <div style={{ color: "#6b7280", marginBottom: "0.75rem" }}>
        Maintain clean lists for New Assignment dropdowns.
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <button style={tabBtn(tab === "BANKS")} onClick={() => setTab("BANKS")}>Banks & Branches</button>
        <button style={tabBtn(tab === "CLIENTS")} onClick={() => setTab("CLIENTS")}>Clients</button>
        <button style={tabBtn(tab === "PROPERTY")} onClick={() => setTab("PROPERTY")}>Property Types</button>
        <button style={btn} onClick={loadAll} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>

      {error ? <div style={{ ...card, borderColor: "#fca5a5", color: "#7f1d1d" }}>{error}</div> : null}

      {tab === "BANKS" && (
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Banks</h2>
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            style={{ padding: "0.4rem", width: "100%", borderRadius: "8px", border: "1px solid #d1d5db" }}
          >
            <option value="">-- Select Bank to view branches --</option>
            {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <div style={{ marginTop: "0.75rem" }}>
            <h3 style={{ marginBottom: "0.25rem" }}>Branches</h3>
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              {selectedBankId ? `Showing branches for bank_id=${selectedBankId}` : "Select a bank above."}
            </div>

            {branches.length === 0 ? (
              <div style={{ marginTop: "0.5rem", color: "#6b7280" }}>No branches to show.</div>
            ) : (
              <ul style={{ marginTop: "0.5rem" }}>
                {branches.map((br) => <li key={br.id}>{br.name}</li>)}
              </ul>
            )}

            <div style={{ marginTop: "0.75rem", color: "#6b7280", fontSize: "0.85rem" }}>
              Next: Add “Create bank/branch” buttons (needs POST endpoints).
            </div>
          </div>
        </div>
      )}

      {tab === "CLIENTS" && (
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Clients</h2>
          {clients.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No clients found.</div>
          ) : (
            <ul>
              {clients.map((c) => <li key={c.id}>{c.name}</li>)}
            </ul>
          )}
          <div style={{ marginTop: "0.75rem", color: "#6b7280", fontSize: "0.85rem" }}>
            Next: Add “Create client” (needs POST endpoint).
          </div>
        </div>
      )}

      {tab === "PROPERTY" && (
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Property Types</h2>
          {propertyTypes.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No property types found.</div>
          ) : (
            <ul>
              {propertyTypes.map((p) => <li key={p.id}>{p.name}</li>)}
            </ul>
          )}
          <div style={{ marginTop: "0.75rem", color: "#6b7280", fontSize: "0.85rem" }}>
            Next: Add “Create property type” (needs POST endpoint).
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterDataPage;