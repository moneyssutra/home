import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, CreditCard, Plus, ChevronRight, Clock,
  TrendingDown, Loader2, Wallet, CheckCircle2, Wifi, AlertTriangle,
  Receipt, DollarSign, BarChart3, Banknote,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

const API = process.env.REACT_APP_BACKEND_URL;

const fmtFull = (n) => Math.abs(n).toLocaleString("en-IN");
const fmt = (n) => {
  const abs = Math.abs(n);
  if (abs >= 100000) return (n / 100000).toFixed(1) + "L";
  if (abs >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("en-IN");
};

// ---------- SVG Faceted Pattern ----------
const FacetedPattern = () => (
  <svg className="absolute left-0 top-0 h-full w-[45%] opacity-[0.07]" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice">
    <polygon points="100,10 180,80 160,180 40,180 20,80" fill="white" />
    <polygon points="100,10 180,80 100,120" fill="white" opacity="0.5" />
    <polygon points="100,10 20,80 100,120" fill="white" opacity="0.3" />
    <polygon points="20,80 40,180 100,120" fill="white" opacity="0.2" />
    <polygon points="180,80 160,180 100,120" fill="white" opacity="0.4" />
    <polygon points="40,180 160,180 100,120" fill="white" opacity="0.15" />
  </svg>
);

const NetworkBadge = ({ network }) => {
  if (network === "Mastercard") return <div className="flex items-center -space-x-1.5"><div className="w-5 h-5 rounded-full" style={{ background: "#EB001B", opacity: 0.9 }} /><div className="w-5 h-5 rounded-full" style={{ background: "#F79E1B", opacity: 0.9 }} /></div>;
  if (network === "RuPay") return <span className="text-[10px] font-black tracking-wider text-white/80">RuPay</span>;
  return <span className="text-sm font-black italic tracking-wider text-white/80">VISA</span>;
};

// ---------- SYNC NOTIFICATION ----------
const SyncNotification = ({ message, visible }) => (
  <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none" style={{ transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease", transform: visible ? "translateY(0)" : "translateY(-100%)", opacity: visible ? 1 : 0 }}>
    <div className="mt-3 mx-4 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg max-w-sm w-full" style={{ background: "linear-gradient(135deg, #065F46, #047857)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <CheckCircle2 size={18} className="text-emerald-300 flex-shrink-0" />
      <p className="text-sm font-semibold text-white flex-1">{message}</p>
    </div>
  </div>
);

// ---------- CREDIT CARD COMPONENT ----------
const CreditCardWidget = ({ card, isActive, onRefresh, refreshingId }) => {
  const isRefreshing = refreshingId === card.id;
  const utilizationColor = card.utilization > 75 ? "#EF4444" : card.utilization > 50 ? "#F59E0B" : "#10B981";

  return (
    <div
      data-testid={`cc-card-${card.id}`}
      className="flex-shrink-0 w-[310px] snap-center rounded-2xl transition-all duration-300 text-left relative overflow-hidden"
      style={{
        background: `linear-gradient(145deg, ${card.gradient[0]}, ${card.gradient[1]})`,
        transform: isActive ? "scale(1)" : "scale(0.93)",
        opacity: isActive ? 1 : 0.7,
        boxShadow: isActive ? `0 20px 40px -12px ${card.color}50, 0 8px 16px -4px rgba(0,0,0,0.15)` : "0 4px 12px rgba(0,0,0,0.08)",
        aspectRatio: "1.7/1",
      }}
    >
      <FacetedPattern />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.1) 0%, transparent 50%)" }} />

      <div className="relative z-10 h-full flex flex-col justify-between p-5">
        {/* Top: Logo + Name + Refresh */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-[8px] font-black tracking-wider" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
              {card.logo}
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight capitalize">{card.cardName}</p>
              <p className="text-[10px] text-white/45 font-medium">Credit Card</p>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onRefresh(card); }} data-testid={`cc-refresh-${card.id}`} className="w-7 h-7 rounded-md flex items-center justify-center transition-all active:scale-90" style={{ background: "rgba(255,255,255,0.1)" }}>
            <RefreshCw size={12} className={`text-white/60 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Middle: Chip + Number */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-7 rounded-[4px] relative" style={{ background: "linear-gradient(145deg, #D4A026, #C49B1D, #E8C84A)", boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.3)" }}>
            <div className="absolute inset-[2px] grid grid-cols-3 grid-rows-2 gap-[1px]">
              {[...Array(6)].map((_, i) => <div key={i} className="rounded-[1px]" style={{ background: "rgba(160,120,15,0.45)" }} />)}
            </div>
          </div>
          <Wifi size={15} className="text-white/25 rotate-90" />
          <p className="text-[11px] font-mono text-white/35 tracking-[3px]">**** **** ****</p>
        </div>

        {/* Bottom: Outstanding + Due + Network */}
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            {card.cardholder && <p className="text-[10px] font-bold text-white/50 tracking-[1.5px] mb-1 truncate">{card.cardholder}</p>}
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-white/35 mb-0.5">Outstanding</p>
            <p className="text-xl font-black text-white tracking-tight">₹{fmtFull(card.outstandingAmount)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
            <NetworkBadge network={card.network} />
            {card.dueInfo && (
              <span className="text-[8px] font-bold px-2 py-0.5 rounded-full tracking-wider" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                {card.dueInfo}
              </span>
            )}
            <div className="flex items-center gap-1">
              <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(card.utilization, 100)}%`, background: utilizationColor }} />
              </div>
              <p className="text-[8px] text-white/40 font-bold">{card.utilization}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- EMPTY STATE ----------
