import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Edit3, Plus, TrendingUp, TrendingDown, Calendar,
  ChevronDown, ChevronUp, BarChart3, Target, Clock,
  Loader2, X, Zap, Minus
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { toast } from "sonner";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const fmt = (n) => {
  if (!n && n !== 0) return "0";
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
};

const fmtCompact = (n) => {
  if (!n && n !== 0) return "0";
  const a = Math.abs(n);
  if (a >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (a >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (a >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return Math.round(n).toString();
};

const formatDate = (d) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
};

const PERF_STYLES = {
  "Outperforming": { bg: "#05966915", color: "#059669", icon: TrendingUp },
  "On Track": { bg: "#3B82F615", color: "#3B82F6", icon: Target },
  "Underperforming": { bg: "#EF444415", color: "#EF4444", icon: TrendingDown },
  "N/A": { bg: "#94A3B815", color: "#94A3B8", icon: Minus },
};

const CATEGORY_COLORS = {
  "Fixed Deposit (FD)": "#F59E0B",
  "Recurring Deposit (RD)": "#F97316",
  "Mutual Fund": "#8B5CF6",
  "Stocks": "#3B82F6",
  "Gold": "#EAB308",
  "PPF": "#059669",
  "NPS": "#0EA5E9",
  "ULIP": "#EC4899",
  "Crypto": "#F59E0B",
  "ETF": "#6366F1",
  "Real Estate": "#14B8A6",
  "Loan Given": "#F59E0B",
};

export default function InvestmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showContribution, setShowContribution] = useState(false);
  const [contribAmount, setContribAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedLedger, setExpandedLedger] = useState(false);
  // Loan Given states
  const [showRepayment, setShowRepayment] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayNotes, setRepayNotes] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/investments/${id}/detail`, { withCredentials: true });
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load investment details");
    } finally {
      setLoading(false);
    }
  };

  const handleContribution = async () => {
    const amt = parseFloat(contribAmount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      await axios.post(`${backendUrl}/api/investments/${id}/add-contribution`, {
        amount: amt
      }, { withCredentials: true });
      toast.success(`Contribution of ₹${fmt(amt)} added!`);
      setShowContribution(false);
      setContribAmount("");
      fetchDetail();
    } catch { toast.error("Failed to add contribution"); }
    setSubmitting(false);
  };

  const handleRepayment = async () => {
    const amt = parseFloat(repayAmount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (data && amt > (data.outstandingAmount || 0)) return toast.error(`Amount exceeds outstanding (₹${fmt(data.outstandingAmount)})`);
    setSubmitting(true);
    try {
      await axios.post(`${backendUrl}/api/investments/${id}/add-repayment`, {
        amount: amt,
        notes: repayNotes,
      }, { withCredentials: true });
      toast.success(`Repayment of ₹${fmt(amt)} recorded!`);
      setShowRepayment(false);
      setRepayAmount("");
      setRepayNotes("");
      fetchDetail();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add repayment");
    }
    setSubmitting(false);
  };

  const catColor = useMemo(() => {
    if (!data) return "#3B82F6";
    return CATEGORY_COLORS[data.category] || "#3B82F6";
  }, [data]);

  const ledgerToShow = useMemo(() => {
    if (!data?.ledger) return [];
    return expandedLedger ? data.ledger : data.ledger.slice(0, 6);
  }, [data, expandedLedger]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "var(--bg-app)" }}>
        <p style={{ color: "var(--text-muted)" }}>Investment not found</p>
        <button onClick={() => navigate("/my-investments")} className="mt-4 text-sm font-medium" style={{ color: "var(--brand-primary)" }}>Go Back</button>
      </div>
    );
  }

  // ======== LOAN GIVEN DETAIL VIEW ========
  if (data.investmentCategory === "Loan Given") {
    const statusColors = {
      active: { bg: "#DBEAFE", text: "#2563EB", label: "Active" },
      partial: { bg: "#FEF3C7", text: "#D97706", label: "Partially Repaid" },
      closed: { bg: "#DCFCE7", text: "#059669", label: "Fully Repaid" },
      default_risk: { bg: "#FEE2E2", text: "#DC2626", label: "At Risk" },
    };
    const st = statusColors[data.loanStatus] || statusColors.active;

    return (
      <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="loan-given-detail-page">
        {/* Header */}
        <header className="px-5 pt-6 pb-6" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}>
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate("/my-investments")} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button onClick={() => navigate(`/investment/${id}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium" data-testid="edit-loan-btn">
              <Edit3 className="h-4 w-4" /> Edit
            </button>
          </div>

          <div className="mb-4">
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Loan Given</p>
            <h1 className="text-2xl font-bold text-white" data-testid="loan-name">{data.name}</h1>
            {data.borrowerName && <p className="text-white/80 text-sm mt-1">To: {data.borrowerName}</p>}
          </div>

          {/* Summary Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-white/60 text-xs mb-0.5">Outstanding</p>
                <p className="text-2xl font-bold text-white" data-testid="outstanding-amount">₹{fmt(data.outstandingAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs mb-0.5">Amount Given</p>
                <p className="text-lg font-semibold text-white/80">₹{fmtCompact(data.principal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: st.bg, color: st.text }} data-testid="loan-status-badge">{st.label}</span>
              {data.riskLevel === "medium" && (
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700" data-testid="risk-medium-badge">Medium Risk ({data.daysSinceActivity}d inactive)</span>
              )}
              {data.riskLevel === "high" && (
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700" data-testid="risk-high-badge">High Risk ({data.daysSinceActivity}d inactive)</span>
              )}
              {data.dueStatus === "overdue" && (
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-600" data-testid="overdue-badge">Overdue</span>
              )}
              {data.dueStatus === "due_soon" && (
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-600" data-testid="due-soon-badge">Due Soon</span>
              )}
            </div>
          </div>
        </header>

        <div className="px-5 -mt-3 space-y-4">
          {/* Disclaimer */}
          <div className="rounded-2xl p-3 flex items-start gap-2" style={{ backgroundColor: "#FEF3C7", border: "1px solid #F59E0B30" }}>
            <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">Loan Given is not a regulated investment. Recovery depends on borrower reliability.</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3" data-testid="loan-metrics">
            {[
              { label: "Amount Given", value: `₹${fmtCompact(data.principal)}`, sub: formatDate(data.startDate), icon: TrendingUp, color: "#8B5CF6" },
              { label: "Received", value: `₹${fmtCompact(data.amountReceived)}`, sub: `${data.recoveryPct}% recovered`, icon: TrendingDown, color: "#059669" },
              { label: "Outstanding", value: `₹${fmtCompact(data.outstandingAmount)}`, sub: data.dueDate ? `Due: ${formatDate(data.dueDate)}` : "No due date", icon: Target, color: "#DC2626" },
              { label: data.interestType === "none" ? "Interest" : "Expected Interest", value: data.interestType === "none" ? "None" : `₹${fmtCompact(data.expectedInterest)}`, sub: data.interestRate ? `${data.interestRate}% p.a.` : (data.agreedReturnAmount ? `Total: ₹${fmtCompact(data.agreedReturnAmount)}` : "N/A"), icon: BarChart3, color: "#F59E0B" },
            ].map((item, i) => {
              const I = item.icon;
              return (
                <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                  <I className="h-4 w-4 mb-2" style={{ color: item.color }} />
                  <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                  <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</p>
                  {item.sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.sub}</p>}
                </div>
              );
            })}
          </div>

          {/* Borrower Info */}
          {(data.borrowerName || data.borrowerContact) && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Borrower Details</h3>
              {data.borrowerName && (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Name: <span className="font-medium" style={{ color: "var(--text-primary)" }}>{data.borrowerName}</span></p>
              )}
              {data.borrowerContact && (
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Contact: <span className="font-medium" style={{ color: "var(--text-primary)" }}>{data.borrowerContact}</span></p>
              )}
              {data.repaymentType && (
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Repayment: <span className="font-medium capitalize" style={{ color: "var(--text-primary)" }}>{data.repaymentType}</span></p>
              )}
            </div>
          )}

          {/* Recovery Progress */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="recovery-progress">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Recovery Progress</h3>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(data.recoveryPct, 100)}%`, backgroundColor: data.recoveryPct >= 100 ? "#059669" : data.recoveryPct > 50 ? "#F59E0B" : "#DC2626" }} />
            </div>
            <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
              <span>₹{fmtCompact(data.amountReceived)} received</span>
              <span>{data.recoveryPct}%</span>
              <span>₹{fmtCompact(data.totalExpected)} total</span>
            </div>
          </div>

          {/* Repayment History */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="repayment-history">
            <div className="p-4 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Repayment History ({data.repaymentCount})</h3>
            </div>

            <div className="grid grid-cols-12 gap-1 px-4 py-2 text-xs font-semibold" style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)" }}>
              <span className="col-span-3">Date</span>
              <span className="col-span-3 text-right">Amount</span>
              <span className="col-span-3 text-right">Outstanding</span>
              <span className="col-span-3 text-right">Notes</span>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {(data.repayments || []).map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 px-4 py-2.5 items-center text-xs" style={{ borderBottom: "1px solid var(--border-light)" }} data-testid={`repayment-row-${i}`}>
                  <span className="col-span-3" style={{ color: "var(--text-secondary)" }}>{formatDate(row.transactionDate)}</span>
                  <span className="col-span-3 text-right font-semibold" style={{ color: "#059669" }}>+₹{fmtCompact(row.amount)}</span>
                  <span className="col-span-3 text-right" style={{ color: "var(--text-secondary)" }}>₹{fmtCompact(row.outstandingAfter)}</span>
                  <span className="col-span-3 text-right truncate" style={{ color: "var(--text-muted)" }}>{row.notes || "-"}</span>
                </div>
              ))}
              {(!data.repayments || data.repayments.length === 0) && (
                <div className="p-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>No repayments yet</div>
              )}
            </div>
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Notes</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{data.notes}</p>
            </div>
          )}

          {/* Add Repayment Button */}
          {data.loanStatus !== "closed" && (
            <button
              onClick={() => setShowRepayment(true)}
              className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#059669", color: "#fff" }}
              data-testid="add-repayment-btn"
            >
              <Plus className="h-4 w-4" /> Add Repayment
            </button>
          )}
        </div>

        {/* Repayment Modal */}
        {showRepayment && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
            <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6" style={{ backgroundColor: "var(--bg-card)" }} data-testid="repayment-modal">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add Repayment</h3>
                <button onClick={() => setShowRepayment(false)} className="p-1 rounded-full" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <X className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Repayment Amount</label>
                  <input
                    type="number"
                    value={repayAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val > (data.outstandingAmount || 0)) {
                        setRepayAmount(String(data.outstandingAmount));
                      } else {
                        setRepayAmount(e.target.value);
                      }
                    }}
                    placeholder="Enter amount"
                    max={data.outstandingAmount || 0}
                    className="w-full px-4 py-3 rounded-xl text-base font-medium"
                    style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                    data-testid="repayment-amount-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Notes (optional)</label>
                  <input
                    type="text"
                    value={repayNotes}
                    onChange={(e) => setRepayNotes(e.target.value)}
                    placeholder="e.g., Bank transfer"
                    className="w-full px-4 py-3 rounded-xl text-base font-medium"
                    style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                    data-testid="repayment-notes-input"
                  />
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Outstanding: ₹{fmt(data.outstandingAmount)} | Received so far: ₹{fmt(data.amountReceived)}
                </p>
                <button
                  onClick={handleRepayment}
                  disabled={submitting || !repayAmount}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: "#059669" }}
                  data-testid="submit-repayment"
                >
                  {submitting ? "Processing..." : "Record Repayment"}
                </button>
              </div>
            </div>
          </div>
        )}

        <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
        <BottomNav onAddClick={() => setShowAddSheet(true)} />
      </div>
    );
  }

  // ======== REGULAR INVESTMENT DETAIL VIEW ========
  const m = data.metrics;
  const perf = PERF_STYLES[m.performanceTag] || PERF_STYLES["N/A"];
  const PerfIcon = perf.icon;

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="investment-detail-page">
      {/* Header */}
      <header className="px-5 pt-6 pb-6" style={{ background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}CC 100%)` }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate("/my-investments")} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button onClick={() => navigate(`/investment/${id}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium" data-testid="edit-investment-btn">
            <Edit3 className="h-4 w-4" /> Edit
          </button>
        </div>

        <div className="mb-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{data.category}</p>
          <h1 className="text-2xl font-bold text-white" data-testid="investment-name">{data.name}</h1>
          {data.mode && <p className="text-white/70 text-sm mt-1">{data.mode}</p>}
        </div>

        {/* Value Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-white/60 text-xs mb-0.5">Current Value</p>
              <p className="text-2xl font-bold text-white" data-testid="current-value">₹{fmt(data.currentValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs mb-0.5">Invested</p>
              <p className="text-lg font-semibold text-white/80">₹{fmtCompact(data.principal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${m.gainLoss >= 0 ? "bg-green-500/20" : "bg-red-500/20"}`}>
              {m.gainLoss >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-300" /> : <TrendingDown className="h-3.5 w-3.5 text-red-300" />}
              <span className={`text-sm font-bold ${m.gainLoss >= 0 ? "text-green-300" : "text-red-300"}`}>
                {m.gainLoss >= 0 ? "+" : ""}₹{fmtCompact(m.gainLoss)} ({m.gainLossPct}%)
              </span>
            </div>
            <span className="px-3 py-1.5 rounded-full bg-white/15 text-white/80 text-xs font-semibold flex items-center gap-1" data-testid="performance-tag">
              <PerfIcon className="h-3 w-3" /> {m.performanceTag}
            </span>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-3 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3" data-testid="investment-metrics">
          {[
            { label: "CAGR", value: `${m.cagr}%`, sub: `${m.yearsHeld} years held`, icon: BarChart3, color: "#8B5CF6" },
            { label: data.sipAmount ? "Monthly SIP" : "Invested", value: data.sipAmount ? `₹${fmt(data.sipAmount)}` : `₹${fmtCompact(data.principal)}`, sub: data.frequency || "Lump Sum", icon: Calendar, color: "#F59E0B" },
            { label: "Expected Return", value: `${data.expectedReturn}%`, sub: "per annum", icon: Target, color: "#059669" },
            { label: "Duration", value: `${m.daysHeld}d`, sub: `Since ${formatDate(data.startDate)}`, icon: Clock, color: "#3B82F6" },
          ].map((item, i) => {
            const I = item.icon;
            return (
              <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <I className="h-4 w-4 mb-2" style={{ color: item.color }} />
                <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</p>
                {item.sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.sub}</p>}
              </div>
            );
          })}
        </div>

        {/* Projected Growth */}
        {data.projections && Object.keys(data.projections).length > 0 && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="projected-growth">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Zap className="h-4 w-4" style={{ color: "#F59E0B" }} /> Projected Growth
              <span className="text-xs font-normal ml-auto" style={{ color: "var(--text-muted)" }}>@{data.expectedReturn}% p.a.</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(data.projections).map(([period, value]) => (
                <div key={period} className="text-center rounded-xl py-3 px-1" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{period}</p>
                  <p className="text-sm font-bold" style={{ color: "#059669" }}>₹{fmtCompact(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Status */}
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: perf.bg, border: `1px solid ${perf.color}30` }} data-testid="performance-status">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${perf.color}20` }}>
            <PerfIcon className="h-6 w-6" style={{ color: perf.color }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: perf.color }}>{m.performanceTag}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {m.performanceTag === "Outperforming" && `CAGR of ${m.cagr}% beats expected ${data.expectedReturn}%`}
              {m.performanceTag === "On Track" && `CAGR of ${m.cagr}% is close to expected ${data.expectedReturn}%`}
              {m.performanceTag === "Underperforming" && `CAGR of ${m.cagr}% is below expected ${data.expectedReturn}%`}
              {m.performanceTag === "N/A" && `Not enough data to determine performance`}
            </p>
          </div>
        </div>

        {/* Investment Ledger */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="investment-ledger">
          <div className="p-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Transaction Ledger</h3>
            {data.totalLedgerEntries > 6 && (
              <button
                onClick={() => setExpandedLedger(!expandedLedger)}
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: "var(--brand-primary)" }}
                data-testid="toggle-ledger-btn"
              >
                {expandedLedger ? "Show Less" : `View All (${data.totalLedgerEntries})`}
                {expandedLedger ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-1 px-4 py-2 text-xs font-semibold" style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)" }}>
            <span className="col-span-3">Date</span>
            <span className="col-span-3 text-right">Amount</span>
            <span className="col-span-3 text-right">Value</span>
            <span className="col-span-3 text-right">Gain/Loss</span>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {ledgerToShow.map((row, i) => {
              const gl = row.gainLoss || 0;
              return (
                <div key={i} className="grid grid-cols-12 gap-1 px-4 py-2.5 items-center text-xs" style={{ borderBottom: "1px solid var(--border-light)" }} data-testid={`ledger-row-${i}`}>
                  <span className="col-span-3" style={{ color: "var(--text-secondary)" }}>{formatDate(row.date || row.transactionDate)}</span>
                  <span className="col-span-3 text-right font-medium" style={{ color: "var(--text-primary)" }}>₹{fmtCompact(row.contribution || row.amount)}</span>
                  <span className="col-span-3 text-right" style={{ color: "var(--text-secondary)" }}>₹{fmtCompact(row.estimatedValue || row.amount)}</span>
                  <span className="col-span-3 text-right font-semibold" style={{ color: gl >= 0 ? "#059669" : "#EF4444" }}>
                    {gl >= 0 ? "+" : ""}₹{fmtCompact(gl)}
                  </span>
                </div>
              );
            })}
            {ledgerToShow.length === 0 && (
              <div className="p-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>No transactions yet</div>
            )}
          </div>
        </div>

        {/* Add Contribution Button */}
        <button
          onClick={() => setShowContribution(true)}
          className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-[0.98]"
          style={{ backgroundColor: catColor, color: "#fff" }}
          data-testid="add-contribution-btn"
        >
          <Plus className="h-4 w-4" /> Add Contribution
        </button>
      </div>

      {/* Contribution Modal */}
      {showContribution && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6" style={{ backgroundColor: "var(--bg-card)" }} data-testid="contribution-modal">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add Contribution</h3>
              <button onClick={() => setShowContribution(false)} className="p-1 rounded-full" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <X className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Amount</label>
                <input
                  type="number"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 rounded-xl text-base font-medium"
                  style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                  data-testid="contribution-amount-input"
                />
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Current invested: ₹{fmt(data.principal)} | Value: ₹{fmt(data.currentValue)}
              </p>
              <button
                onClick={handleContribution}
                disabled={submitting || !contribAmount}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: catColor }}
                data-testid="submit-contribution"
              >
                {submitting ? "Processing..." : "Add Contribution"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
}
