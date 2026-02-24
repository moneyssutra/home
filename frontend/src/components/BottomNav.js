import { useNavigate, useLocation } from "react-router-dom";
import { Home, TrendingUp, Plus, Receipt, PieChart, BarChart3 } from "lucide-react";

const BottomNav = ({ onAddClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: "home", label: "Home", icon: Home, path: "/home" },
    { id: "income", label: "Income", icon: TrendingUp, path: "/my-income" },
    { id: "add", label: "Add", icon: Plus, path: null },
    { id: "portfolio", label: "Portfolio", icon: PieChart, path: "/portfolio" },
    { id: "insights", label: "Insights", icon: BarChart3, path: "/insights" },
  ];

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/home") return location.pathname === "/home" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom shadow-card"
      style={{ backgroundColor: "var(--nav-background)", borderTop: "1px solid var(--border-light)" }}
      data-testid="bottom-nav"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          
          if (tab.id === "add") {
            return (
              <button
                key={tab.id}
                onClick={onAddClick}
                className="flex flex-col items-center justify-center -mt-6"
                data-testid="add-button"
              >
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                  style={{ 
                    background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)",
                    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)"
                  }}
                >
                  <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] mt-1 font-medium" style={{ color: "var(--text-muted)" }}>{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center flex-1 py-2 transition-all"
              data-testid={`nav-${tab.id}`}
            >
              <Icon 
                className="h-6 w-6 mb-1 transition-colors"
                style={{ color: active ? "var(--nav-active)" : "var(--nav-inactive)" }}
                strokeWidth={active ? 2.5 : 2}
              />
              <span 
                className="text-[10px] font-medium transition-colors"
                style={{ color: active ? "var(--nav-active)" : "var(--nav-inactive)" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