const EmptyState = ({ icon: Icon, title, subtitle, action, onAction }) => (
  <div className="px-5 flex flex-col items-center justify-center py-16 animate-fadeIn">
    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
      <Icon size={32} style={{ color: "var(--text-muted)" }} />
    </div>
    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{title}</p>
    <p className="text-sm mt-2 text-center max-w-[260px]" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
    {action && <button onClick={onAction} className="mt-5 px-5 py-2.5 rounded-full text-sm font-bold active:scale-95 transition-transform" style={{ backgroundColor: "var(--brand-primary)", color: "#fff" }}>{action}</button>}
  </div>
);

// ---------- CARDS TAB ----------
const CardsTab = ({ cards, summary, refreshing, onRefreshAll, onRefreshOne, refreshingId, navigate }) => {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / 326);
    setActiveIdx(Math.min(idx, cards.length - 1));
  }, [cards.length]);

  if (cards.length === 0) {
    return <EmptyState icon={CreditCard} title="No credit cards yet" subtitle="Add your credit cards to track outstanding, utilization, and due dates." action="Add Credit Card" onAction={() => navigate("/credit-card")} />;
  }

  const utilizationColor = summary.overallUtilization > 75 ? "#EF4444" : summary.overallUtilization > 50 ? "#F59E0B" : "#10B981";

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Summary */}
      <div className="px-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Total Outstanding</p>
          <p className="text-3xl font-black tracking-tight mt-1" style={{ color: "#EF4444" }}>₹{fmtFull(summary.totalOutstanding)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>of ₹{fmtFull(summary.totalLimit)} limit · {cards.length} card{cards.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={onRefreshAll} data-testid="refresh-cc-btn" className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
          <RefreshCw size={18} style={{ color: "var(--brand-primary)" }} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Horizontal Cards */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex gap-4 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }} data-testid="cc-card-scroll">
        {cards.map((card, i) => (
          <CreditCardWidget key={card.id} card={card} isActive={i === activeIdx} onRefresh={onRefreshOne} refreshingId={refreshingId} />
        ))}
      </div>

      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {cards.map((_, i) => <div key={i} className="rounded-full transition-all duration-300" style={{ width: i === activeIdx ? 20 : 6, height: 6, backgroundColor: i === activeIdx ? "var(--brand-primary)" : "var(--border-light)" }} />)}
        </div>
      )}

      {/* Utilization Bar */}
      <div className="px-5">
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Credit Utilization</p>
            <p className="text-sm font-black" style={{ color: utilizationColor }}>{summary.overallUtilization}%</p>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(summary.overallUtilization, 100)}%`, background: utilizationColor }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>₹{fmt(summary.totalOutstanding)} used</p>
            <p className="text-[10px] font-bold" style={{ color: "#10B981" }}>₹{fmt(summary.totalAvailable)} available</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5">
        <div className="rounded-2xl p-4 flex items-center justify-around" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          {[
            { icon: DollarSign, label: "Pay Bill", color: "#10B981" },
            { icon: Receipt, label: "Statements", color: "#3B82F6" },
            { icon: Plus, label: "Add Card", color: "#8B5CF6", route: "/credit-card" },
          ].map((a) => (
            <button key={a.label} onClick={() => a.route && navigate(a.route)} className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-active:scale-90" style={{ backgroundColor: `${a.color}10` }}>
                <a.icon size={20} style={{ color: a.color }} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* All Cards List */}
      <div className="px-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>All Cards</p>
        {cards.map((card) => {
          const uColor = card.utilization > 75 ? "#EF4444" : card.utilization > 50 ? "#F59E0B" : "#10B981";
          return (
            <div key={card.id} onClick={() => navigate(`/wealth/credit-cards/${card.id}`)} className="rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid={`cc-row-${card.id}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[9px] font-black tracking-wider text-white" style={{ background: `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})` }}>{card.logo}</div>
                <div>
                  <p className="text-sm font-bold capitalize" style={{ color: "var(--text-primary)" }}>{card.cardName}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {card.dueInfo || "Credit Card"} · <span style={{ color: uColor, fontWeight: 700 }}>{card.utilization}%</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: "#EF4444" }}>₹{fmtFull(card.outstandingAmount)}</p>
                  <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{card.lastUpdated}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onRefreshOne(card); }} data-testid={`cc-row-refresh-${card.id}`} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
                  <RefreshCw size={13} className={refreshingId === card.id ? "animate-spin" : ""} style={{ color: "var(--brand-primary)" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------- PAYMENTS TAB ----------
const PaymentsTab = ({ payments }) => {
  if (payments.length === 0) return <EmptyState icon={Receipt} title="No payments recorded" subtitle="Your credit card payment history will appear here." />;
  return (
    <div className="px-5 space-y-3 animate-fadeIn" data-testid="payments-tab">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Payment History</p>
      {payments.map((p) => (
        <div key={p.id} className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#10B98115" }}>
              <CheckCircle2 size={18} style={{ color: "#10B981" }} />
            </div>
            <div>
              <p className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>{p.cardName} Payment</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{p.paymentDate}</p>
            </div>
          </div>
          <p className="text-sm font-bold" style={{ color: "#10B981" }}>₹{fmtFull(p.amount)}</p>
        </div>
      ))}
    </div>
  );
};

// ---------- INSIGHTS TAB ----------
const InsightsTab = ({ cards, summary }) => {
  if (cards.length === 0) return <EmptyState icon={BarChart3} title="No insights yet" subtitle="Add credit cards to see spending insights and recommendations." />;
  const highUtil = cards.filter((c) => c.utilization > 50);
  const utilizationColor = summary.overallUtilization > 75 ? "#EF4444" : summary.overallUtilization > 50 ? "#F59E0B" : "#10B981";
  const utilizationLabel = summary.overallUtilization > 75 ? "High" : summary.overallUtilization > 50 ? "Moderate" : "Healthy";

  return (
    <div className="px-5 space-y-4 animate-fadeIn" data-testid="insights-tab">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Credit Health</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: `${utilizationColor}10`, border: `1px solid ${utilizationColor}25` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: utilizationColor }}>Utilization</p>
          <p className="text-2xl font-black mt-1" style={{ color: utilizationColor }}>{summary.overallUtilization}%</p>
          <p className="text-[10px] font-semibold mt-1" style={{ color: utilizationColor }}>{utilizationLabel}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "#3B82F610", border: "1px solid #3B82F625" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#3B82F6" }}>Available</p>
          <p className="text-2xl font-black mt-1" style={{ color: "#3B82F6" }}>₹{fmt(summary.totalAvailable)}</p>
          <p className="text-[10px] font-semibold mt-1" style={{ color: "#3B82F6" }}>{cards.length} card{cards.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {highUtil.length > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: "#F59E0B10", border: "1px solid #F59E0B25" }}>
          <AlertTriangle size={20} style={{ color: "#F59E0B" }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>High Utilization Alert</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {highUtil.map((c) => c.cardName).join(", ")} {highUtil.length === 1 ? "has" : "have"} utilization above 50%. Try to keep below 30% for a healthy credit score.
            </p>
          </div>
        </div>
      )}

      {cards.map((card) => (
        <div key={card.id} className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold capitalize" style={{ color: "var(--text-primary)" }}>{card.cardName}</p>
            <p className="text-xs font-bold" style={{ color: card.utilization > 50 ? "#EF4444" : "#10B981" }}>{card.utilization}%</p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(card.utilization, 100)}%`, background: card.utilization > 75 ? "#EF4444" : card.utilization > 50 ? "#F59E0B" : "#10B981" }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <span>₹{fmtFull(card.outstandingAmount)} / ₹{fmtFull(card.creditLimit)}</span>
            {card.dueInfo && <span className="font-bold">{card.dueInfo}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------- MAIN PAGE ----------
const TABS = ["Cards", "Payments", "Insights"];

const CreditCardsExperimental = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [syncNotif, setSyncNotif] = useState({ visible: false, message: "" });
  const [data, setData] = useState({ cards: [], payments: [], summary: {} });
  const tabBarRef = useRef(null);
  const notifTimer = useRef(null);

  const showSyncNotif = useCallback((msg) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setSyncNotif({ visible: true, message: msg });
    notifTimer.current = setTimeout(() => setSyncNotif((p) => ({ ...p, visible: false })), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/cc-overview`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error("CC overview fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefreshAll = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setTimeout(() => { setRefreshing(false); showSyncNotif("All cards refreshed · Data Synced"); }, 800));
  }, [fetchData, showSyncNotif]);

  const handleRefreshOne = useCallback((card) => {
    setRefreshingId(card.id);
    fetchData().finally(() => setTimeout(() => { setRefreshingId(null); showSyncNotif(`${card.cardName} refreshed · Data Synced`); }, 1200));
  }, [fetchData, showSyncNotif]);

  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const tab = el.children[activeTab];
    if (tab) tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="credit-cards-experimental">
      <SyncNotification message={syncNotif.message} visible={syncNotif.visible} />

      {/* Header */}
      <div className="sticky top-0 z-30 px-5 pt-3 pb-2" style={{ backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/home"); }} className="w-9 h-9 rounded-lg flex items-center justify-center active:scale-90 transition-transform" style={{ backgroundColor: "var(--bg-subtle)" }} data-testid="cc-back-btn">
            <ArrowLeft size={18} style={{ color: "var(--text-primary)" }} />
          </button>
          <div className="flex items-center gap-2">
            <CreditCard size={18} style={{ color: "var(--brand-primary)" }} />
            <h1 className="text-base font-black" style={{ color: "var(--text-primary)" }}>Credit Cards</h1>
          </div>
          <div className="w-9" />
        </div>
        <div ref={tabBarRef} className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1" style={{ scrollbarWidth: "none" }} data-testid="cc-tab-bar">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)} data-testid={`cc-tab-${tab.toLowerCase()}`} className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all" style={{ backgroundColor: activeTab === i ? "var(--brand-primary)" : "transparent", color: activeTab === i ? "#fff" : "var(--text-muted)" }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin" style={{ color: "var(--brand-primary)" }} /></div>
        ) : (
          <>
            {activeTab === 0 && <CardsTab cards={data.cards} summary={data.summary || {}} refreshing={refreshing} onRefreshAll={handleRefreshAll} onRefreshOne={handleRefreshOne} refreshingId={refreshingId} navigate={navigate} />}
            {activeTab === 1 && <PaymentsTab payments={data.payments || []} />}
            {activeTab === 2 && <InsightsTab cards={data.cards} summary={data.summary || {}} />}
          </>
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .snap-x { scroll-snap-type: x mandatory; }
        .snap-center { scroll-snap-align: center; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.35s ease-out; }
      `}</style>

      <BottomNav />
    </div>
  );
};

export default CreditCardsExperimental;
