import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CircleDollarSign, ChevronRight, ShoppingCart, Home, Zap, Car, GraduationCap, Heart, Utensils, Film, Plane, Scissors, CreditCard, Landmark } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const categoryIcons = {
  Housing: Home, Utilities: Zap, Transport: Car, Education: GraduationCap,
  Health: Heart, Food: Utensils, Shopping: ShoppingCart, Entertainment: Film,
  Travel: Plane, "Personal Care": Scissors, EMI: CreditCard, Loan: Landmark,
};

const ExpensesDone = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/dashboard/networth?tz_offset=${new Date().getTimezoneOffset()}`, { withCredentials: true });
        setItems(res.data.expensesDoneList || []);
        setTotal(res.data.expensesDone || 0);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, []);

  const formatAmount = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--brand-primary)" }} />
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="expenses-done-page">
      <header className="px-6 pt-6 pb-16" style={{ background: "linear-gradient(135deg, #DC2626, #F87171)" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-white" data-testid="back-btn"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold text-white">Expenses Done</h1>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <p className="text-white/70 text-xs mb-1">Total Spent This Month</p>
          <p className="text-3xl font-bold text-white">₹{formatAmount(total)}</p>
          <p className="text-white/50 text-xs mt-1">{items.length} expense{items.length !== 1 ? "s" : ""} completed</p>
        </div>
      </header>

      <div className="px-6 -mt-6 space-y-3">
        {/* Go to My Expenses */}
        <button
          onClick={() => navigate("/my-expenses")}
          className="w-full rounded-xl p-3 flex items-center justify-between shadow-card"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
          data-testid="go-to-my-expenses"
        >
          <span className="text-sm font-medium" style={{ color: "#DC2626" }}>View All Expenses</span>
          <ChevronRight className="h-4 w-4" style={{ color: "#DC2626" }} />
        </button>

        {items.length === 0 ? (
          <div className="rounded-2xl p-8 text-center shadow-card" style={{ backgroundColor: "var(--bg-card)" }}>
            <CircleDollarSign className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No expenses completed yet this month</p>
          </div>
        ) : items.map((item, idx) => {
          const TypeIcon = categoryIcons[item.type] || ShoppingCart;
          return (
            <div
              key={idx}
              className="rounded-xl p-4 shadow-card flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              onClick={() => item.id ? navigate(`/expense/${item.id}`) : null}
              data-testid={`done-item-${idx}`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#DC262615" }}>
                <TypeIcon className="h-5 w-5" style={{ color: "#DC2626" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {item.type || "Expense"} · {item.frequency} · Day {item.scheduleDay}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: "#DC2626" }}>₹{formatAmount(item.amount)}</p>
                <div className="flex items-center gap-1 justify-end">
                  <CircleDollarSign className="h-3 w-3" style={{ color: "#DC2626" }} />
                  <span className="text-[10px]" style={{ color: "#DC2626" }}>Paid</span>
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

export default ExpensesDone;
