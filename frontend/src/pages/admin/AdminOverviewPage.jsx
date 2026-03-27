import { useEffect, useMemo, useState } from "react";

import {
  downloadDailyLogsPdf,
  downloadMonthlyBillsCsv,
  downloadMonthlyEntriesCsv,
  getAdminSummary,
  getCustomers,
  getMonthlyCollectionsAnalytics,
} from "../../api/adminApi";
import { t } from "../../i18n";

export default function AdminOverviewPage({ lang }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshData = async (y = year, m = month) => {
    const [summaryData, analyticsData] = await Promise.all([
      getAdminSummary(y, m),
      getMonthlyCollectionsAnalytics(y, m, 6),
    ]);
    setSummary(summaryData);
    setAnalytics(analyticsData.months || []);
  };

  useEffect(() => {
    (async () => {
      try {
        const customersData = await getCustomers();
        const approvedCustomers = customersData.filter((item) => item.status === "APPROVED");
        setCustomers(approvedCustomers);
        if (approvedCustomers.length > 0) {
          setSelectedCustomerId(String(approvedCustomers[0].id));
        }
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadCustomers"));
      }
    })();
  }, [lang]);

  useEffect(() => {
    (async () => {
      try {
        await refreshData();
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadSummary"));
      }
    })();
  }, [year, month, lang]);

  const chartMax = useMemo(() => {
    const maxValue = analytics.reduce((max, item) => {
      const total = Number(item.payable_amount || 0);
      return total > max ? total : max;
    }, 0);
    return maxValue || 1;
  }, [analytics]);

  const doAction = async (action) => {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(t(lang, "actionCompleted"));
    } catch (err) {
      setError(err?.response?.data?.detail || t(lang, "actionFailed"));
    }
  };

  return (
    <>
      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder={t(lang, "year")} />
          <input type="number" value={month} onChange={(e) => setMonth(e.target.value)} placeholder={t(lang, "month")} min="1" max="12" />
        </div>
        {message && <p style={{ color: "#0a6b2f" }}>{message}</p>}
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
      </div>

      <div className="card">
        <h3>{t(lang, "summaryTitle")}</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <p>{t(lang, "totalCustomers")}</p>
            <h3>{summary?.total_customers ?? 0}</h3>
          </div>
          <div className="summary-item">
            <p>{t(lang, "pendingApprovals")}</p>
            <h3>{summary?.pending_approvals ?? 0}</h3>
          </div>
          <div className="summary-item">
            <p>{t(lang, "todayTotalLiters")}</p>
            <h3>{summary?.daily_total_liters ?? 0}</h3>
          </div>
          <div className="summary-item">
            <p>{t(lang, "monthlyIncome")}</p>
            <h3>Rs {summary?.monthly_income ?? 0}</h3>
          </div>
          <div className="summary-item">
            <p>{t(lang, "pendingDues")}</p>
            <h3>Rs {summary?.pending_dues_total ?? 0}</h3>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>{t(lang, "monthlyCollectionsTrend")}</h3>
        {analytics.length === 0 && <p>{t(lang, "noTrendData")}</p>}
        {analytics.length > 0 && (
          <div className="trend-list">
            {analytics.map((item) => {
              const payable = Number(item.payable_amount || 0);
              const paid = Number(item.paid_amount || 0);
              const unpaid = Number(item.unpaid_amount || 0);
              const width = `${Math.max((payable / chartMax) * 100, 8)}%`;
              return (
                <div className="trend-row" key={item.month_start}>
                  <div className="trend-label">{item.month_start}</div>
                  <div className="trend-bar-wrap">
                    <div className="trend-bar" style={{ width }}>
                      <span>Rs {payable.toFixed(0)}</span>
                    </div>
                    <small>Paid: Rs {paid.toFixed(0)} | Pending: Rs {unpaid.toFixed(0)}</small>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3>{t(lang, "exportReports")}</h3>
        <p style={{ marginTop: 0 }}>{t(lang, "exportSelectCustomerHint")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr)", gap: 10, marginBottom: 10 }}>
          <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
            <option value="">{t(lang, "selectCustomer")}</option>
            {customers.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name} ({item.phone})
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => doAction(() => downloadMonthlyEntriesCsv(Number(year), Number(month)))}>
            {t(lang, "exportMonthlyEntriesCsv")}
          </button>
          <button onClick={() => doAction(() => downloadMonthlyBillsCsv(Number(year), Number(month)))}>
            {t(lang, "exportMonthlyBillsCsv")}
          </button>
          <button
            onClick={() => {
              if (!selectedCustomerId) {
                setError(t(lang, "selectCustomerFirst"));
                return;
              }
              doAction(() => downloadDailyLogsPdf(Number(selectedCustomerId), Number(year), Number(month)));
            }}
          >
            {t(lang, "downloadDailyLogsPdf")}
          </button>
        </div>
      </div>
    </>
  );
}
