import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, ChevronRight, Briefcase, Building2, Laptop, Home, Coins, TrendingUp, Banknote, Gift } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const typeIcons = {
  Salary: Briefcase, Job: Briefcase, Business: Building2, "Self-Employed": Laptop,
  Freelance: Laptop, Rental: Home, Commission: Coins, Interest: TrendingUp,
  Dividend: Banknote, "Other Income": Gift,
};
const typeColors = {
  Salary: "#059669", Job: "#059669", Business: "#3B82F6", "Self-Employed": "#8B5CF6",
  Freelance: "#8B5CF6", Rental: "#F59E0B", Commission: "#EC4899", Interest: "#06B6D4",
  Dividend: "#10B981", "Other Income": "#6B7280",
};
const typeEditRoutes = {
  Salary: "job-income", Job: "job-income", Business: "business-income",
  "Self-Employed": "self-employed-income", Freelance: "self-employed-income",
  Rental: "rental-income", Commission: "commission-income", Interest: "interest-income",
  Dividend: "dividend-income", "Other Income": "other-income",
};

const ExpectedIncome = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/dashboard/networth`, { withCredentials: true });
        setItems(res.data.incomeExpectedList || []);
        setTotal(res.data.expectedIncome || 0);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, []);

  const formatAmount = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n));
  const today = new Date().getDate();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--brand-primary)" }} />
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="expected-income-page">
      <header className="px-6 pt-6 pb-16" style={{ background: "linear-gradient(135deg, #10B981, #6EE7B7)" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-white" data-testid="back-btn"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold text-white">Expected Income</h1>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <p className="text-white/70 text-xs mb-1">Yet to Receive This Month</p>
          <p className="text-3xl font-bold text-white">₹{formatAmount(total)}</p>
          <p className="text-white/50 text-xs mt-1">{items.length} pending source{items.length !== 1 ? "s" : ""}</p>
        </div>
      </header>

      <div className="px-6 -mt-6 space-y-3">
        {/* Go to My Income */}
        <button
          onClick={() => navigate("/my-income")}
          className="w-full rounded-xl p-3 flex items-center justify-between shadow-card"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
          data-testid="go-to-my-income"
        >
          <span className="text-sm font-medium" style={{ color: "var(--brand-primary)" }}>View All Income Sources</span>
          <ChevronRight className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
        </button>

        {items.length === 0 ? (
          <div className="rounded-2xl p-8 text-center shadow-card" style={{ backgroundColor: "var(--bg-card)" }}>
            <Clock className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>All expected income has been received!</p>
          </div>
        ) : items.map((item, idx) => {
          const TypeIcon = typeIcons[item.type] || Gift;
          const c = typeColors[item.type] || "#6B7280";
          const editRoute = typeEditRoutes[item.type];
          const daysUntil = item.scheduleDay - today;
          return (
            <div
              key={idx}
              className="rounded-xl p-4 shadow-card flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              onClick={() => editRoute && item.id ? navigate(`/${editRoute}/${item.id}`) : null}
              data-testid={`expected-item-${idx}`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c}15` }}>
                <TypeIcon className="h-5 w-5" style={{ color: c }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {item.type} · {item.frequency} · Day {item.scheduleDay}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: "#F59E0B" }}>₹{formatAmount(item.amount)}</p>
                <div className="flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" style={{ color: "#F59E0B" }} />
                  <span className="text-[10px]" style={{ color: "#F59E0B" }}>
                    {daysUntil > 0 ? `in ${daysUntil} day${daysUntil > 1 ? "s" : ""}` : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
};

export default ExpectedIncome;
