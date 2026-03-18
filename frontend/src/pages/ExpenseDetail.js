import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, DollarSign, Calendar, Repeat, Tag, AlertTriangle, Shield, Link2, Loader2 } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { toast } from "sonner";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n || 0));
const fmtCompact = (n) => { const a = Math.abs(n || 0); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return Math.round(n || 0).toString(); };

export default function ExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); fetchDetail(); }, [id]);
  const fetchDetail = async () => {
    setLoading(true);
    try { const r = await axios.get(`${backendUrl}/api/expenses/${id}/detail`, { withCredentials: true }); setData(r.data); }
    catch { toast.error("Failed to load expense details"); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>;
  if (!data) return <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "var(--bg-app)" }}><p style={{ color: "var(--text-muted)" }}>Expense not found</p></div>;

  const m = data.metrics || {};
  const typeColor = data.expenseType === "Fixed" ? "#EF4444" : "#F59E0B";
  const impactLevel = m.expenseToIncomePercent > 20 ? "high" : m.expenseToIncomePercent > 10 ? "medium" : "low";

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="expense-detail-page">
      <header className="px-5 pb-6" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top, 1.5rem))", background: `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}CC 100%)` }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button"><ArrowLeft className="h-5 w-5" /></button>
          <button onClick={() => navigate(`/expense/${id}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium" data-testid="edit-expense-btn"><Edit3 className="h-4 w-4" /> Edit</button>
        </div>
        <div className="mb-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{data.expenseType} Expense</p>
          <h1 className="text-2xl font-bold text-white" data-testid="expense-name">{data.expenseName}</h1>
          {data.category && <p className="text-white/70 text-sm mt-1">{data.category}</p>}
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex justify-between items-end">
            <div><p className="text-white/60 text-xs mb-0.5">Amount</p><p className="text-2xl font-bold text-white" data-testid="expense-amount">₹{fmt(data.expectedAmount)}</p></div>
            <div className="text-right"><p className="text-white/60 text-xs mb-0.5">Frequency</p><p className="text-lg font-semibold text-white/80">{data.frequency}</p></div>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-3 space-y-4">
        <div className="grid grid-cols-2 gap-3" data-testid="expense-metrics">
          {[
            { label: "Monthly Cost", value: `₹${fmt(m.monthlyEquivalent)}`, icon: DollarSign, color: "#EF4444" },
            { label: "Yearly Cost", value: `₹${fmtCompact(m.yearlyEquivalent)}`, icon: Calendar, color: "#F59E0B" },
            { label: "Category", value: data.category || "N/A", icon: Tag, color: "#8B5CF6" },
            { label: "Type", value: data.expenseType || "N/A", icon: Repeat, color: "#3B82F6" },
          ].map((item, i) => { const I = item.icon; return (
            <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <I className="h-4 w-4 mb-2" style={{ color: item.color }} /><p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{item.label}</p>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</p>
            </div>
          ); })}
        </div>

        {/* Income Impact */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: impactLevel === "high" ? "#EF444410" : impactLevel === "medium" ? "#F59E0B10" : "#05966910", border: `1px solid ${impactLevel === "high" ? "#EF4444" : impactLevel === "medium" ? "#F59E0B" : "#059669"}30` }}>
          <div className="flex items-center gap-2 mb-1">
            {impactLevel === "high" ? <AlertTriangle className="h-4 w-4" style={{ color: "#EF4444" }} /> : <Shield className="h-4 w-4" style={{ color: impactLevel === "medium" ? "#F59E0B" : "#059669" }} />}
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              This expense is {m.expenseToIncomePercent}% of your monthly income
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mt-2" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(m.expenseToIncomePercent, 100)}%`, backgroundColor: impactLevel === "high" ? "#EF4444" : impactLevel === "medium" ? "#F59E0B" : "#059669" }} />
          </div>
        </div>

        {/* Linked Entities */}
        {(data.linkedLoan || data.linkedInsurance || data.linkedInvestment || data.linkedAccount) && (
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="linked-entities">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Link2 className="h-4 w-4" style={{ color: "var(--brand-primary)" }} /> Linked To</h3>
            {data.linkedLoan && <button onClick={() => navigate(`/wealth/loans/${data.linkedLoan.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "#EF444410" }}><span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{data.linkedLoan.loanName}</span><span className="text-sm font-bold" style={{ color: "#EF4444" }}>₹{fmtCompact(data.linkedLoan.outstandingAmount)}</span></button>}
            {data.linkedInsurance && <button onClick={() => navigate(`/wealth/insurance/${data.linkedInsurance.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "#3B82F610" }}><span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{data.linkedInsurance.policyName}</span><span className="text-sm font-bold" style={{ color: "#3B82F6" }}>₹{fmtCompact(data.linkedInsurance.coverageAmount)}</span></button>}
            {data.linkedInvestment && <button onClick={() => navigate(`/wealth/investments/${data.linkedInvestment.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "#8B5CF610" }}><span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{data.linkedInvestment.name}</span><span className="text-sm font-bold" style={{ color: "#8B5CF6" }}>₹{fmtCompact(data.linkedInvestment.currentValue)}</span></button>}
            {data.linkedAccount && <button onClick={() => navigate(`/wealth/accounts/${data.linkedAccount.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "#05966910" }}><span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{data.linkedAccount.accountName}</span><span className="text-sm font-bold" style={{ color: "#059669" }}>₹{fmtCompact(data.linkedAccount.currentBalance)}</span></button>}
          </div>
        )}

        {data.notes && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Notes</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{data.notes}</p>
          </div>
        )}
      </div>
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
}
