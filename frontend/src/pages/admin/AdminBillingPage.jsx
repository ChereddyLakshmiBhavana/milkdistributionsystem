import { useEffect, useMemo, useState } from "react";

import {
  generateBill,
  getBillPdfUrl,
  getCustomers,
  lockBillMonth,
  listCustomerBills,
  recordPayment,
  unlockBillMonth,
} from "../../api/adminApi";
import { t } from "../../i18n";

export default function AdminBillingPage({ lang }) {
  const now = new Date();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [bills, setBills] = useState([]);
  const [selectedMonthBill, setSelectedMonthBill] = useState(null);
  const [showOnlyLocked, setShowOnlyLocked] = useState(false);
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [unlockReason, setUnlockReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  const activeSortLabel = useMemo(() => {
    if (sortBy === "oldest") return t(lang, "oldestFirst");
    if (sortBy === "unpaid_first") return t(lang, "unpaidFirst");
    return t(lang, "newestFirst");
  }, [sortBy, lang]);

  const filterToggleStyle = (isActive) => ({
    marginBottom: 0,
    backgroundColor: isActive ? "#0f766e" : "#f4f4f5",
    color: isActive ? "#ffffff" : "#1f2937",
    border: `1px solid ${isActive ? "#0f766e" : "#d4d4d8"}`,
  });

  const hasActiveFilters = showOnlyLocked || showOnlyUnpaid;

  const sortedBills = useMemo(() => {
    const items = [...bills];

    const byNewest = (a, b) => String(b.month_start).localeCompare(String(a.month_start));
    const byOldest = (a, b) => String(a.month_start).localeCompare(String(b.month_start));

    if (sortBy === "oldest") {
      return items.sort(byOldest);
    }

    if (sortBy === "unpaid_first") {
      return items.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "UNPAID" ? -1 : 1;
        }
        return byNewest(a, b);
      });
    }

    return items.sort(byNewest);
  }, [bills, sortBy]);

  const refreshCustomers = async () => {
    const data = await getCustomers();
    setCustomers(data.filter((item) => item.status === "APPROVED"));
  };

  const refreshBills = async (customerId, options = {}) => {
    if (!customerId) {
      setBills([]);
      return;
    }
    const data = await listCustomerBills(customerId, options);
    setBills(data);
  };

  const refreshSelectedMonthBill = async (customerId, y = year, m = month) => {
    if (!customerId) {
      setSelectedMonthBill(null);
      return;
    }
    const data = await listCustomerBills(customerId);
    const matched = data.find((bill) => {
      const [billYear, billMonth] = String(bill.month_start)
        .split("-")
        .slice(0, 2)
        .map((value) => Number(value));
      return billYear === Number(y) && billMonth === Number(m);
    });
    setSelectedMonthBill(matched || null);
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshCustomers();
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadCustomers"));
      }
    })();
  }, [lang]);

  useEffect(() => {
    (async () => {
      if (!selectedCustomerId) return;
      try {
        await Promise.all([
          refreshBills(selectedCustomerId, { onlyLocked: showOnlyLocked, onlyUnpaid: showOnlyUnpaid }),
          refreshSelectedMonthBill(selectedCustomerId),
        ]);
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadCustomerData"));
      }
    })();
  }, [selectedCustomerId, year, month, showOnlyLocked, showOnlyUnpaid, lang]);

  const doAction = async (action) => {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(t(lang, "actionCompleted"));
      if (selectedCustomerId) {
        await Promise.all([
          refreshBills(selectedCustomerId, { onlyLocked: showOnlyLocked, onlyUnpaid: showOnlyUnpaid }),
          refreshSelectedMonthBill(selectedCustomerId),
        ]);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || t(lang, "actionFailed"));
    }
  };

  const onGenerateBill = async () => {
    if (!selectedCustomerId) {
      setError(t(lang, "selectCustomerFirst"));
      return;
    }

    const selectedYear = Number(year);
    const selectedMonth = Number(month);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const isFutureMonth = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);

    if (isFutureMonth) {
      const accepted = window.confirm(t(lang, "confirmFutureBillGeneration"));
      if (!accepted) {
        return;
      }
    }

    await doAction(() => generateBill(Number(selectedCustomerId), Number(year), Number(month)));
  };

  const onRecordPayment = async (bill) => {
    await doAction(() => recordPayment({ bill_id: bill.id, amount: bill.unpaid_amount }));
  };

  const onToggleLock = async (bill) => {
    if (bill.is_locked) {
      await doAction(() => unlockBillMonth(bill.id, unlockReason));
      return;
    }
    await doAction(() => lockBillMonth(bill.id));
  };

  return (
    <>
      <div className="card">
        <h3>{t(lang, "billing")}</h3>
        {message && <p style={{ color: "#0a6b2f" }}>{message}</p>}
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
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
        {selectedCustomerId && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className={selectedMonthBill?.is_locked ? "status-unpaid" : "status-paid"}>
              {t(lang, "monthLockStatus")}: {selectedMonthBill ? (selectedMonthBill.is_locked ? t(lang, "locked") : t(lang, "unlocked")) : t(lang, "noBillAvailable")}
            </span>
            {!selectedMonthBill && (
              <button onClick={onGenerateBill}>{t(lang, "generateNow")}</button>
            )}
          </div>
        )}
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
        <h3>{t(lang, "billsAndPayments")}</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            onClick={() => setShowOnlyLocked((prev) => !prev)}
            style={filterToggleStyle(showOnlyLocked)}
            aria-pressed={showOnlyLocked}
          >
            {t(lang, "onlyLocked")}
          </button>
          <button
            onClick={() => setShowOnlyUnpaid((prev) => !prev)}
            style={filterToggleStyle(showOnlyUnpaid)}
            aria-pressed={showOnlyUnpaid}
          >
            {t(lang, "onlyUnpaid")}
          </button>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: 180, marginBottom: 0 }}>
            <option value="newest">{t(lang, "newestFirst")}</option>
            <option value="oldest">{t(lang, "oldestFirst")}</option>
            <option value="unpaid_first">{t(lang, "unpaidFirst")}</option>
          </select>
          <button
            onClick={() => {
              setShowOnlyLocked(false);
              setShowOnlyUnpaid(false);
            }}
            disabled={!hasActiveFilters}
          >
            {t(lang, "clearFilters")}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <span>{t(lang, "activeView")}:</span>
          {showOnlyLocked && (
            <button
              onClick={() => setShowOnlyLocked(false)}
              style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12, marginBottom: 0 }}
              title={t(lang, "removeChip")}
            >
              {t(lang, "onlyLocked")} x
            </button>
          )}
          {showOnlyUnpaid && (
            <button
              onClick={() => setShowOnlyUnpaid(false)}
              style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12, marginBottom: 0 }}
              title={t(lang, "removeChip")}
            >
              {t(lang, "onlyUnpaid")} x
            </button>
          )}
          {sortBy !== "newest" ? (
            <button
              onClick={() => setSortBy("newest")}
              style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12, marginBottom: 0 }}
              title={t(lang, "removeChip")}
            >
              {t(lang, "sortByLabel")}: {activeSortLabel} x
            </button>
          ) : (
            <span style={{ border: "1px solid #bbb", borderRadius: 999, padding: "2px 10px", fontSize: 12 }}>
              {t(lang, "sortByLabel")}: {activeSortLabel}
            </span>
          )}
        </div>
        <input
          placeholder={t(lang, "unlockReason")}
          value={unlockReason}
          onChange={(e) => setUnlockReason(e.target.value)}
        />
        <table className="table">
          <thead>
            <tr>
              <th>{t(lang, "month")}</th>
              <th>{t(lang, "total")}</th>
              <th>{t(lang, "previousDue")}</th>
              <th>{t(lang, "payable")}</th>
              <th>{t(lang, "unpaid")}</th>
              <th>{t(lang, "locked")}</th>
              <th>{t(lang, "status")}</th>
              <th>{t(lang, "actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedBills.map((bill) => (
              <tr key={bill.id}>
                <td>{bill.month_start}</td>
                <td>Rs {bill.total_amount}</td>
                <td>Rs {bill.previous_due}</td>
                <td>Rs {bill.payable_amount}</td>
                <td>Rs {bill.unpaid_amount}</td>
                <td>
                  <span className={bill.is_locked ? "status-unpaid" : "status-paid"}>
                    {bill.is_locked ? t(lang, "locked") : t(lang, "unlocked")}
                  </span>
                </td>
                <td>
                  <span className={bill.status === "PAID" ? "status-paid" : "status-unpaid"}>
                    {bill.status === "PAID" ? t(lang, "paid") : t(lang, "unpaidStatus")}
                  </span>
                </td>
                <td style={{ display: "flex", gap: 8 }}>
                  {bill.status === "UNPAID" && (
                    <button onClick={() => onRecordPayment(bill)}>{t(lang, "markFullPaid")}</button>
                  )}
                  <button onClick={() => onToggleLock(bill)}>
                    {bill.is_locked ? t(lang, "unlockMonth") : t(lang, "lockMonth")}
                  </button>
                  <a href={getBillPdfUrl(bill.id)} target="_blank" rel="noreferrer">
                    <button>{t(lang, "pdf")}</button>
                  </a>
                </td>
              </tr>
            ))}
            {sortedBills.length === 0 && (
              <tr>
                <td colSpan={8}>{t(lang, "noBillsAvailable")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
