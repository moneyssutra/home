import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, Shield, Calendar, DollarSign, Heart, ChevronDown, ChevronUp, CheckCircle2, Clock, Loader2 } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { toast } from "sonner";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n || 0));
const fmtCompact = (n) => { const a = Math.abs(n || 0); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return Math.round(n || 0).toString(); };
const formatDate = (d) => { if (!d) return ""; try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

export default function InsuranceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); fetchDetail(); }, [id]);
  const fetchDetail = async () => {
    setLoading(true);
    try { const r = await axios.get(`${backendUrl}/api/insurances/${id}/detail`, { withCredentials: true }); setData(r.data); }
    catch { toast.error("Failed to load insurance details"); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>;
  if (!data) return <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "var(--bg-app)" }}><p style={{ color: "var(--text-muted)" }}>Insurance not found</p></div>;

  const summary = data.summary || {};
  const schedule = expandedSchedule ? (data.schedule || []) : (data.schedule || []).slice(-6);
  const typeColor = data.insuranceType === "Health" ? "#059669" : data.insuranceType === "Life" ? "#3B82F6" : "#8B5CF6";

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="insurance-detail-page">
      <header className="px-5 pb-6" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top, 1.5rem))", background: `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}CC 100%)` }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button"><ArrowLeft className="h-5 w-5" /></button>
          <button onClick={() => navigate(`/insurance/${id}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium" data-testid="edit-insurance-btn"><Edit3 className="h-4 w-4" /> Edit</button>
        </div>
        <div className="mb-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{data.insuranceType} Insurance</p>
          <h1 className="text-2xl font-bold text-white" data-testid="policy-name">{data.policyName}</h1>
          {data.providerName && <p className="text-white/70 text-sm mt-1">{data.providerName}</p>}
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex justify-between items-end">
            <div><p className="text-white/60 text-xs mb-0.5">Coverage</p><p className="text-2xl font-bold text-white" data-testid="coverage">₹{fmtCompact(data.coverageAmount)}</p></div>
            <div className="text-right"><p className="text-white/60 text-xs mb-0.5">Premium</p><p className="text-lg font-semibold text-white/80">₹{fmt(data.premiumAmount)}/{data.premiumFrequency}</p></div>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-3 space-y-4">
        <div className="grid grid-cols-2 gap-3" data-testid="insurance-metrics">
          {[
            { label: "Start Date", value: formatDate(data.startDate), icon: Calendar, color: "#059669" },
            { label: "End Date", value: data.endDate ? formatDate(data.endDate) : "Ongoing", icon: Calendar, color: "#EF4444" },
            { label: "Total Paid", value: `₹${fmtCompact(summary.totalAmountPaid)}`, icon: DollarSign, color: "#F59E0B" },
            { label: "Coverage Ratio", value: `${summary.coverageToPremiaPaidRatio || 0}x`, icon: Shield, color: "#8B5CF6" },
          ].map((m, i) => { const I = m.icon; return (
            <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <I className="h-4 w-4 mb-2" style={{ color: m.color }} /><p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{m.label}</p>
              <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{m.value}</p>
            </div>
          ); })}
        </div>

        {/* Premium Progress */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Premium Status</h3>
          <div className="flex gap-3">
            <div className="flex-1 text-center rounded-xl py-3" style={{ backgroundColor: "#05966910" }}>
              <p className="text-xl font-bold" style={{ color: "#059669" }}>{summary.totalPremiumsPaid || 0}</p><p className="text-xs font-medium" style={{ color: "#059669" }}>Paid</p>
            </div>
            <div className="flex-1 text-center rounded-xl py-3" style={{ backgroundColor: "#F59E0B10" }}>
              <p className="text-xl font-bold" style={{ color: "#F59E0B" }}>{summary.totalPremiumsUpcoming || 0}</p><p className="text-xs font-medium" style={{ color: "#F59E0B" }}>Upcoming</p>
            </div>
          </div>
        </div>

        {/* Premium Schedule */}
        {schedule.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="premium-schedule">
            <div className="p-4 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Premium Schedule</h3>
              {data.totalScheduleEntries > 6 && <button onClick={() => setExpandedSchedule(!expandedSchedule)} className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--brand-primary)" }}>
                {expandedSchedule ? "Show Less" : `View All (${data.totalScheduleEntries})`}
                {expandedSchedule ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {schedule.map((s, i) => (
                <div key={i} className="px-4 py-2.5 flex justify-between items-center text-xs" style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <span className="font-medium" style={{ color: "var(--text-secondary)" }}>#{s.premiumNo} — {formatDate(s.dueDate)}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: "var(--text-primary)" }}>₹{fmt(s.amount)}</span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: s.status === "paid" ? "#05966915" : "#F59E0B15", color: s.status === "paid" ? "#059669" : "#F59E0B" }}>
                      {s.status === "paid" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />} {s.status === "paid" ? "Paid" : "Upcoming"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.premiumToIncomePercent > 0 && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#3B82F610", border: "1px solid #3B82F630" }}>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" style={{ color: "#3B82F6" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                This insurance costs <strong style={{ color: "#3B82F6" }}>{summary.premiumToIncomePercent}%</strong> of your monthly income
              </span>
            </div>
          </div>
        )}
      </div>
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
}
