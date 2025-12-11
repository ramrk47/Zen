import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import Topbar from "./layout/Topbar";
import HomePage from "./pages/Home";
import AssignmentsPage from "./pages/Assignments";
import AssignmentDetailPage from "./pages/AssignmentDetail";
import InvoicesPage from "./pages/Invoices";
import SettingsPage from "./pages/Settings";

function App() {
  const shellStyle = {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  };

  const sidebarWrapperStyle = {
    width: "220px",
    borderRight: "1px solid #ddd",
    backgroundColor: "#f7f7f7",
  };

  const mainWrapperStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const mainContentStyle = {
    flex: 1,
    padding: "1.5rem",
    backgroundColor: "#fafafa",
    overflow: "auto",
  };

  return (
    <div style={shellStyle}>
      <aside style={sidebarWrapperStyle}>
        <Sidebar />
      </aside>

      <div style={mainWrapperStyle}>
        <Topbar />
        <main style={mainContentStyle}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />

            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route
              path="/assignments/:id"
              element={<AssignmentDetailPage />}
            />

            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;