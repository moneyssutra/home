import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, TrendingUp, TrendingDown, Home, BarChart3, Landmark, Shield, Link2, Loader2 } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { toast } from "sonner";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n || 0));
const fmtCompact = (n) => { const a = Math.abs(n || 0); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return Math.round(n || 0).toString(); };
const formatDate = (d) => { if (!d) return ""; try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

const TYPE_COLORS = { "Real Estate": "#14B8A6", "Vehicle": "#3B82F6", "Gold & Jewellery": "#EAB308", "Electronics": "#8B5CF6", "Insurance Asset": "#EC4899" };

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); fetchDetail(); }, [id]);
  const fetchDetail = async () => {
    setLoading(true);
    try { const r = await axios.get(`${backendUrl}/api/assets/${id}/detail`, { withCredentials: true }); setData(r.data); }
    catch { toast.error("Failed to load asset details"); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>;
  if (!data) return <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "var(--bg-app)" }}><p style={{ color: "var(--text-muted)" }}>Asset not found</p></div>;

  const m = data.metrics || {};
  const color = TYPE_COLORS[data.assetType] || "#3B82F6";
  const isAppreciating = m.appreciation >= 0;

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="asset-detail-page">
      <header className="px-5 pt-6 pb-6" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)` }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button"><ArrowLeft className="h-5 w-5" /></button>
          <button onClick={() => navigate(`/asset/${id}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium" data-testid="edit-asset-btn"><Edit3 className="h-4 w-4" /> Edit</button>
        </div>
        <div className="mb-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{data.assetType}</p>
          <h1 className="text-2xl font-bold text-white" data-testid="asset-name">{data.assetName}</h1>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex justify-between items-start mb-3">
            <div><p className="text-white/60 text-xs mb-0.5">Current Value</p><p className="text-2xl font-bold text-white" data-testid="current-value">₹{fmtCompact(data.currentValue)}</p></div>
            <div className="text-right"><p className="text-white/60 text-xs mb-0.5">Purchase Value</p><p className="text-lg font-semibold text-white/80">₹{fmtCompact(data.purchaseValue)}</p></div>
          </div>
          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full ${isAppreciating ? "bg-green-500/20" : "bg-red-500/20"}`}>
            {isAppreciating ? <TrendingUp className="h-3.5 w-3.5 text-green-300" /> : <TrendingDown className="h-3.5 w-3.5 text-red-300" />}
            <span className={`text-sm font-bold ${isAppreciating ? "text-green-300" : "text-red-300"}`}>
              {isAppreciating ? "+" : ""}₹{fmtCompact(m.appreciation)} ({m.appreciationPct}%)
            </span>
          </div>
        </div>
      </header>

      <div className="px-5 -mt-3 space-y-4">
        <div className="grid grid-cols-2 gap-3" data-testid="asset-metrics">
          {[
            { label: "CAGR", value: `${m.cagr}%`, sub: `${m.yearsHeld} years`, icon: BarChart3, color: "#8B5CF6" },
            { label: "Net Equity", value: `₹${fmtCompact(m.netEquity)}`, sub: data.linkedLoan ? "After loan" : "No loan", icon: Landmark, color: "#059669" },
            { label: "Purchased", value: formatDate(data.purchaseDate), icon: Home, color: "#F59E0B" },
            { label: "Location", value: data.location || "N/A", icon: Home, color: "#3B82F6" },
          ].map((item, i) => { const I = item.icon; return (
            <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <I className="h-4 w-4 mb-2" style={{ color: item.color }} /><p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{item.label}</p>
              <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</p>
              {item.sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.sub}</p>}
            </div>
          ); })}
        </div>

        {/* Linked Entities */}
        {(data.linkedLoan || data.linkedInsurance || data.linkedIncome) && (
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="linked-entities">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Link2 className="h-4 w-4" style={{ color: "var(--brand-primary)" }} /> Linked Entities</h3>
            {data.linkedLoan && (
              <button onClick={() => navigate(`/wealth/loans/${data.linkedLoan.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl text-left" style={{ backgroundColor: "#EF444410" }}>
                <div><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{data.linkedLoan.loanName}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>Linked Loan</p></div>
                <span className="text-sm font-bold" style={{ color: "#EF4444" }}>₹{fmtCompact(data.linkedLoan.outstandingAmount)}</span>
              </button>
            )}
            {data.linkedInsurance && (
              <button onClick={() => navigate(`/wealth/insurance/${data.linkedInsurance.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl text-left" style={{ backgroundColor: "#3B82F610" }}>
                <div><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{data.linkedInsurance.policyName}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>Linked Insurance</p></div>
                <span className="text-sm font-bold" style={{ color: "#3B82F6" }}>₹{fmtCompact(data.linkedInsurance.coverageAmount)}</span>
              </button>
            )}
            {data.linkedIncome && (
              <button onClick={() => navigate(`/wealth/income/${data.linkedIncome.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl text-left" style={{ backgroundColor: "#05966910" }}>
                <div><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{data.linkedIncome.name}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>Rental Income</p></div>
                <span className="text-sm font-bold" style={{ color: "#059669" }}>₹{fmt(data.linkedIncome.expectedAmount)}/mo</span>
              </button>
            )}
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
