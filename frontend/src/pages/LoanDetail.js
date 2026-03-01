import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Edit3, Plus, TrendingDown, Calendar, DollarSign,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock,
  XCircle, Shield, Percent, Info, Loader2, X
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
  return n.toFixed(0);
};

const formatDate = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return d; }
};

const STATUS_STYLES = {
  paid: { bg: "#05966915", color: "#059669", icon: CheckCircle2, label: "Paid" },
  pending: { bg: "#F59E0B15", color: "#F59E0B", icon: Clock, label: "Pending" },
  missed: { bg: "#EF444415", color: "#EF4444", icon: XCircle, label: "Missed" },
};

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [amortization, setAmortization] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showExtraPayment, setShowExtraPayment] = useState(false);
  const [extraAmount, setExtraAmount] = useState("");
  const [extraMode, setExtraMode] = useState("reduce_tenure");
  const [submitting, setSubmitting] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState(false);
  const [markingEmi, setMarkingEmi] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [loanRes, amortRes, insightRes] = await Promise.all([
        axios.get(`${backendUrl}/api/loans/${id}`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/loans/${id}/amortization`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/loans/${id}/insights`, { withCredentials: true }),
      ]);
      setLoan(loanRes.data);
      setAmortization(amortRes.data);
      setInsights(insightRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load loan details");
    } finally {
      setLoading(false);
    }
  };

  const handleExtraPayment = async () => {
    const amt = parseFloat(extraAmount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      await axios.post(`${backendUrl}/api/loans/${id}/extra-payment`, {
        amount: amt, mode: extraMode
      }, { withCredentials: true });
      toast.success(`Extra payment of ₹${fmt(amt)} applied!`);
      setShowExtraPayment(false);
      setExtraAmount("");
      fetchAll();
    } catch { toast.error("Failed to process payment"); }
    setSubmitting(false);
  };

  const handleMarkEmi = async (emiNo, dueDate) => {
    setMarkingEmi(emiNo);
    try {
      await axios.post(`${backendUrl}/api/loans/${id}/mark-emi`, {
        emiNo, paidDate: dueDate
      }, { withCredentials: true });
      toast.success(`EMI #${emiNo} marked as paid`);
      fetchAll();
    } catch { toast.error("Failed to mark EMI"); }
    setMarkingEmi(null);
  };

  const progress = useMemo(() => {
    if (!loan) return 0;
    const paid = loan.principalAmount - loan.outstandingAmount;
    return Math.min(100, (paid / loan.principalAmount) * 100);
  }, [loan]);

  const scheduleToShow = useMemo(() => {
    if (!amortization?.schedule) return [];
    if (expandedSchedule) return amortization.schedule;
    // Show first 3 paid, all missed, and next 3 pending
    const paid = amortization.schedule.filter(s => s.status === "paid").slice(-3);
    const missed = amortization.schedule.filter(s => s.status === "missed");
    const pending = amortization.schedule.filter(s => s.status === "pending").slice(0, 3);
    return [...paid, ...missed, ...pending];
  }, [amortization, expandedSchedule]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "var(--bg-app)" }}>
        <p style={{ color: "var(--text-muted)" }}>Loan not found</p>
        <button onClick={() => navigate("/my-loans")} className="mt-4 text-sm font-medium" style={{ color: "var(--brand-primary)" }}>Go Back</button>
      </div>
    );
  }

  const summary = amortization?.summary || {};

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="loan-detail-page">
      {/* Header */}
      <header className="px-5 pt-6 pb-6" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate("/my-loans")} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button onClick={() => navigate(`/loan/${id}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium" data-testid="edit-loan-btn">
            <Edit3 className="h-4 w-4" /> Edit
          </button>
        </div>

        <div className="mb-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{loan.loanType || "Loan"}</p>
          <h1 className="text-2xl font-bold text-white" data-testid="loan-name">{loan.loanName}</h1>
          {loan.lenderName && <p className="text-white/70 text-sm mt-1">{loan.lenderName}</p>}
        </div>

        {/* Progress */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-white/60 text-xs mb-0.5">Outstanding</p>
              <p className="text-2xl font-bold text-white" data-testid="outstanding-amount">₹{fmt(loan.outstandingAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs mb-0.5">Original</p>
              <p className="text-lg font-semibold text-white/80">₹{fmtCompact(loan.principalAmount)}</p>
            </div>
          </div>
          <div className="h-2.5 bg-white/15 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: "#fff" }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-white/50 text-xs">₹{fmtCompact(loan.principalAmount - loan.outstandingAmount)} paid</span>
            <span className="text-white/70 text-xs font-semibold">{progress.toFixed(1)}%</span>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-3 space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3" data-testid="loan-metrics">
          {[
            { label: "EMI Amount", value: `₹${fmt(loan.emiAmount)}`, sub: loan.emiFrequency, icon: DollarSign, color: "#3B82F6" },
            { label: "Interest Rate", value: `${loan.interestRate}%`, sub: "per annum", icon: Percent, color: "#8B5CF6" },
            { label: "Tenure", value: `${loan.tenureMonths || "N/A"} mo`, sub: `${summary.remainingEMIs || 0} remaining`, icon: Calendar, color: "#F59E0B" },
            { label: "Start Date", value: formatDate(loan.startDate), sub: loan.endDate ? `End: ${formatDate(loan.endDate)}` : "", icon: Calendar, color: "#059669" },
          ].map((m, i) => {
            const I = m.icon;
            return (
              <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <I className="h-4 w-4 mb-2" style={{ color: m.color }} />
                <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{m.label}</p>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{m.value}</p>
                {m.sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{m.sub}</p>}
              </div>
            );
          })}
        </div>

        {/* EMI Summary Bar */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="emi-summary">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>EMI Progress</h3>
          <div className="flex gap-3">
            {[
              { count: summary.paidEMIs, label: "Paid", color: "#059669" },
              { count: summary.missedEMIs, label: "Missed", color: "#EF4444" },
              { count: summary.pendingEMIs, label: "Pending", color: "#F59E0B" },
            ].map((s, i) => (
              <div key={i} className="flex-1 text-center rounded-xl py-3" style={{ backgroundColor: `${s.color}10` }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.count || 0}</p>
                <p className="text-xs font-medium" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* EMI Ledger Table */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="emi-ledger">
          <div className="p-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>EMI Ledger</h3>
            <button
              onClick={() => setExpandedSchedule(!expandedSchedule)}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: "var(--brand-primary)" }}
              data-testid="toggle-schedule-btn"
            >
              {expandedSchedule ? "Show Less" : `View All (${summary.totalEMIs})`}
              {expandedSchedule ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-1 px-4 py-2 text-xs font-semibold" style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)" }}>
            <span className="col-span-1">#</span>
            <span className="col-span-3">Due Date</span>
            <span className="col-span-2 text-right">Principal</span>
            <span className="col-span-2 text-right">Interest</span>
            <span className="col-span-2 text-right">Balance</span>
            <span className="col-span-2 text-center">Status</span>
          </div>

          {/* Table Body */}
          <div className="max-h-[400px] overflow-y-auto">
            {scheduleToShow.map((row) => {
              const st = STATUS_STYLES[row.status] || STATUS_STYLES.pending;
              const StIcon = st.icon;
              return (
                <div
                  key={row.emiNo}
                  className="grid grid-cols-12 gap-1 px-4 py-2.5 items-center text-xs"
                  style={{ borderBottom: "1px solid var(--border-light)" }}
                  data-testid={`emi-row-${row.emiNo}`}
                >
                  <span className="col-span-1 font-semibold" style={{ color: "var(--text-secondary)" }}>{row.emiNo}</span>
                  <span className="col-span-3" style={{ color: "var(--text-secondary)" }}>{formatDate(row.dueDate)}</span>
                  <span className="col-span-2 text-right font-medium" style={{ color: "var(--text-primary)" }}>₹{fmtCompact(row.principalComponent)}</span>
                  <span className="col-span-2 text-right" style={{ color: "var(--text-muted)" }}>₹{fmtCompact(row.interestComponent)}</span>
                  <span className="col-span-2 text-right text-xs" style={{ color: "var(--text-secondary)" }}>₹{fmtCompact(row.outstandingAfter)}</span>
                  <div className="col-span-2 flex justify-center">
                    {row.status === "missed" || row.status === "pending" ? (
                      <button
                        onClick={() => handleMarkEmi(row.emiNo, row.dueDate)}
                        disabled={markingEmi === row.emiNo}
                        className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                        style={{ backgroundColor: st.bg, color: st.color }}
                        data-testid={`mark-emi-${row.emiNo}`}
                      >
                        {markingEmi === row.emiNo ? <Loader2 className="h-3 w-3 animate-spin" /> : <StIcon className="h-3 w-3" />}
                        {st.label}
                      </button>
                    ) : (
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1" style={{ backgroundColor: st.bg, color: st.color }}>
                        <StIcon className="h-3 w-3" /> {st.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Extra Payment Button */}
        <button
          onClick={() => setShowExtraPayment(true)}
          className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#059669", color: "#fff" }}
          data-testid="extra-payment-btn"
        >
          <Plus className="h-4 w-4" /> Add Extra Principal Payment
        </button>

        {/* Loan Insights */}
        {insights && (
          <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="loan-insights">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Info className="h-4 w-4" style={{ color: "var(--brand-primary)" }} /> Loan Insights
            </h3>

            <div className="space-y-3">
              {/* Interest Payable */}
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Total Interest Payable</span>
                <span className="text-sm font-bold" style={{ color: "#EF4444" }}>₹{fmt(insights.totalInterestPayable)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Interest Paid So Far</span>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>₹{fmt(insights.interestPaid)}</span>
              </div>
              {insights.interestSaved > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Interest Saved (Extra Payments)</span>
                  <span className="text-sm font-bold" style={{ color: "#059669" }}>₹{fmt(insights.interestSaved)}</span>
                </div>
              )}

              {/* EMI to Income */}
              <div className="rounded-xl p-3 mt-2" style={{ backgroundColor: insights.emiToIncomePercent > 40 ? "#EF444410" : insights.emiToIncomePercent > 25 ? "#F59E0B10" : "#05966910" }}>
                <div className="flex items-center gap-2 mb-1">
                  {insights.emiToIncomePercent > 40 ? (
                    <AlertTriangle className="h-4 w-4" style={{ color: "#EF4444" }} />
                  ) : (
                    <Shield className="h-4 w-4" style={{ color: insights.emiToIncomePercent > 25 ? "#F59E0B" : "#059669" }} />
                  )}
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    This loan consumes {insights.emiToIncomePercent}% of your income
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden mt-2" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(insights.emiToIncomePercent, 100)}%`,
                    backgroundColor: insights.emiToIncomePercent > 40 ? "#EF4444" : insights.emiToIncomePercent > 25 ? "#F59E0B" : "#059669"
                  }} />
                </div>
              </div>

              {/* Safety Impact */}
              <div className="rounded-xl p-3" style={{ backgroundColor: "#3B82F610" }}>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" style={{ color: "#3B82F6" }} />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    A missed EMI reduces your safety by <strong style={{ color: "#3B82F6" }}>{insights.safetyImpactDays} days</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extra Payment Modal */}
      {showExtraPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6" style={{ backgroundColor: "var(--bg-card)" }} data-testid="extra-payment-modal">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Extra Principal Payment</h3>
              <button onClick={() => setShowExtraPayment(false)} className="p-1 rounded-full" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <X className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Amount</label>
                <input
                  type="number"
                  value={extraAmount}
                  onChange={(e) => setExtraAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 rounded-xl text-base font-medium"
                  style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                  data-testid="extra-amount-input"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>Impact Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExtraMode("reduce_tenure")}
                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: extraMode === "reduce_tenure" ? "#059669" : "var(--bg-subtle)",
                      color: extraMode === "reduce_tenure" ? "#fff" : "var(--text-secondary)",
                      border: `1px solid ${extraMode === "reduce_tenure" ? "#059669" : "var(--border-light)"}`
                    }}
                    data-testid="mode-reduce-tenure"
                  >
                    Reduce Tenure
                  </button>
                  <button
                    onClick={() => setExtraMode("reduce_emi")}
                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: extraMode === "reduce_emi" ? "#3B82F6" : "var(--bg-subtle)",
                      color: extraMode === "reduce_emi" ? "#fff" : "var(--text-secondary)",
                      border: `1px solid ${extraMode === "reduce_emi" ? "#3B82F6" : "var(--border-light)"}`
                    }}
                    data-testid="mode-reduce-emi"
                  >
                    Reduce EMI
                  </button>
                </div>
              </div>

              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Current outstanding: ₹{fmt(loan.outstandingAmount)}
              </p>

              <button
                onClick={handleExtraPayment}
                disabled={submitting || !extraAmount}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: "#059669" }}
                data-testid="submit-extra-payment"
              >
                {submitting ? "Processing..." : "Apply Payment"}
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
