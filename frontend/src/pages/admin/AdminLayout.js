import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, ShieldAlert, LogOut, Activity } from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Command Center", end: true },
  { to: "/admin/users", icon: Users, label: "User Intelligence" },
  { to: "/admin/risk", icon: ShieldAlert, label: "Risk Radar" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/admin/verify`, { withCredentials: true });
        if (res.data) setVerified(true);
      } catch {
        navigate("/home");
      }
    })();
  }, [navigate]);

  if (!verified) return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
      <Activity className="h-8 w-8 text-cyan-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" data-testid="admin-layout">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0F1C]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-6">
          <span className="text-sm font-black tracking-widest text-cyan-400 mr-4">FBO</span>
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${isActive ? "bg-cyan-500/15 text-cyan-400" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`
                }
                data-testid={`admin-nav-${label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </NavLink>
            ))}
          </div>
          <button onClick={() => navigate("/home")} className="text-gray-500 hover:text-gray-300 p-2 rounded-lg hover:bg-white/5 transition-all" data-testid="admin-exit">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>
      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
