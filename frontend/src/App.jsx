import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import Sidebar from "./layout/Sidebar";
import Topbar from "./layout/Topbar";
import HomePage from "./pages/Home";
import AssignmentsPage from "./pages/Assignments";
import NewAssignmentPage from "./pages/NewAssignment";
import AssignmentDetailPage from "./pages/AssignmentDetail";
import InvoicesPage from "./pages/Invoices";
import SettingsPage from "./pages/Settings";
import ManagePersonnelPage from "./pages/ManagePersonnel";
import { getCurrentUser } from "./auth/currentUser";

function App() {
  const location = useLocation();
  const user = getCurrentUser();
  const isLoginRoute = location.pathname === "/login";

  if (!user && !isLoginRoute) {
    return <Navigate to="/login" replace />;
  }

  if (isLoginRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

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
            <Route path="/assignments/new" element={<NewAssignmentPage />} />
            <Route path="/assignments/:id" element={<AssignmentDetailPage />} />

            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/personnel" element={<ManagePersonnelPage />} />

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;