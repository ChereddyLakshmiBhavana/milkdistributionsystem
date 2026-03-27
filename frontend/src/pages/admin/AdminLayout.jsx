import { Link, Outlet } from "react-router-dom";

import { t } from "../../i18n";

export default function AdminLayout({ lang }) {
  return (
    <div className="layout">
      <div className="card">
        <h2>{t(lang, "adminTitle")}</h2>
        <p>{t(lang, "adminOnlyMsg")}</p>
        <div className="admin-nav">
          <Link to="/admin">{t(lang, "overview")}</Link>
          <Link to="/admin/approvals">{t(lang, "approvals")}</Link>
          <Link to="/admin/entries">{t(lang, "entries")}</Link>
          <Link to="/admin/billing">{t(lang, "billing")}</Link>
          <Link to="/admin/audit">{t(lang, "audit")}</Link>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
