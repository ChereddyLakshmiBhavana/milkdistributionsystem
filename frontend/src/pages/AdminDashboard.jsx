import { useEffect, useMemo, useState } from "react";

import {
  approveCustomer,
  createMilkEntry,
  deleteMilkEntry,
  downloadMonthlyBillsCsv,
  downloadMonthlyEntriesCsv,
  generateBill,
  getAdminSummary,
  getAuditLogs,
  getBillPdfUrl,
  getCustomers,
  getMonthlyCollectionsAnalytics,
  getPendingCustomers,
  listCustomerBills,
  listMilkEntries,
  recordPayment,
  rejectCustomer,
  updateMilkEntry,
} from "../api/adminApi";
import { t } from "../i18n";

function monthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

export default function AdminDashboard({ lang }) {
  const now = new Date();
  const [pending, setPending] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("1.00");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState([]);
  const [bills, setBills] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const selectedCustomer = useMemo(
    () => customers.find((item) => String(item.id) === String(selectedCustomerId)),
    [customers, selectedCustomerId]
  );

  const paidTotal = useMemo(
    () => bills.reduce((sum, bill) => sum + Number(bill.paid_amount || 0), 0),
    [bills]
  );

  const pendingTotal = useMemo(
    () => bills.reduce((sum, bill) => sum + Number(bill.unpaid_amount || 0), 0),
    [bills]
  );

  const refreshCustomers = async () => {
    const [pendingData, customersData] = await Promise.all([getPendingCustomers(), getCustomers()]);
    setPending(pendingData);
    setCustomers(customersData.filter((item) => item.status === "APPROVED"));
  };

  const refreshSummary = async (y = year, m = month) => {
    const data = await getAdminSummary(y, m);
    setSummary(data);
  };

  const refreshAnalytics = async (y = year, m = month) => {
    const data = await getMonthlyCollectionsAnalytics(y, m, 6);
    setAnalytics(data.months || []);
  };

  const refreshAuditLogs = async () => {
    const data = await getAuditLogs(50);
    setAuditLogs(data);
  };

  const refreshCustomerData = async (customerId, y = year, m = month) => {
    if (!customerId) {
      setEntries([]);
      setBills([]);
      return;
    }
    const range = monthRange(y, m);
    const [entriesData, billsData] = await Promise.all([
      listMilkEntries(customerId, range.start, range.end),
      listCustomerBills(customerId),
    ]);
    setEntries(entriesData);
    setBills(billsData);
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshCustomers();
        await refreshSummary();
        await refreshAnalytics();
        await refreshAuditLogs();
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadCustomers"));
      }
    })();
  }, [lang]);

  useEffect(() => {
    (async () => {
      if (!selectedCustomerId) {
        return;
      }
      try {
        await refreshCustomerData(selectedCustomerId);
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadCustomerData"));
      }
    })();
  }, [selectedCustomerId, year, month, lang]);

  useEffect(() => {
    (async () => {
      try {
        await refreshSummary(year, month);
        await refreshAnalytics(year, month);
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadSummary"));
      }
    })();
  }, [year, month, lang]);

  const takeAction = async (action) => {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(t(lang, "actionCompleted"));
      await refreshCustomers();
      if (selectedCustomerId) {
        await refreshCustomerData(selectedCustomerId);
      }
      await refreshSummary(year, month);
      await refreshAnalytics(year, month);
      await refreshAuditLogs();
    } catch (err) {
      setError(err?.response?.data?.detail || t(lang, "actionFailed"));
    }
  };

  const onExportEntries = async () => {
    await takeAction(async () => {
      await downloadMonthlyEntriesCsv(Number(year), Number(month));
    });
  };

  const onExportBills = async () => {
    await takeAction(async () => {
      await downloadMonthlyBillsCsv(Number(year), Number(month));
    });
  };

  const onSaveEntry = async () => {
    if (!selectedCustomerId) {
      setError(t(lang, "selectCustomerFirst"));
      return;
    }

    const payload = {
      customer_id: Number(selectedCustomerId),
      entry_date: entryDate,
      quantity_liters: quantity,
    };

    await takeAction(async () => {
      if (editingEntryId) {
        await updateMilkEntry(editingEntryId, { quantity_liters: quantity });
        setEditingEntryId(null);
      } else {
        await createMilkEntry(payload);
      }
    });
  };

  const onGenerateBill = async () => {
    if (!selectedCustomerId) {
      setError(t(lang, "selectCustomerFirst"));
      return;
    }

    await takeAction(async () => {
      await generateBill(Number(selectedCustomerId), Number(year), Number(month));
    });
  };

  const onRecordPayment = async (bill) => {
    await takeAction(async () => {
      await recordPayment({ bill_id: bill.id, amount: bill.unpaid_amount });
    });
  };

  const startEdit = (entry) => {
    setEditingEntryId(entry.id);
    setEntryDate(entry.entry_date);
    setQuantity(String(entry.quantity_liters));
  };

  const chartMax = useMemo(() => {
    const maxValue = analytics.reduce((max, item) => {
      const total = Number(item.payable_amount || 0);
      return total > max ? total : max;
    }, 0);
    return maxValue || 1;
  }, [analytics]);

  return (
    <div className="layout">
      <div className="card">
        <h2>{t(lang, "adminTitle")}</h2>
        <p>{t(lang, "adminOnlyMsg")}</p>
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
        <h3>{t(lang, "pendingCustomerApprovals")}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>{t(lang, "name")}</th>
              <th>{t(lang, "phone")}</th>
              <th>{t(lang, "action")}</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.phone}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => takeAction(() => approveCustomer(item.id))}>{t(lang, "approve")}</button>
                  <button onClick={() => takeAction(() => rejectCustomer(item.id))}>{t(lang, "reject")}</button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={3}>{t(lang, "noPendingRequests")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>{t(lang, "customerBillingWorkspace")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
            <option value="">{t(lang, "selectCustomer")}</option>
            {customers.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name} ({item.phone})
              </option>
            ))}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder={t(lang, "year")} />
          <input type="number" value={month} onChange={(e) => setMonth(e.target.value)} placeholder={t(lang, "month")} min="1" max="12" />
          <button onClick={onGenerateBill}>{t(lang, "generateMonthlyBill")}</button>
        </div>
        {selectedCustomer && <p style={{ marginTop: 10 }}>{t(lang, "selected")}: {selectedCustomer.name}</p>}
      </div>

      <div className="card">
        <h3>{editingEntryId ? t(lang, "editMilkEntry") : t(lang, "addMilkEntry")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          <select value={quantity} onChange={(e) => setQuantity(e.target.value)}>
            <option value="0.50">0.50 L</option>
            <option value="0.75">0.75 L</option>
            <option value="1.00">1.00 L</option>
          </select>
          <button onClick={onSaveEntry}>{editingEntryId ? t(lang, "updateEntry") : t(lang, "addMilkEntry")}</button>
          {editingEntryId && (
            <button
              onClick={() => {
                setEditingEntryId(null);
                setQuantity("1.00");
              }}
            >
              {t(lang, "cancelEdit")}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>{t(lang, "dayWiseEntries")}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>{t(lang, "date")}</th>
              <th>{t(lang, "liters")}</th>
              <th>{t(lang, "amount")}</th>
              <th>{t(lang, "actions")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.entry_date}</td>
                <td>{entry.quantity_liters}</td>
                <td>Rs {entry.amount}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => startEdit(entry)}>{t(lang, "edit")}</button>
                  <button onClick={() => takeAction(() => deleteMilkEntry(entry.id))}>{t(lang, "delete")}</button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4}>{t(lang, "noEntriesMonth")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>{t(lang, "billingInsight")}</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <p>{t(lang, "paidAmount")}</p>
            <h3>Rs {paidTotal.toFixed(2)}</h3>
          </div>
          <div className="summary-item">
            <p>{t(lang, "pendingAmount")}</p>
            <h3>Rs {pendingTotal.toFixed(2)}</h3>
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onExportEntries}>{t(lang, "exportMonthlyEntriesCsv")}</button>
          <button onClick={onExportBills}>{t(lang, "exportMonthlyBillsCsv")}</button>
        </div>
      </div>

      <div className="card">
        <h3>{t(lang, "recentAdminActivity")}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>{t(lang, "createdAt")}</th>
              <th>{t(lang, "actorId")}</th>
              <th>{t(lang, "action")}</th>
              <th>{t(lang, "entity")}</th>
              <th>{t(lang, "details")}</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.created_at}</td>
                <td>{log.actor_user_id}</td>
                <td>{log.action}</td>
                <td>{log.entity_type}#{log.entity_id}</td>
                <td>{log.details}</td>
              </tr>
            ))}
            {auditLogs.length === 0 && (
              <tr>
                <td colSpan={5}>{t(lang, "noAuditLogs")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>{t(lang, "billsAndPayments")}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>{t(lang, "month")}</th>
              <th>{t(lang, "total")}</th>
              <th>{t(lang, "previousDue")}</th>
              <th>{t(lang, "payable")}</th>
              <th>{t(lang, "unpaid")}</th>
              <th>{t(lang, "status")}</th>
              <th>{t(lang, "actions")}</th>
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
                <td style={{ display: "flex", gap: 8 }}>
                  {bill.status === "UNPAID" && (
                    <button onClick={() => onRecordPayment(bill)}>{t(lang, "markFullPaid")}</button>
                  )}
                  <a href={getBillPdfUrl(bill.id)} target="_blank" rel="noreferrer">
                    <button>{t(lang, "pdf")}</button>
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
    </div>
  );
}
