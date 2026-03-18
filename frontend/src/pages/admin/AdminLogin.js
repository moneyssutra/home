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
      const res = await axios.post(`${backendUrl}/api/admin/login`, { email, password });
      if (res.data?.token) {
        localStorage.setItem("admin_token", res.data.token);
        localStorage.setItem("admin_email", res.data.email);
        navigate("/admin");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-teal-50 border border-teal-100">
            <Shield className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-wide">Admin Console</h1>
          <p className="text-xs text-gray-400 mt-1">MoneySutra Command Center</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-4 shadow-lg border border-gray-100">
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 border border-red-100" data-testid="admin-login-error">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@moneyssutra.com" required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-300 outline-none transition-all border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-50 bg-gray-50/50"
                data-testid="admin-login-email"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password" required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-300 outline-none transition-all border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-50 bg-gray-50/50"
                data-testid="admin-login-password"
              />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 bg-teal-600 hover:bg-teal-700"
            data-testid="admin-login-submit"
          >
            {loading ? "Verifying..." : "Access Command Center"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-400 mt-4">Restricted access — Authorized personnel only</p>
      </div>
    </div>
  );
};

export default AdminLogin;
