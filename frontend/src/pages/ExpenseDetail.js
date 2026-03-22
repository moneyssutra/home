import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, DollarSign, Calendar, Repeat, Tag, AlertTriangle, Shield, Link2, Loader2, CheckCircle2, Clock, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { toast } from "sonner";
import API_BASE from '../utils/apiConfig';

const backendUrl = API_BASE;
const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n || 0));
const fmtCompact = (n) => { const a = Math.abs(n || 0); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return Math.round(n || 0).toString(); };
const formatDate = (d) => { if (!d) return ""; try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

const getOrdinal = (n) => {
  if (!n) return "";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function ExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState(false);

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
  const ps = data.paymentStatus || {};
  const schedule = expandedSchedule ? (data.schedule || []) : (data.schedule || []).slice(-6);
  const typeColor = data.expenseType === "Fixed" ? "#EF4444" : "#F59E0B";
  const impactLevel = m.expenseToIncomePercent > 20 ? "high" : m.expenseToIncomePercent > 10 ? "medium" : "low";

  // Essential classification
  const ESSENTIAL_CATEGORIES = new Set(["Housing", "Utilities", "Food", "Medical", "Education", "Salary Paid", "EMI"]);
  const NON_ESSENTIAL_PATTERNS = ["sip", "mutual fund", "mf ", "ppf", "nps", "elss", "etf", "gold saving", "investment"];
  const ESSENTIAL_PATTERNS = ["emi", "loan", "rent", "insurance premium", "premium", "petrol", "diesel", "fuel", "commute", "transport", "electricity", "water bill", "gas bill", "grocery", "medicine", "school fee", "tuition"];
  const computeEssential = (exp) => {
    if (exp.isEssential !== undefined && exp.isEssential !== null) return exp.isEssential;
    const name = (exp.expenseName || "").toLowerCase();
    for (const p of NON_ESSENTIAL_PATTERNS) { if (name.includes(p)) return false; }
    for (const p of ESSENTIAL_PATTERNS) { if (name.includes(p)) return true; }
    return ESSENTIAL_CATEGORIES.has(exp.category);
  };
  const isEssential = computeEssential(data);

  const toggleEssential = async () => {
    const newVal = !isEssential;
    try {
      await axios.patch(`${backendUrl}/api/expenses/${id}/essential`, { isEssential: newVal }, { withCredentials: true });
      setData(prev => ({ ...prev, isEssential: newVal }));
      toast.success(newVal ? "Marked as essential" : "Marked as non-essential");
    } catch { toast.error("Failed to update"); }
  };

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="expense-detail-page">
      <header className="px-5 pt-6 pb-6" style={{ background: `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}CC 100%)` }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button"><ArrowLeft className="h-5 w-5" /></button>
          <button onClick={() => navigate(`/expense/${id}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium" data-testid="edit-expense-btn"><Edit3 className="h-4 w-4" /> Edit</button>
        </div>
        <div className="mb-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{data.expenseType} Expense</p>
          <h1 className="text-2xl font-bold text-white" data-testid="expense-name">{data.expenseName}</h1>
          <div className="flex items-center gap-2 mt-1">
            {data.category && <p className="text-white/70 text-sm">{data.category}</p>}
            {data.expenseType === "Fixed" && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isEssential ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`} data-testid="essential-badge">
                <ShieldCheck className="h-3 w-3" />
                {isEssential ? "Essential" : "Non-essential"}
              </span>
            )}
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex justify-between items-end">
            <div><p className="text-white/60 text-xs mb-0.5">Amount</p><p className="text-2xl font-bold text-white" data-testid="expense-amount">₹{fmt(data.expectedAmount)}</p></div>
            <div className="text-right"><p className="text-white/60 text-xs mb-0.5">Frequency</p><p className="text-lg font-semibold text-white/80">{data.frequency}</p></div>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-3 space-y-4">
        {/* Status + Key Metrics */}
        <div className="grid grid-cols-2 gap-3" data-testid="expense-metrics">
          {[
            { label: "This Month", value: ps.isPaid ? "Paid" : "Pending", icon: ps.isPaid ? CheckCircle2 : Clock, color: ps.isPaid ? "#059669" : "#F59E0B" },
            { label: "Due Date", value: ps.dueDay ? `${getOrdinal(ps.dueDay)} of every month` : (ps.dueDayName || "Not set"), icon: Calendar, color: "#3B82F6" },
            { label: "Monthly Cost", value: `₹${fmt(m.monthlyEquivalent)}`, icon: DollarSign, color: "#EF4444" },
            { label: "Yearly Cost", value: `₹${fmtCompact(m.yearlyEquivalent)}`, icon: Calendar, color: "#F59E0B" },
          ].map((item, i) => { const I = item.icon; return (
            <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <I className="h-4 w-4 mb-2" style={{ color: item.color }} /><p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{item.label}</p>
              <p className="text-sm font-bold" style={{ color: i === 0 ? item.color : "var(--text-primary)" }}>{item.value}</p>
            </div>
          ); })}
        </div>

        {/* Essential Toggle (Fixed expenses only) */}
        {data.expenseType === "Fixed" && (
          <button onClick={toggleEssential} className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98]"
            style={{ backgroundColor: isEssential ? "#05966910" : "#F59E0B10", border: `1px solid ${isEssential ? '#05966930' : '#F59E0B30'}` }}
            data-testid="essential-toggle-detail">
            <ShieldCheck className="h-5 w-5 flex-shrink-0" style={{ color: isEssential ? "#059669" : "#F59E0B" }} />
            <div className="flex-1 text-left">
              <p className="text-xs font-semibold" style={{ color: isEssential ? "#059669" : "#F59E0B" }}>
                {isEssential ? "Survival Essential" : "Non-essential (Pausable)"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {isEssential ? "Counted in Emergency Runway. Tap to change." : "Excluded from Emergency Runway. Tap to change."}
              </p>
            </div>
          </button>
        )}

        {/* Next Due Date Banner */}
        {ps.nextDueDate && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: "#3B82F610", border: "1px solid #3B82F630" }} data-testid="next-due-banner">
            <Clock className="h-5 w-5 flex-shrink-0" style={{ color: "#3B82F6" }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: "#3B82F6" }}>Next Due Date</p>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{formatDate(ps.nextDueDate)}</p>
            </div>
          </div>
        )}

        {/* Payment Schedule */}
        {(data.schedule || []).length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="payment-schedule">
            <div className="p-4 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Payment Schedule</h3>
              {(data.schedule || []).length > 6 && <button onClick={() => setExpandedSchedule(!expandedSchedule)} className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--brand-primary)" }}>
                {expandedSchedule ? "Less" : "View All"} {expandedSchedule ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {schedule.map((s, i) => {
                const prevStatus = i > 0 ? schedule[i - 1].status : null;
                const showDivider = prevStatus === "paid" && (s.status === "pending" || s.status === "upcoming");
                return (
                  <div key={i}>
                    {showDivider && (
                      <div className="px-4 py-1.5 flex items-center gap-2" style={{ backgroundColor: "var(--bg-app)" }}>
                        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-light)" }} />
                        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{s.status === "pending" ? "PENDING" : "UPCOMING"}</span>
                        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-light)" }} />
                      </div>
                    )}
                    <div className="px-4 py-2.5 flex justify-between items-center text-xs" style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{formatDate(s.dueDate)}</span>
                      <div className="flex items-center gap-2">
                        <span style={{ color: "var(--text-primary)" }}>₹{fmt(s.amount)}</span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold" style={{
                          backgroundColor: s.status === "paid" ? "#05966915" : s.status === "pending" ? "#EF444415" : "#F59E0B15",
                          color: s.status === "paid" ? "#059669" : s.status === "pending" ? "#EF4444" : "#F59E0B"
                        }}>
                          {s.status === "paid" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {s.status === "paid" ? "Paid" : s.status === "pending" ? "Pending" : "Upcoming"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category & Type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <Tag className="h-4 w-4 mb-2" style={{ color: "#8B5CF6" }} /><p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Category</p>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{data.category || "N/A"}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <Repeat className="h-4 w-4 mb-2" style={{ color: "#3B82F6" }} /><p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Type</p>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{data.expenseType || "N/A"}</p>
          </div>
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
