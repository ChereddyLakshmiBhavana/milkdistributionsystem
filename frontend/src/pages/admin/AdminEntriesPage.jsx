import { useEffect, useMemo, useState } from "react";

import {
  createMilkEntry,
  deleteMilkEntry,
  getCustomers,
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
  const [isSelectedMonthLocked, setIsSelectedMonthLocked] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadCustomers"));
      }
    })();
  }, [lang]);

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
          <div>{selectedCustomer ? `${t(lang, "selected")}: ${selectedCustomer.name}` : ""}</div>
        </div>
        {selectedCustomerId && (
          <div style={{ marginTop: 10 }}>
            <span className={isSelectedMonthLocked ? "status-unpaid" : "status-paid"}>
              {t(lang, "monthLockStatus")}: {isSelectedMonthLocked ? t(lang, "locked") : t(lang, "unlocked")}
            </span>
          </div>
        )}
      </div>

      <div className="card">
        <h3>{editingEntryId ? t(lang, "editMilkEntry") : t(lang, "addMilkEntry")}</h3>
        {isSelectedMonthLocked && <p style={{ color: "#8a5a00" }}>{t(lang, "entriesLockedNotice")}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
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
    </>
  );
}
