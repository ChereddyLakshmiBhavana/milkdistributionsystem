import { useEffect, useMemo, useState } from "react";

import {
  createMilkEntry,
  deleteMilkEntry,
  downloadDailyLogsPdf,
  getCustomers,
  listDateWiseCustomerPurchases,
  listCustomerBills,
  listMilkEntries,
  updateMilkEntry,
} from "../../api/adminApi";
import { t } from "../../i18n";

function monthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

export default function AdminEntriesPage({ lang }) {
  const now = new Date();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("1.00");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState([]);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [dateWiseRows, setDateWiseRows] = useState([]);
  const [isSelectedMonthLocked, setIsSelectedMonthLocked] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const controlGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  };

  const workspaceGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 12,
    marginTop: 12,
    alignItems: "start",
  };

  const panelStyle = {
    border: "1px solid #d9dee8",
    borderRadius: 10,
    padding: 12,
    background: "#fbfcff",
  };

  const selectedCustomer = useMemo(
    () => customers.find((item) => String(item.id) === String(selectedCustomerId)),
    [customers, selectedCustomerId]
  );

  const refreshCustomers = async () => {
    const customersData = await getCustomers();
    setCustomers(customersData.filter((item) => item.status === "APPROVED"));
  };

  const refreshEntries = async (customerId, y = year, m = month) => {
    if (!customerId) {
      setEntries([]);
      return;
    }
    const range = monthRange(y, m);
    const entriesData = await listMilkEntries(customerId, range.start, range.end);
    setEntries(entriesData);
  };

  const refreshDateWisePurchases = async (targetDate = reportDate) => {
    const rows = await listDateWiseCustomerPurchases(targetDate);
    setDateWiseRows(rows);
  };

  const refreshLockState = async (customerId, y = year, m = month) => {
    if (!customerId) {
      setIsSelectedMonthLocked(false);
      return;
    }

    const lockedBills = await listCustomerBills(customerId, { onlyLocked: true });
    const monthIsLocked = lockedBills.some((bill) => {
      const [billYear, billMonth] = String(bill.month_start)
        .split("-")
        .slice(0, 2)
        .map((value) => Number(value));
      return billYear === Number(y) && billMonth === Number(m);
    });
    setIsSelectedMonthLocked(monthIsLocked);
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshCustomers();
        await refreshDateWisePurchases();
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadCustomers"));
      }
    })();
  }, [lang]);

  useEffect(() => {
    (async () => {
      try {
        await refreshDateWisePurchases();
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "actionFailed"));
      }
    })();
  }, [reportDate]);

  useEffect(() => {
    (async () => {
      if (!selectedCustomerId) return;
      try {
        await Promise.all([refreshEntries(selectedCustomerId), refreshLockState(selectedCustomerId)]);
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadCustomerData"));
      }
    })();
  }, [selectedCustomerId, year, month, lang]);

  useEffect(() => {
    if (isSelectedMonthLocked && editingEntryId) {
      setEditingEntryId(null);
    }
  }, [isSelectedMonthLocked, editingEntryId]);

  const doAction = async (action) => {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(t(lang, "actionCompleted"));
      if (selectedCustomerId) {
        await refreshEntries(selectedCustomerId);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || t(lang, "actionFailed"));
    }
  };

  const onSaveEntry = async () => {
    if (isSelectedMonthLocked) {
      setError(t(lang, "cannotModifyLockedMonth"));
      return;
    }

    if (!selectedCustomerId) {
      setError(t(lang, "selectCustomerFirst"));
      return;
    }

    const payload = {
      customer_id: Number(selectedCustomerId),
      entry_date: entryDate,
      quantity_liters: quantity,
    };

    await doAction(async () => {
      if (editingEntryId) {
        await updateMilkEntry(editingEntryId, { quantity_liters: quantity });
        setEditingEntryId(null);
      } else {
        await createMilkEntry(payload);
      }
    });
  };

  const startEdit = (entry) => {
    if (isSelectedMonthLocked) {
      setError(t(lang, "cannotModifyLockedMonth"));
      return;
    }

    setEditingEntryId(entry.id);
    setEntryDate(entry.entry_date);
    setQuantity(String(entry.quantity_liters));
  };

  return (
    <>
      <div className="card">
        <h3>{t(lang, "entries")}</h3>
        {message && <p style={{ color: "#0a6b2f" }}>{message}</p>}
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
        <div style={controlGridStyle}>
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
          <div style={{ alignSelf: "center" }}>{selectedCustomer ? `${t(lang, "selected")}: ${selectedCustomer.name}` : ""}</div>
        </div>

        {selectedCustomerId ? (
          <div style={workspaceGridStyle}>
            <section style={panelStyle}>
              <h4 style={{ marginTop: 0 }}>{t(lang, "customerDetails")}</h4>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <strong>{t(lang, "name")}:</strong> {selectedCustomer?.name || "-"}
                </div>
                <div>
                  <strong>{t(lang, "phone")}:</strong> {selectedCustomer?.phone || "-"}
                </div>
                <div>
                  <strong>{t(lang, "address")}:</strong> {selectedCustomer?.address || "-"}
                </div>
                <div>
                  <strong>{t(lang, "month")}:</strong> {month}/{year}
                </div>
                <div>
                  <strong>{t(lang, "monthLockStatus")}:</strong>{" "}
                  <span className={isSelectedMonthLocked ? "status-unpaid" : "status-paid"}>
                    {isSelectedMonthLocked ? t(lang, "locked") : t(lang, "unlocked")}
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() =>
                      doAction(() =>
                        downloadDailyLogsPdf(Number(selectedCustomerId), Number(year), Number(month))
                      )
                    }
                  >
                    {t(lang, "downloadDailyLogsPdf")}
                  </button>
                </div>
              </div>
            </section>

            <section style={panelStyle}>
              <h4 style={{ marginTop: 0 }}>{editingEntryId ? t(lang, "editMilkEntry") : t(lang, "dailyPacketUpdate")}</h4>
              {isSelectedMonthLocked && <p style={{ color: "#8a5a00" }}>{t(lang, "entriesLockedNotice")}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} disabled={isSelectedMonthLocked} />
                <select value={quantity} onChange={(e) => setQuantity(e.target.value)} disabled={isSelectedMonthLocked}>
                  <option value="0.50">0.50 L</option>
                  <option value="0.75">0.75 L</option>
                  <option value="1.00">1.00 L</option>
                </select>
                <button onClick={onSaveEntry} disabled={isSelectedMonthLocked}>
                  {editingEntryId ? t(lang, "updateEntry") : t(lang, "addMilkEntry")}
                </button>
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
            </section>
          </div>
        ) : (
          <p style={{ marginTop: 12 }}>{t(lang, "selectCustomerToManageEntries")}</p>
        )}
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
                  <button onClick={() => startEdit(entry)} disabled={isSelectedMonthLocked}>
                    {t(lang, "edit")}
                  </button>
                  <button
                    onClick={() => {
                      if (isSelectedMonthLocked) {
                        setError(t(lang, "cannotModifyLockedMonth"));
                        return;
                      }
                      doAction(() => deleteMilkEntry(entry.id));
                    }}
                    disabled={isSelectedMonthLocked}
                  >
                    {t(lang, "delete")}
                  </button>
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
        <h3>{t(lang, "purchasesByDate")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 280px) auto", gap: 10, marginBottom: 10 }}>
          <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          <button onClick={() => doAction(() => refreshDateWisePurchases(reportDate))}>{t(lang, "refresh")}</button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>{t(lang, "customerName")}</th>
              <th>{t(lang, "phone")}</th>
              <th>{t(lang, "address")}</th>
              <th>{t(lang, "purchasedLiters")}</th>
              <th>{t(lang, "amount")}</th>
              <th>{t(lang, "numberOfEntries")}</th>
            </tr>
          </thead>
          <tbody>
            {dateWiseRows.map((item) => (
              <tr key={item.customer_id}>
                <td>{item.customer_name}</td>
                <td>{item.phone}</td>
                <td>{item.address || "-"}</td>
                <td>{item.total_liters}</td>
                <td>Rs {item.total_amount}</td>
                <td>{item.entry_count}</td>
              </tr>
            ))}
            {dateWiseRows.length === 0 && (
              <tr>
                <td colSpan={6}>{t(lang, "noPurchasesForDate")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
