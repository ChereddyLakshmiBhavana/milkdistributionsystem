import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminApprovalsPage from "./pages/admin/AdminApprovalsPage";
import AdminAuditPage from "./pages/admin/AdminAuditPage";
import AdminBillingPage from "./pages/admin/AdminBillingPage";
import AdminEntriesPage from "./pages/admin/AdminEntriesPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { t } from "./i18n";

function Navbar({ lang, setLang }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  return (
    <div className="layout" style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Link to="/login">{t(lang, "navLogin")}</Link>
      <Link to="/signup">{t(lang, "navSignup")}</Link>
      {token && role === "ADMIN" && <Link to="/admin">{t(lang, "overview")}</Link>}
      {token && role === "CUSTOMER" && <Link to="/customer">{t(lang, "navCustomer")}</Link>}
      <select
        style={{ marginBottom: 0, width: 140 }}
        value={lang}
        onChange={(e) => {
          setLang(e.target.value);
          localStorage.setItem("lang", e.target.value);
        }}
      >
        <option value="en">English</option>
        <option value="te">తెలుగు</option>
      </select>
      {token && <button onClick={logout}>{t(lang, "navLogout")}</button>}
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang") || "en";
    setLang(saved);
  }, []);

  return (
    <>
      <Navbar lang={lang} setLang={setLang} />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage lang={lang} />} />
        <Route path="/signup" element={<SignupPage lang={lang} />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminLayout lang={lang} />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverviewPage lang={lang} />} />
          <Route path="approvals" element={<AdminApprovalsPage lang={lang} />} />
          <Route path="entries" element={<AdminEntriesPage lang={lang} />} />
          <Route path="billing" element={<AdminBillingPage lang={lang} />} />
          <Route path="audit" element={<AdminAuditPage lang={lang} />} />
        </Route>
        <Route
          path="/customer"
          element={
            <ProtectedRoute role="CUSTOMER">
              <CustomerDashboard lang={lang} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
