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

import AccountPage from "./pages/AccountPage";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminPermissions from "./pages/AdminPermissions";
import AdminWorkload from "./pages/AdminWorkload";
import ManagePersonnelPage from "./pages/ManagePersonnel";

// Master / bank data
import MasterDataPage from "./pages/MasterData";
import BanksPage from "./pages/Banks";
import BankDetailPage from "./pages/BankDetail";
import BranchDetailPage from "./pages/BranchDetail";

import { getCurrentUser } from "./auth/currentUser";

function App() {
  const location = useLocation();
  const user = getCurrentUser();
  const isLoginRoute = location.pathname === "/login";

  // 🔐 Auth guard
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
    backgroundColor: "#f3f4f6",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  };

  const sidebarWrapperStyle = {
    width: "220px",
    borderRight: "1px solid #e5e7eb",
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

            {/* Account */}
            <Route path="/account" element={<AccountPage />} />

            {/* Assignments */}
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/assignments/new" element={<NewAssignmentPage />} />
            <Route path="/assignments/:id" element={<AssignmentDetailPage />} />

            {/* Finance */}
            <Route path="/invoices" element={<InvoicesPage />} />

            {/* Admin */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/personnel" element={<ManagePersonnelPage />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/workload" element={<AdminWorkload />} />
            <Route path="/admin/permissions" element={<AdminPermissions />} />

            {/* Master / Bank data */}
            <Route path="/admin/master" element={<MasterDataPage />} />
            <Route path="/admin/banks" element={<BanksPage />} />
            <Route path="/admin/banks/:id" element={<BankDetailPage />} />
            <Route path="/admin/branches/:id" element={<BranchDetailPage />} />

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;