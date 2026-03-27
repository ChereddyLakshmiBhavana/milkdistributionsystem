import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginUser } from "../api/authApi";
import { t } from "../i18n";

export default function LoginPage({ lang }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await loginUser(form);
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("role", res.role);
      if (res.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/customer");
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="layout">
      <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
        <h2>{t(lang, "loginTitle")}</h2>
        {error && <p style={{ color: "#b00020" }}>{error}</p>}
        <form onSubmit={onSubmit}>
          <input
            placeholder={t(lang, "phoneNumber")}
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <input
            type="password"
            placeholder={t(lang, "password")}
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          />
          <button type="submit">{t(lang, "navLogin")}</button>
        </form>
      </div>
    </div>
  );
}
