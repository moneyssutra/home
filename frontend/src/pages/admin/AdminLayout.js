import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ShieldAlert, TrendingUp, LogOut, Activity, Timer, Layers, FlaskConical, HelpCircle, Megaphone, Brain, Menu, X, Rocket, Download } from "lucide-react";
import adminApi from "@/utils/adminApi";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/admin/growth", icon: TrendingUp, label: "Growth" },
  { to: "/admin/engagement", icon: Timer, label: "Engagement" },
  { to: "/admin/features", icon: Layers, label: "Features" },
  { to: "/admin/segmentation", icon: FlaskConical, label: "Segments" },
  { to: "/admin/support", icon: HelpCircle, label: "Support" },
  { to: "/admin/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/admin/behavioral", icon: Brain, label: "Behavior" },
  { to: "/admin/monetization", icon: Rocket, label: "Monetize" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/risk", icon: ShieldAlert, label: "Risk" },
  { to: "/admin/export", icon: Download, label: "Export" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [verified, setVerified] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    (async () => {
      try {
        await adminApi.get("/admin/verify");
        setVerified(true);
      } catch {
        navigate("/admin/login");
      }
    })();
  }, [navigate]);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    try { await adminApi.post("/admin/logout"); } catch {}
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_email");
    navigate("/admin/login");
  };

  if (!verified) return (
    <div className="h-screen bg-[#0F172A] flex items-center justify-center">
      <Activity className="h-8 w-8 text-teal-400 animate-spin" />
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-[#F8FAFC]" data-testid="admin-layout">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-[#0A0A0A] border-r border-white/5">
        <div className="px-5 h-14 flex items-center border-b border-white/5 shrink-0">
          <span className="text-sm font-black tracking-widest text-teal-400">MoneySutra</span>
          <span className="ml-2 text-[10px] font-medium text-teal-300 bg-teal-900/50 px-1.5 py-0.5 rounded">ADMIN</span>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-teal-500/10 text-teal-400 border-l-2 border-teal-400 -ml-px"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`
              }
              data-testid={`admin-nav-${label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-white/5 shrink-0">
          <button onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-all w-full"
            data-testid="admin-exit">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A] border-b border-white/5">
        <div className="flex items-center h-12 px-4 gap-3">
          <span className="text-sm font-black tracking-widest text-teal-400">MoneySutra</span>
          <span className="text-[10px] font-medium text-teal-300 bg-teal-900/50 px-1.5 py-0.5 rounded">ADMIN</span>
          <div className="flex-1" />
          <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">
            {navItems.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== "/admin")?.label || "Overview"}
          </span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-300 transition-all"
            data-testid="mobile-menu-toggle">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Slide-Down Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-12 z-40" data-testid="mobile-menu">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative bg-[#0A0A0A] border-b border-white/5 shadow-2xl max-h-[75vh] overflow-y-auto">
            <div className="p-3 grid grid-cols-2 gap-1.5">
              {navItems.map(({ to, icon: Icon, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-teal-500/15 text-teal-300 border border-teal-500/20"
                        : "text-slate-300 hover:bg-white/5 border border-transparent"
                    }`
                  }
                  data-testid={`mobile-nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              ))}
              <button onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-transparent col-span-2"
                data-testid="mobile-logout">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-12 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
