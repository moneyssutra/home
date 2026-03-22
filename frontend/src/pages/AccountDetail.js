import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, Landmark, TrendingUp, TrendingDown, DollarSign, ArrowDownLeft, ArrowUpRight, Link2, Loader2, BookOpen } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { toast } from "sonner";
import API_BASE from '../utils/apiConfig';

const backendUrl = API_BASE;
const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n || 0));
const fmtCompact = (n) => { const a = Math.abs(n || 0); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return Math.round(n || 0).toString(); };

const formatDate = (d) => { if (!d) return ""; try { const dt = new Date(d); if (isNaN(dt.getTime())) return d; return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };

const TYPE_COLORS = { "Savings": "#059669", "Current": "#3B82F6", "Salary": "#8B5CF6", "Fixed Deposit": "#F59E0B", "NRE": "#EC4899", "NRO": "#F97316" };

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); fetchDetail(); }, [id]);
  const fetchDetail = async () => {
    setLoading(true);
    try { const r = await axios.get(`${backendUrl}/api/accounts/${id}/detail`, { withCredentials: true }); setData(r.data); }
    catch { toast.error("Failed to load account details"); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>;
  if (!data) return <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "var(--bg-app)" }}><p style={{ color: "var(--text-muted)" }}>Account not found</p></div>;

  const m = data.metrics || {};
  const color = TYPE_COLORS[data.accountType] || "#3B82F6";
  const flowPositive = m.netMonthlyFlow >= 0;

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="account-detail-page">
      <header className="px-5 pt-6 pb-6" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)` }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button"><ArrowLeft className="h-5 w-5" /></button>
          <button onClick={() => navigate(`/account/${id}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium" data-testid="edit-account-btn"><Edit3 className="h-4 w-4" /> Edit</button>
        </div>
        <div className="mb-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{data.accountType?.toLowerCase() === 'bank account' ? 'Bank Account' : `${data.accountType} Account`}</p>
          <h1 className="text-2xl font-bold text-white" data-testid="account-name">{data.accountName}</h1>
          {data.bankName && <p className="text-white/70 text-sm mt-1">{data.bankName}</p>}
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex justify-between items-end mb-3">
            <div><p className="text-white/60 text-xs mb-0.5">Current Balance</p><p className="text-2xl font-bold text-white" data-testid="balance">₹{fmt(data.currentBalance)}</p></div>
            <div className="text-right"><p className="text-white/60 text-xs mb-0.5">Opening</p><p className="text-lg font-semibold text-white/80">₹{fmtCompact(data.openingBalance)}</p></div>
          </div>
          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full ${m.balanceChange >= 0 ? "bg-green-500/20" : "bg-red-500/20"}`}>
            {m.balanceChange >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-300" /> : <TrendingDown className="h-3.5 w-3.5 text-red-300" />}
            <span className={`text-sm font-bold ${m.balanceChange >= 0 ? "text-green-300" : "text-red-300"}`}>
              {m.balanceChange >= 0 ? "+" : ""}₹{fmtCompact(m.balanceChange)} ({m.balanceChangePct}%)
            </span>
          </div>
        </div>
      </header>

      <div className="px-5 mt-4 space-y-4">
        {/* Monthly Flow */}
        <div className="grid grid-cols-3 gap-3" data-testid="account-flow">
          <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: "#05966910" }}>
            <ArrowDownLeft className="h-4 w-4 mx-auto mb-1" style={{ color: "#059669" }} />
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Inflow</p>
            <p className="text-sm font-bold" style={{ color: "#059669" }}>₹{fmtCompact(m.totalMonthlyInflow)}</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: "#EF444410" }}>
            <ArrowUpRight className="h-4 w-4 mx-auto mb-1" style={{ color: "#EF4444" }} />
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Outflow</p>
            <p className="text-sm font-bold" style={{ color: "#EF4444" }}>₹{fmtCompact(m.totalMonthlyOutflow)}</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: flowPositive ? "#05966910" : "#EF444410" }}>
            <DollarSign className="h-4 w-4 mx-auto mb-1" style={{ color: flowPositive ? "#059669" : "#EF4444" }} />
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Net</p>
            <p className="text-sm font-bold" style={{ color: flowPositive ? "#059669" : "#EF4444" }}>{flowPositive ? "+" : ""}₹{fmtCompact(m.netMonthlyFlow)}</p>
          </div>
        </div>

        {/* Transaction Ledger */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="account-ledger">
          <div className="p-4 pb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Transaction Ledger</h3>
          </div>
          {(data.ledger && data.ledger.length > 0) ? (
            <div className="max-h-[350px] overflow-y-auto">
              {data.ledger.map((entry, i) => (
                <div key={i} className="px-4 py-2.5 flex justify-between items-center text-xs" style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{entry.description}</p>
                    <p style={{ color: "var(--text-muted)" }}>{formatDate(entry.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold" style={{ color: entry.type === "credit" || entry.type === "opening" ? "#059669" : "#EF4444" }}>
                      {entry.type === "debit" ? "-" : entry.type === "credit" ? "+" : ""}₹{fmt(entry.amount)}
                    </p>
                    {entry.balance !== null && <p style={{ color: "var(--text-muted)" }}>Bal: ₹{fmt(entry.balance)}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No transactions recorded yet</p>
            </div>
          )}
        </div>

        {/* Linked Entities */}
        {(data.linkedIncome?.length > 0 || data.linkedExpenses?.length > 0 || data.linkedLoans?.length > 0 || data.linkedInvestments?.length > 0) && (
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="linked-entities">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Link2 className="h-4 w-4" style={{ color: "var(--brand-primary)" }} /> Linked Entities</h3>

            {data.linkedIncome?.map((inc, i) => (
              <button key={i} onClick={() => navigate(`/wealth/income/${inc.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "#05966910" }}>
                <div><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{inc.name}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>Income</p></div>
                <span className="text-sm font-bold" style={{ color: "#059669" }}>+₹{fmt(inc.expectedAmount)}</span>
              </button>
            ))}

            {data.linkedLoans?.map((loan, i) => (
              <button key={i} onClick={() => navigate(`/wealth/loans/${loan.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "#EF444410" }}>
                <div><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{loan.loanName}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>Loan EMI</p></div>
                <span className="text-sm font-bold" style={{ color: "#EF4444" }}>-₹{fmt(loan.emiAmount)}</span>
              </button>
            ))}

            {data.linkedInvestments?.map((inv, i) => (
              <button key={i} onClick={() => navigate(`/wealth/investments/${inv.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "#8B5CF610" }}>
                <div><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{inv.name}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>Investment</p></div>
                <span className="text-sm font-bold" style={{ color: "#8B5CF6" }}>₹{fmtCompact(inv.currentValue)}</span>
              </button>
            ))}

            {data.linkedExpenses?.map((exp, i) => (
              <button key={i} onClick={() => navigate(`/wealth/expenses/${exp.id}`)} className="w-full flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: "#F59E0B10" }}>
                <div><p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{exp.expenseName}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>Expense</p></div>
                <span className="text-sm font-bold" style={{ color: "#F59E0B" }}>-₹{fmt(exp.expectedAmount)}</span>
              </button>
            ))}
          </div>
        )}

        {data.accountNumber && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Account Details</p>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--text-muted)" }}>Account Number</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>•••• {String(data.accountNumber).slice(-4)}</span>
            </div>
            {data.ifscCode && <div className="flex justify-between text-xs mt-1">
              <span style={{ color: "var(--text-muted)" }}>IFSC</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{data.ifscCode}</span>
            </div>}
          </div>
        )}
      </div>
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
}
