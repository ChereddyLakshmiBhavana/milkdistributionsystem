import { useEffect, useState } from "react";

import {
  downloadMyBillsCsv,
  downloadMyLogsCsv,
  getMyBillPdfUrl,
  getMyBills,
  getMyLogs,
  getMyPayments,
} from "../api/customerApi";
import { t } from "../i18n";

export default function CustomerDashboard({ lang }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [logs, setLogs] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setError("");
    try {
      const [logsData, billsData, paymentsData] = await Promise.all([
        getMyLogs(Number(year), Number(month)),
        getMyBills(),
        getMyPayments(),
      ]);
      setLogs(logsData);
      setBills(billsData);
      setPayments(paymentsData);
    } catch (err) {
      setError(err?.response?.data?.detail || t(lang, "failedLoadCustomerPanel"));
    }
  };

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

  useEffect(() => {
    loadData();
  }, [lang]);

  useEffect(() => {
    loadData();
  }, [year, month]);

  return (
    <div className="layout">
      <div className="card">
        <h2>{t(lang, "customerTitle")}</h2>
        <p>{t(lang, "customerReadonly")}</p>
        {message && <p style={{ color: "#0a6b2f" }}>{message}</p>}
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
      </div>

      <div className="card">
        <h3>{t(lang, "exportReports")}</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => doAction(() => downloadMyLogsCsv(Number(year), Number(month)))}>
            {t(lang, "exportMyLogsCsv")}
          </button>
          <button onClick={() => doAction(() => downloadMyBillsCsv(Number(year), Number(month)))}>
            {t(lang, "exportMyBillsCsv")}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>{t(lang, "dayWiseMilkLogs")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10 }}>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder={t(lang, "year")} />
          <input type="number" value={month} onChange={(e) => setMonth(e.target.value)} placeholder={t(lang, "month")} min="1" max="12" />
          <button onClick={loadData}>{t(lang, "refresh")}</button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>{t(lang, "date")}</th>
              <th>{t(lang, "liters")}</th>
              <th>{t(lang, "amount")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.entry_date}</td>
                <td>{entry.quantity_liters}</td>
                <td>Rs {entry.amount}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={3}>{t(lang, "noLogsForMonth")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>{t(lang, "monthlyBills")}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>{t(lang, "month")}</th>
              <th>{t(lang, "total")}</th>
              <th>{t(lang, "previousDue")}</th>
              <th>{t(lang, "payable")}</th>
              <th>{t(lang, "unpaid")}</th>
              <th>{t(lang, "status")}</th>
              <th>{t(lang, "pdf")}</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id}>
                <td>{bill.month_start}</td>
                <td>Rs {bill.total_amount}</td>
                <td>Rs {bill.previous_due}</td>
                <td>Rs {bill.payable_amount}</td>
                <td>Rs {bill.unpaid_amount}</td>
                <td>
                  <span className={bill.status === "PAID" ? "status-paid" : "status-unpaid"}>
                    {bill.status === "PAID" ? t(lang, "paid") : t(lang, "unpaidStatus")}
                  </span>
                </td>
                <td>
                  <a href={getMyBillPdfUrl(bill.id)} target="_blank" rel="noreferrer">
                    <button>{t(lang, "download")}</button>
                  </a>
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan={7}>{t(lang, "noBillsAvailable")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>{t(lang, "paymentHistory")}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>{t(lang, "paymentId")}</th>
              <th>{t(lang, "billId")}</th>
              <th>{t(lang, "amount")}</th>
              <th>{t(lang, "date")}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.id}</td>
                <td>{payment.bill_id}</td>
                <td>Rs {payment.amount}</td>
                <td>{payment.paid_at}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={4}>{t(lang, "noPayments")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
