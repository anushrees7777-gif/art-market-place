import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <h2>Log in</h2>
      {error && <p className="error">{error}</p>}
      <label>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
      <label>Password</label>
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
      <button type="submit">Log in</button>
      <p className="muted small">
        No account? <Link to="/register">Sign up</Link>
      </p>
      <p className="muted small">Seed logins: meera@example.com / buyer1@example.com — password123</p>
    </form>
  );
}
