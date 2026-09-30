import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "buyer" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/signup", form);
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Sign up failed");
    }
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <h2>Create an account</h2>
      {error && <p className="error">{error}</p>}
      <label>I am a…</label>
      <div className="role-toggle">
        <button type="button" className={form.role === "buyer" ? "active" : ""} onClick={() => update("role", "buyer")}>
          Buyer / Collector
        </button>
        <button type="button" className={form.role === "artist" ? "active" : ""} onClick={() => update("role", "artist")}>
          Artist
        </button>
      </div>
      <label>Name</label>
      <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
      <label>Email</label>
      <input value={form.email} onChange={(e) => update("email", e.target.value)} type="email" required />
      <label>Password</label>
      <input value={form.password} onChange={(e) => update("password", e.target.value)} type="password" required minLength={6} />
      <button type="submit">Sign up</button>
      <p className="muted small">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
