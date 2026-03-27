import { useEffect, useState } from "react";

import { approveCustomer, getPendingCustomers, rejectCustomer } from "../../api/adminApi";
import { t } from "../../i18n";

export default function AdminApprovalsPage({ lang }) {
  const [pending, setPending] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    const data = await getPendingCustomers();
    setPending(data);
  };

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (err) {
        setError(err?.response?.data?.detail || t(lang, "failedLoadCustomers"));
      }
    })();
  }, [lang]);

  const doAction = async (action) => {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(t(lang, "actionCompleted"));
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || t(lang, "actionFailed"));
    }
  };

  return (
    <div className="card">
      <h3>{t(lang, "pendingCustomerApprovals")}</h3>
      {message && <p style={{ color: "#0a6b2f" }}>{message}</p>}
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
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
                <button onClick={() => doAction(() => approveCustomer(item.id))}>{t(lang, "approve")}</button>
                <button onClick={() => doAction(() => rejectCustomer(item.id))}>{t(lang, "reject")}</button>
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
  );
}
