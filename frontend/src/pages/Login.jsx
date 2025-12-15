import React, { useState } from "react";
import { setCurrentUser } from "../auth/currentUser";

const API_BASE = "http://127.0.0.1:8000";

export default function Login() {
  const [email, setEmail] = useState("admin@zenops.local");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setErr("Invalid credentials.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      // store it for role-based UI
      setCurrentUser({
        id: data.id,
        name: data.full_name || data.email,
        email: data.email,
        role: data.role,
        token: data.token,
      });

      // reload so currentUser constant picks it up
      window.location.href = "/";
    } catch (e2) {
      console.error(e2);
      setErr("Login failed. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Zen Ops Login</h2>
      <p style={{ marginTop: 0, color: "#666", fontSize: 13 }}>
        First login auto-creates ADMIN (bootstrap).
      </p>

      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
        <input
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />

        <label style={{ display: "block", marginBottom: 6 }}>Password</label>
        <input
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />

        {err && <div style={{ color: "red", marginBottom: 12 }}>{err}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 10 }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}