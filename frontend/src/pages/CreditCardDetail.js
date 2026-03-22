import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, CreditCard, Plus, Percent, Calendar, DollarSign, AlertTriangle, Shield, Loader2, X } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { toast } from "sonner";
import API_BASE from '../utils/apiConfig';

const backendUrl = API_BASE;
const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n || 0));

export default function CreditCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); fetchDetail(); }, [id]);
  const fetchDetail = async () => {
    setLoading(true);
    try { const r = await axios.get(`${backendUrl}/api/credit-cards/${id}/detail`, { withCredentials: true }); setData(r.data); }
    catch { toast.error("Failed to load card details"); }
    finally { setLoading(false); }
  };

  const handlePayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setSubmitting(true);
    try {
      await axios.post(`${backendUrl}/api/credit-cards/${id}/record-payment`, { amount: amt }, { withCredentials: true });
      toast.success(`Payment of ₹${fmt(amt)} recorded!`);
      setShowPayment(false); setPayAmount(""); fetchDetail();
    } catch { toast.error("Failed to record payment"); }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>;
  if (!data) return <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "var(--bg-app)" }}><p style={{ color: "var(--text-muted)" }}>Card not found</p></div>;

  const utilColor = data.utilization > 75 ? "#EF4444" : data.utilization > 50 ? "#F59E0B" : "#059669";
  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="credit-card-detail-page">
      <header className="px-5 pt-6 pb-6" style={{ background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)" }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button"><ArrowLeft className="h-5 w-5" /></button>
          <button onClick={() => navigate(`/credit-card/${id}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium" data-testid="edit-card-btn"><Edit3 className="h-4 w-4" /> Edit</button>
        </div>
        <div className="mb-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{data.cardNetwork || "Credit Card"}</p>
          <h1 className="text-2xl font-bold text-white" data-testid="card-name">{data.cardName}</h1>
          {data.bankName && <p className="text-white/70 text-sm mt-1">{data.bankName}</p>}
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex justify-between items-end mb-3">
            <div><p className="text-white/60 text-xs mb-0.5">Outstanding</p><p className="text-2xl font-bold text-white" data-testid="outstanding">₹{fmt(data.outstandingAmount)}</p></div>
            <div className="text-right"><p className="text-white/60 text-xs mb-0.5">Credit Limit</p><p className="text-lg font-semibold text-white/80">₹{fmt(data.creditLimit)}</p></div>
          </div>
          <div className="h-2.5 bg-white/15 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(data.utilization, 100)}%`, backgroundColor: utilColor }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-white/50 text-xs">Available: ₹{fmt(data.availableCredit)}</span>
            <span className="text-white/70 text-xs font-semibold" style={{ color: utilColor }}>{data.utilization}% used</span>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-3 space-y-4">
        <div className="grid grid-cols-2 gap-3" data-testid="card-metrics">
          {[
            { label: "APR", value: `${data.interestRate || 0}%`, icon: Percent, color: "#EF4444" },
            { label: "Monthly Interest", value: `₹${fmt(data.monthlyInterest)}`, icon: DollarSign, color: "#F59E0B" },
            { label: "Billing Date", value: data.billingDate || "N/A", icon: Calendar, color: "#3B82F6" },
            { label: "Due Date", value: data.dueDate || "N/A", icon: Calendar, color: "#8B5CF6" },
          ].map((m, i) => { const I = m.icon; return (
            <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <I className="h-4 w-4 mb-2" style={{ color: m.color }} /><p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{m.label}</p>
              <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{m.value}</p>
            </div>
          ); })}
        </div>

        {/* Utilization Warning */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: `${utilColor}15`, border: `1px solid ${utilColor}40` }}>
          <div className="flex items-center gap-2">
            {data.utilization > 50 ? <AlertTriangle className="h-4 w-4" style={{ color: utilColor }} /> : <Shield className="h-4 w-4" style={{ color: utilColor }} />}
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              {data.utilization > 75 ? "High utilization! Impacts credit score." : data.utilization > 50 ? "Moderate utilization. Try to keep below 30%." : "Healthy utilization. Keep it up!"}
            </span>
          </div>
          {data.monthsToPayoff > 0 && data.monthsToPayoff < 999 && (
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              At minimum payment, it will take ~{data.monthsToPayoff} months to pay off
            </p>
          )}
        </div>

        {/* Payment History */}
        {data.payments && data.payments.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="payment-history">
            <div className="p-4 pb-2"><h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Payment History</h3></div>
            {data.payments.slice(0, 5).map((p, i) => {
              let dateStr = "N/A";
              try { const d = new Date(p.paymentDate); if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { /* skip */ }
              return (
                <div key={i} className="px-4 py-2.5 flex justify-between items-center text-xs" style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{dateStr}</span>
                  <span className="font-bold" style={{ color: "#059669" }}>₹{fmt(p.amount)}</span>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => setShowPayment(true)} className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold text-sm" style={{ backgroundColor: "#059669", color: "#fff" }} data-testid="record-payment-btn">
          <Plus className="h-4 w-4" /> Record Payment
        </button>
      </div>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6" style={{ backgroundColor: "var(--bg-card)" }} data-testid="payment-modal">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Record Payment</h3>
              <button onClick={() => setShowPayment(false)} className="p-1 rounded-full" style={{ backgroundColor: "var(--bg-subtle)" }}><X className="h-5 w-5" style={{ color: "var(--text-muted)" }} /></button>
            </div>
            <div className="space-y-4">
              <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Enter amount" className="w-full px-4 py-3 rounded-xl text-base font-medium" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} data-testid="payment-amount-input" />
              <div className="flex gap-2">
                <button onClick={() => setPayAmount(String(data.minimumDue || 0))} className="flex-1 py-2 rounded-xl text-xs font-medium" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)", border: "1px solid var(--border-light)" }}>Min Due: ₹{fmt(data.minimumDue)}</button>
                <button onClick={() => setPayAmount(String(data.outstandingAmount || 0))} className="flex-1 py-2 rounded-xl text-xs font-medium" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)", border: "1px solid var(--border-light)" }}>Full: ₹{fmt(data.outstandingAmount)}</button>
              </div>
              <button onClick={handlePayment} disabled={submitting || !payAmount} className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: "#059669" }} data-testid="submit-payment">
                {submitting ? "Processing..." : "Record Payment"}
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
