import { useNavigate, useLocation } from "react-router-dom";
import { Home, TrendingUp, Plus, Receipt, PieChart } from "lucide-react";

const BottomNav = ({ onAddClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "income", label: "Income", icon: TrendingUp, path: "/my-income" },
    { id: "add", label: "Add", icon: Plus, path: null },
    { id: "expenses", label: "Expenses", icon: Receipt, path: "/my-expenses" },
    { id: "portfolio", label: "Portfolio", icon: PieChart, path: "/portfolio" },
  ];

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1E293B] border-t border-gray-200 z-50 safe-area-bottom" data-testid="bottom-nav">
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
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#10B981] flex items-center justify-center shadow-lg shadow-[#14B8A6]/30 transition-all hover:scale-105 active:scale-95">
                  <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] text-[#E2E8F0]/60 mt-1 font-medium">{tab.label}</span>
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
                className={`h-6 w-6 mb-1 transition-colors ${
                  active ? "text-[#14B8A6]" : "text-[#E2E8F0]/40"
                }`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium transition-colors ${
                active ? "text-[#14B8A6]" : "text-[#E2E8F0]/60"
              }`}>
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
