import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, DollarSign, Calendar, TrendingUp, Repeat, CheckCircle2, Clock, ChevronDown, ChevronUp, Link2, Loader2 } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import IncomeAmountModal from "@/components/IncomeAmountModal";
import { toast } from "sonner";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n || 0));
const fmtCompact = (n) => { const a = Math.abs(n || 0); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return Math.round(n || 0).toString(); };
const formatDate = (d) => { if (!d) return ""; try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

export default function IncomeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordingEntry, setRecordingEntry] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); fetchDetail(); }, [id]);
  const fetchDetail = async () => {
    setLoading(true);
    try { const r = await axios.get(`${backendUrl}/api/income/${id}/detail`, { withCredentials: true }); setData(r.data); }
    catch { toast.error("Failed to load income details"); }
    finally { setLoading(false); }
  };

  const handleRecordMissed = (entry) => {
    setRecordingEntry(entry);
    setRecordModalOpen(true);
  };

  const handleRecordSubmit = async ({ amount, transactionDate }) => {
    if (!data) return;
    try {
      await axios.post(`${backendUrl}/api/transactions/income-transactions`, {
        entityId: id,
        amount,
        transactionDate: transactionDate || (recordingEntry?.dueDate),
        notes: recordingEntry ? `Recorded for ${formatDate(recordingEntry.dueDate)}` : ""
      }, { withCredentials: true });
      setRecordModalOpen(false);
      setRecordingEntry(null);
      fetchDetail();
    } catch {
      toast.error("Failed to record income");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>;
  if (!data) return <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "var(--bg-app)" }}><p style={{ color: "var(--text-muted)" }}>Income source not found</p></div>;

  const summary = data.summary || {};
  const schedule = expandedSchedule ? (data.schedule || []) : (data.schedule || []).slice(-6);
  const typeColor = data.type === "Fixed" ? "#059669" : "#F59E0B";

