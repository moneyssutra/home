import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, ShieldAlert, TrendingUp, LogOut, Activity } from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/admin/growth", icon: TrendingUp, label: "User Growth" },
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
        navigate("/admin/login");
      }
    })();
  }, [navigate]);

  if (!verified) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <Activity className="h-8 w-8 text-teal-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="admin-layout" style={{ isolation: "isolate", position: "relative", zIndex: 10 }}>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-6">
          <span className="text-sm font-black tracking-widest text-teal-600 mr-4">MoneySutra</span>
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${isActive ? "bg-teal-50 text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`
                }
                data-testid={`admin-nav-${label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </NavLink>
            ))}
          </div>
          <button onClick={() => navigate("/admin/login")} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50 transition-all" data-testid="admin-exit">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
