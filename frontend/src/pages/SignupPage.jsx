import { useState } from "react";

import { signupCustomer } from "../api/authApi";
import { t } from "../i18n";

export default function SignupPage({ lang }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await signupCustomer(form);
      setMessage(res.message);
      setForm({ name: "", phone: "", address: "", password: "" });
    } catch (err) {
      setError(err?.response?.data?.detail || "Signup failed");
    }
  };

  return (
    <div className="layout">
      <div className="card" style={{ maxWidth: 480, margin: "40px auto" }}>
        <h2>{t(lang, "signupTitle")}</h2>
        {message && <p style={{ color: "#0a6b2f" }}>{message}</p>}
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
        <form onSubmit={onSubmit}>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            placeholder={t(lang, "phoneNumber")}
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
          <input
            type="password"
            placeholder={t(lang, "password")}
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          />
          <button type="submit">{t(lang, "submitApproval")}</button>
        </form>
      </div>
    </div>
  );
}