const getEditRoute = (incomeType, id) => {
    const routes = {
      "Business": `/business-income/${id}`,
      "Job": `/job-income/${id}`,
      "Salary": `/job-income/${id}`,
      "Self-Employed": `/self-employed-income/${id}`,
      "Commission": `/commission-income/${id}`,
      "Interest": `/other-income/${id}`,
      "Other": `/other-income/${id}`,
    };
    return routes[incomeType] || `/other-income/${id}`;
  };

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="income-detail-page">
      <header className="px-5 pt-6 pb-6" style={{ background: `linear-gradient(135deg, ${typeColor} 0%, ${typeColor}CC 100%)` }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button"><ArrowLeft className="h-5 w-5" /></button>
          <button onClick={() => navigate(getEditRoute(data.type, id))} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium" data-testid="edit-income-btn"><Edit3 className="h-4 w-4" /> Edit</button>
        </div>
        <div className="mb-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{data.type} Income</p>
          <h1 className="text-2xl font-bold text-white" data-testid="income-name">{data.name}</h1>
          {data.source && <p className="text-white/70 text-sm mt-1">{data.source}</p>}
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex justify-between items-end">
            <div><p className="text-white/60 text-xs mb-0.5">Expected Amount</p><p className="text-2xl font-bold text-white" data-testid="expected-amount">₹{fmt(data.expectedAmount)}</p></div>
            <div className="text-right"><p className="text-white/60 text-xs mb-0.5">Frequency</p><p className="text-lg font-semibold text-white/80">{data.frequency}</p></div>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-3 space-y-4">
        <div className="grid grid-cols-2 gap-3" data-testid="income-metrics">
          {[
            { label: "Received (This Month)", value: `₹${fmtCompact(summary.totalReceived)}`, icon: DollarSign, color: "#059669" },
            { label: "Pending (This Month)", value: `₹${fmtCompact(summary.monthlyPending || 0)}`, icon: CheckCircle2, color: "#F59E0B" },
            { label: "Start Date", value: formatDate(data.startDate), icon: Calendar, color: "#3B82F6" },
            { label: "Type", value: data.type || "N/A", icon: Repeat, color: "#8B5CF6" },
          ].map((m, i) => { const I = m.icon; return (
            <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <I className="h-4 w-4 mb-2" style={{ color: m.color }} /><p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{m.label}</p>
              <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{m.value}</p>
            </div>
          ); })}
        </div>

        {/* Receipt Schedule */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="receipt-schedule">
          <div className="p-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Receipt Schedule</h3>
            {(data.schedule || []).length > 6 && <button onClick={() => setExpandedSchedule(!expandedSchedule)} className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--brand-primary)" }}>
              {expandedSchedule ? "Less" : "View All"} {expandedSchedule ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>}
          </div>
          {schedule.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              {schedule.map((s, i) => {
                const prevStatus = i > 0 ? schedule[i - 1].status : null;
                const showDivider = prevStatus && prevStatus !== "upcoming" && s.status === "upcoming";
                const isActual = s.isActual;
                const isMissed = s.status === "missed";
                return (
                  <div key={i}>
                    {showDivider && (
                      <div className="px-4 py-1.5 flex items-center gap-2" style={{ backgroundColor: "var(--bg-app)" }}>
                        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-light)" }} />
                        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>UPCOMING</span>
                        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-light)" }} />
                      </div>
                    )}
                    <div className="px-4 py-2.5 flex justify-between items-center text-xs" style={{ borderBottom: "1px solid var(--border-light)", opacity: isMissed ? 0.7 : 1 }}>
                      <span style={{ color: isMissed ? "var(--text-muted)" : "var(--text-secondary)" }}>{formatDate(s.dueDate)}</span>
                      <div className="flex items-center gap-2">
                        <span className={isActual ? "font-bold" : ""} style={{ color: isActual ? "#059669" : isMissed ? "var(--text-muted)" : "var(--text-primary)" }}>₹{fmt(s.amount)}</span>
                        {s.status === "upcoming" ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#F59E0B15", color: "#F59E0B" }}>
                            <Clock className="h-3 w-3" /> Upcoming
                          </span>
                        ) : isActual ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#05966920", color: "#059669" }}>
                            <CheckCircle2 className="h-3 w-3" /> Recorded
                          </span>
                        ) : isMissed ? (
                          <button
                            data-testid={`record-missed-${i}`}
                            onClick={() => handleRecordMissed(s)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold cursor-pointer border-0"
                            style={{ backgroundColor: "#F59E0B20", color: "#F59E0B" }}
                          >
                            <Edit3 className="h-3 w-3" /> Record
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#05966915", color: "#059669" }}>
                            <CheckCircle2 className="h-3 w-3" /> Received
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No scheduled receipts yet. Add a start date and frequency to generate schedule.</p>
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="income-transactions">
          <div className="p-4 pb-2"><h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Transaction History</h3></div>
          {data.transactions && data.transactions.length > 0 ? (
            data.transactions.slice(0, 10).map((t, i) => (
              <div key={i} className="px-4 py-2.5 flex justify-between items-center text-xs" style={{ borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ color: "var(--text-secondary)" }}>{formatDate(t.transactionDate || t.date)}</span>
                <span className="font-bold" style={{ color: "#059669" }}>₹{fmt(t.amount)}</span>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No transactions recorded yet</p>
            </div>
          )}
        </div>

        {/* Linked Asset */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="linked-asset-section">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: "var(--text-primary)" }}><Link2 className="h-4 w-4" style={{ color: "var(--brand-primary)" }} /> Linked Asset</h3>
          {data.linkedAsset ? (
            <button onClick={() => navigate(`/wealth/assets/${data.linkedAsset.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "#14B8A610" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{data.linkedAsset.assetName}</span>
              <span className="text-sm font-bold" style={{ color: "#14B8A6" }}>₹{fmtCompact(data.linkedAsset.currentValue)}</span>
            </button>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No linked asset</p>
          )}
        </div>
      </div>
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      {recordModalOpen && data && (
        <IncomeAmountModal
          isOpen={recordModalOpen}
          onClose={() => { setRecordModalOpen(false); setRecordingEntry(null); }}
          entityId={data.source?.id || id}
          entityName={data.source?.name || "Income"}
          expectedAmount={data.source?.expectedAmount || 0}
          onSubmit={handleRecordSubmit}
        />
      )}
    </div>
  );
}
