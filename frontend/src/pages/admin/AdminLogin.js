import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Shield, Mail, Lock, ArrowRight } from "lucide-react";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post(`${backendUrl}/api/admin/login`, { email, password }, { withCredentials: true });
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0A0F1C 0%, #111827 50%, #0A0F1C 100%)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Shield className="h-8 w-8 text-cyan-400" />
          </div>
          <h1 className="text-xl font-black text-white tracking-wide">Admin Console</h1>
          <p className="text-xs text-gray-500 mt-1">MoneySutra Command Center</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs font-semibold text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }} data-testid="admin-login-error">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@moneyssutra.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:ring-1 focus:ring-cyan-500/30"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                data-testid="admin-login-email"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:ring-1 focus:ring-cyan-500/30"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                data-testid="admin-login-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #06B6D4, #0891B2)" }}
            data-testid="admin-login-submit"
          >
            {loading ? "Verifying..." : "Access Command Center"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-600 mt-4">Restricted access - Authorized personnel only</p>
      </div>
    </div>
  );
};

export default AdminLogin;
