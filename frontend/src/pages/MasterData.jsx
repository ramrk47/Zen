import React, { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";

/** ---------- helpers ---------- */
const norm = (s) =>
  String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const toTitle = (s) =>
  String(s || "")
    .trim()
    .replace(/\s+/g, " ");

function topSimilar(input, items, getName, limit = 5) {
  const q = norm(input);
  if (!q) return [];
  const scored = items
    .map((it) => {
      const name = getName(it);
      const n = norm(name);
      let score = 0;

      if (n === q) score += 1000; // exact
      if (n.startsWith(q)) score += 80;
      if (n.includes(q)) score += 40;

      // token overlap
      const qTokens = new Set(q.split(" "));
      const nTokens = new Set(n.split(" "));
      let overlap = 0;
      qTokens.forEach((t) => {
        if (nTokens.has(t)) overlap += 1;
      });
      score += overlap * 8;

      // shorter distance bias (simple)
      score += Math.max(0, 20 - Math.abs(n.length - q.length));

      return { it, name, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

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
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // search
  const [qBanks, setQBanks] = useState("");
  const [qBranches, setQBranches] = useState("");
  const [qClients, setQClients] = useState("");
  const [qProps, setQProps] = useState("");

  // create forms
  const [newBank, setNewBank] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newProp, setNewProp] = useState("");

  // bulk add
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

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

  const flashOk = (msg) => {
    setOkMsg(msg);
    setTimeout(() => setOkMsg(""), 2500);
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

      const bJson = await b.json();
      const cJson = await c.json();
      const pJson = await p.json();

      setBanks(Array.isArray(bJson) ? bJson : []);
      setClients(Array.isArray(cJson) ? cJson : []);
      setPropertyTypes(Array.isArray(pJson) ? pJson : []);
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
      const data = await res.json();
      setBranches(Array.isArray(data) ? data : []);
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

  /** ---------- derived: duplicates + filtered lists ---------- */
  const bankNamesNorm = useMemo(() => new Set(banks.map((b) => norm(b.name))), [banks]);
  const clientNamesNorm = useMemo(() => new Set(clients.map((c) => norm(c.name))), [clients]);
  const propNamesNorm = useMemo(() => new Set(propertyTypes.map((p) => norm(p.name))), [propertyTypes]);
  const branchNamesNorm = useMemo(() => new Set(branches.map((br) => norm(br.name))), [branches]);

  const bankAlready = !!newBank.trim() && bankNamesNorm.has(norm(newBank));
  const clientAlready = !!newClient.trim() && clientNamesNorm.has(norm(newClient));
  const propAlready = !!newProp.trim() && propNamesNorm.has(norm(newProp));
  const branchAlready = !!newBranch.trim() && branchNamesNorm.has(norm(newBranch));

  const banksFiltered = useMemo(() => {
    const q = norm(qBanks);
    if (!q) return banks;
    return banks.filter((b) => norm(b.name).includes(q));
  }, [banks, qBanks]);

  const branchesFiltered = useMemo(() => {
    const q = norm(qBranches);
    if (!q) return branches;
    return branches.filter((br) => norm(br.name).includes(q));
  }, [branches, qBranches]);

  const clientsFiltered = useMemo(() => {
    const q = norm(qClients);
    if (!q) return clients;
    return clients.filter((c) => norm(c.name).includes(q));
  }, [clients, qClients]);

  const propsFiltered = useMemo(() => {
    const q = norm(qProps);
    if (!q) return propertyTypes;
    return propertyTypes.filter((p) => norm(p.name).includes(q));
  }, [propertyTypes, qProps]);

  const similarBanks = useMemo(() => topSimilar(newBank, banks, (x) => x.name), [newBank, banks]);
  const similarBranches = useMemo(() => topSimilar(newBranch, branches, (x) => x.name), [newBranch, branches]);
  const similarClients = useMemo(() => topSimilar(newClient, clients, (x) => x.name), [newClient, clients]);
  const similarProps = useMemo(() => topSimilar(newProp, propertyTypes, (x) => x.name), [newProp, propertyTypes]);

  /** ---------- create ops ---------- */
  const postJson = async (path, body) => {
    const res = await authedFetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || `HTTP ${res.status}`);
    }
    return res.json().catch(() => ({}));
  };

  const createBank = async () => {
    const name = toTitle(newBank);
    if (!name) return;
    if (bankAlready) return;

    setWorking(true);
    setError("");
    try {
      await postJson("/api/master/banks", { name });
      setNewBank("");
      await loadAll();
      flashOk("Bank created");
    } catch (e) {
      console.error(e);
      setError(`Create bank failed: ${String(e?.message || e)}`);
    } finally {
      setWorking(false);
    }
  };

  const createBranch = async () => {
    const name = toTitle(newBranch);
    if (!selectedBankId) {
      setError("Select a bank first to create a branch.");
      return;
    }
    if (!name) return;
    if (branchAlready) return;

    setWorking(true);
    setError("");
    try {
      await postJson("/api/master/branches", { bank_id: Number(selectedBankId), name });
      setNewBranch("");
      await loadBranches(selectedBankId);
      flashOk("Branch created");
    } catch (e) {
      console.error(e);
      setError(`Create branch failed: ${String(e?.message || e)}`);
    } finally {
      setWorking(false);
    }
  };

  const createClient = async () => {
    const name = toTitle(newClient);
    if (!name) return;
    if (clientAlready) return;

    setWorking(true);
    setError("");
    try {
      await postJson("/api/master/clients", { name });
      setNewClient("");
      await loadAll();
      flashOk("Client created");
    } catch (e) {
      console.error(e);
      setError(`Create client failed: ${String(e?.message || e)}`);
    } finally {
      setWorking(false);
    }
  };

  const createPropertyType = async () => {
    const name = toTitle(newProp);
    if (!name) return;
    if (propAlready) return;

    setWorking(true);
    setError("");
    try {
      await postJson("/api/master/property-types", { name });
      setNewProp("");
      await loadAll();
      flashOk("Property type created");
    } catch (e) {
      console.error(e);
      setError(`Create property type failed: ${String(e?.message || e)}`);
    } finally {
      setWorking(false);
    }
  };

  const bulkAdd = async () => {
    const lines = bulkText
      .split("\n")
      .map((x) => toTitle(x))
      .map((x) => x.trim())
      .filter(Boolean);

    if (!lines.length) return;

    setWorking(true);
    setError("");
    let created = 0;
    let skipped = 0;

    try {
      if (tab === "CLIENTS") {
        for (const name of lines) {
          if (clientNamesNorm.has(norm(name))) {
            skipped++;
            continue;
          }
          await postJson("/api/master/clients", { name });
          created++;
        }
      } else if (tab === "PROPERTY") {
        for (const name of lines) {
          if (propNamesNorm.has(norm(name))) {
            skipped++;
            continue;
          }
          await postJson("/api/master/property-types", { name });
          created++;
        }
      } else if (tab === "BANKS") {
        // bulk banks only (branches needs bank)
        for (const name of lines) {
          if (bankNamesNorm.has(norm(name))) {
            skipped++;
            continue;
          }
          await postJson("/api/master/banks", { name });
          created++;
        }
      }

      await loadAll();
      if (tab === "BANKS" && selectedBankId) await loadBranches(selectedBankId);

      flashOk(`Bulk added: ${created} created, ${skipped} skipped`);
      setBulkText("");
      setBulkMode(false);
    } catch (e) {
      console.error(e);
      setError(`Bulk add failed: ${String(e?.message || e)}`);
    } finally {
      setWorking(false);
    }
  };

  /** ---------- UI ---------- */
  const pageStyle = { maxWidth: "980px" };
  const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1rem" };
  const btn = { padding: "0.4rem 0.9rem", borderRadius: "999px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" };
  const btnDark = { ...btn, background: "#111827", border: "1px solid #111827", color: "#fff" };
  const btnGreen = { ...btn, background: "#16a34a", border: "1px solid #16a34a", color: "#fff", fontWeight: 800 };
  const btnDisabled = { ...btnGreen, opacity: 0.5, cursor: "not-allowed" };
  const tabBtn = (active) => ({
    ...btn,
    background: active ? "#111827" : "#fff",
    color: active ? "#fff" : "#111827",
    border: active ? "1px solid #111827" : "1px solid #d1d5db",
  });
  const input = { width: "100%", padding: "0.55rem 0.6rem", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "0.95rem" };
  const label = { fontSize: "0.72rem", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.06em", marginBottom: "0.25rem" };
  const subtle = { color: "#6b7280" };

  const Table = ({ rows, columns }) => (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: "left", padding: "0.6rem", fontSize: "0.8rem", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: "0.8rem", color: "#6b7280" }}>
                No data.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={String(r._key)} style={{ borderBottom: "1px solid #f3f4f6" }}>
                {columns.map((c) => (
                  <td key={c.key} style={{ padding: "0.65rem", fontSize: "0.95rem", color: "#111827" }}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const SimilarList = ({ items, onPick }) => {
    if (!items.length) return null;
    return (
      <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {items.map((x) => (
          <button
            key={String(x.it.id ?? x.name)}
            type="button"
            onClick={() => onPick(x.name)}
            style={{ ...btn, padding: "0.25rem 0.6rem", fontSize: "0.85rem" }}
            title="Click to use this exact name"
          >
            {x.name}
          </button>
        ))}
      </div>
    );
  };

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
      <div style={{ ...subtle, marginBottom: "0.75rem" }}>
        Clean master lists so dropdowns stay consistent. Duplicate prevention is case-insensitive.
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <button style={tabBtn(tab === "BANKS")} onClick={() => setTab("BANKS")}>Banks & Branches</button>
        <button style={tabBtn(tab === "CLIENTS")} onClick={() => setTab("CLIENTS")}>Clients</button>
        <button style={tabBtn(tab === "PROPERTY")} onClick={() => setTab("PROPERTY")}>Property Types</button>

        <button style={btn} onClick={loadAll} disabled={loading || working}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>

        <button style={btnDark} onClick={() => setBulkMode((v) => !v)} disabled={working}>
          {bulkMode ? "Close bulk add" : "Bulk add"}
        </button>
      </div>

      {okMsg ? <div style={{ ...card, borderColor: "#bbf7d0", background: "#f0fdf4", color: "#166534", fontWeight: 800 }}>{okMsg}</div> : null}
      {error ? <div style={{ ...card, borderColor: "#fca5a5", background: "#fef2f2", color: "#7f1d1d", fontWeight: 800 }}>{error}</div> : null}

      {bulkMode ? (
        <div style={{ ...card, marginTop: "0.75rem" }}>
          <h2 style={{ marginTop: 0 }}>Bulk add ({tab})</h2>
          <div style={subtle}>Paste one item per line. Existing items will be skipped automatically.</div>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            style={{ ...input, minHeight: 140, resize: "vertical", marginTop: "0.75rem" }}
            placeholder={
              tab === "BANKS"
                ? "Example:\nState Bank of India\nBank of India\nHDFC Bank"
                : tab === "CLIENTS"
                ? "Example:\nSharath\nSmt Tayibai Pawar\nGreen Industries"
                : "Example:\nLand and Building\nResidential\nIndustrial"
            }
          />
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button style={btnGreen} onClick={bulkAdd} disabled={working || !bulkText.trim()}>
              {working ? "Working…" : "Bulk add now"}
            </button>
            <button style={btn} onClick={() => setBulkText("")} disabled={working}>Clear</button>
          </div>
        </div>
      ) : null}

      {/* BANKS */}
      {tab === "BANKS" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
          <div style={card}>
            <h2 style={{ marginTop: 0 }}>Banks</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <div style={label}>Search</div>
                <input style={input} value={qBanks} onChange={(e) => setQBanks(e.target.value)} placeholder="Type to filter banks…" />
              </div>

              <div>
                <div style={label}>Create bank</div>
                <input
                  style={input}
                  value={newBank}
                  onChange={(e) => setNewBank(e.target.value)}
                  placeholder="e.g., State Bank of India"
                />
                {bankAlready ? <div style={{ marginTop: "0.35rem", color: "#92400e", fontWeight: 800 }}>Already present</div> : null}
                <SimilarList items={similarBanks} onPick={(name) => setNewBank(name)} />
                <div style={{ marginTop: "0.6rem" }}>
                  <button
                    style={bankAlready || !newBank.trim() ? btnDisabled : btnGreen}
                    onClick={createBank}
                    disabled={working || bankAlready || !newBank.trim()}
                  >
                    {working ? "Working…" : "Create bank"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "0.9rem" }}>
              <Table
                rows={banksFiltered.map((b) => ({ _key: b.id, id: b.id, name: b.name }))}
                columns={[
                  { key: "id", title: "ID" },
                  { key: "name", title: "Bank name" },
                  {
                    key: "pick",
                    title: "Use for branches",
                    render: (r) => (
                      <button
                        type="button"
                        style={btn}
                        onClick={() => setSelectedBankId(String(r.id))}
                      >
                        Select
                      </button>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0 }}>Branches</h2>
            <div style={subtle}>
              {selectedBankId ? `Selected bank_id=${selectedBankId}` : "Select a bank above to view/create branches."}
            </div>

            <div style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <div style={label}>Search branches</div>
                <input style={input} value={qBranches} onChange={(e) => setQBranches(e.target.value)} placeholder="Type to filter branches…" disabled={!selectedBankId} />
              </div>

              <div>
                <div style={label}>Create branch (for selected bank)</div>
                <input
                  style={input}
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder="e.g., SBI Mudhol"
                  disabled={!selectedBankId}
                />
                {branchAlready && selectedBankId ? <div style={{ marginTop: "0.35rem", color: "#92400e", fontWeight: 800 }}>Already present</div> : null}
                <SimilarList items={similarBranches} onPick={(name) => setNewBranch(name)} />
                <div style={{ marginTop: "0.6rem" }}>
                  <button
                    style={!selectedBankId || branchAlready || !newBranch.trim() ? btnDisabled : btnGreen}
                    onClick={createBranch}
                    disabled={working || !selectedBankId || branchAlready || !newBranch.trim()}
                  >
                    {working ? "Working…" : "Create branch"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "0.9rem" }}>
              <Table
                rows={branchesFiltered.map((br) => ({ _key: br.id, id: br.id, name: br.name, bank_id: br.bank_id }))}
                columns={[
                  { key: "id", title: "ID" },
                  { key: "name", title: "Branch name" },
                  { key: "bank_id", title: "Bank ID" },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* CLIENTS */}
      {tab === "CLIENTS" && (
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Clients</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <div style={label}>Search</div>
              <input style={input} value={qClients} onChange={(e) => setQClients(e.target.value)} placeholder="Type to filter clients…" />
            </div>

            <div>
              <div style={label}>Create client</div>
              <input
                style={input}
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                placeholder="e.g., Sharath"
              />
              {clientAlready ? <div style={{ marginTop: "0.35rem", color: "#92400e", fontWeight: 800 }}>Already present</div> : null}
              <SimilarList items={similarClients} onPick={(name) => setNewClient(name)} />
              <div style={{ marginTop: "0.6rem" }}>
                <button
                  style={clientAlready || !newClient.trim() ? btnDisabled : btnGreen}
                  onClick={createClient}
                  disabled={working || clientAlready || !newClient.trim()}
                >
                  {working ? "Working…" : "Create client"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "0.9rem" }}>
            <Table
              rows={clientsFiltered.map((c) => ({ _key: c.id, id: c.id, name: c.name }))}
              columns={[
                { key: "id", title: "ID" },
                { key: "name", title: "Client name" },
              ]}
            />
          </div>
        </div>
      )}

      {/* PROPERTY TYPES */}
      {tab === "PROPERTY" && (
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Property Types</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <div style={label}>Search</div>
              <input style={input} value={qProps} onChange={(e) => setQProps(e.target.value)} placeholder="Type to filter property types…" />
            </div>

            <div>
              <div style={label}>Create property type</div>
              <input
                style={input}
                value={newProp}
                onChange={(e) => setNewProp(e.target.value)}
                placeholder="e.g., Land and Building"
              />
              {propAlready ? <div style={{ marginTop: "0.35rem", color: "#92400e", fontWeight: 800 }}>Already present</div> : null}
              <SimilarList items={similarProps} onPick={(name) => setNewProp(name)} />
              <div style={{ marginTop: "0.6rem" }}>
                <button
                  style={propAlready || !newProp.trim() ? btnDisabled : btnGreen}
                  onClick={createPropertyType}
                  disabled={working || propAlready || !newProp.trim()}
                >
                  {working ? "Working…" : "Create property type"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "0.9rem" }}>
            <Table
              rows={propsFiltered.map((p) => ({ _key: p.id, id: p.id, name: p.name }))}
              columns={[
                { key: "id", title: "ID" },
                { key: "name", title: "Property type" },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterDataPage;