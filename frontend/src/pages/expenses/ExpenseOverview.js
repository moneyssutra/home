import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Zap, Lightbulb, ArrowRight, Wallet, ShoppingBag, PiggyBank } from "lucide-react";
import axios from "axios";
import ExpenseLayout, { THEME, fmt, fmtFull } from "./ExpenseLayout";

const API = process.env.REACT_APP_BACKEND_URL;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getMonthKey(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const GlassCard = ({ children, className = "", style = {}, onClick, testId }) => (
  <div
    onClick={onClick}
    className={`rounded-2xl p-4 transition-all ${onClick ? "cursor-pointer active:scale-[0.98]" : ""} ${className}`}
    style={{
      backgroundColor: THEME.card,
      border: `1px solid ${THEME.cardBorder}`,
      backdropFilter: "blur(12px)",
      ...style,
    }}
    data-testid={testId}
  >
    {children}
  </div>
);

const ProgressBar = ({ value, max, color, height = "h-2" }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`${height} rounded-full overflow-hidden`} style={{ backgroundColor: THEME.barTrack }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}CC)` }}
      />
    </div>
  );
};

export default function ExpenseOverview() {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentMonthKey = getMonthKey(monthOffset);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/expenses/monthly-summary`, {
          params: { last: 6 },
          withCredentials: true,
        });
        setSummaryData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentMonth = useMemo(() => {
    if (!summaryData?.months) return null;
    return summaryData.months.find((m) => m.month === currentMonthKey) || summaryData.months[summaryData.months.length - 1];
  }, [summaryData, currentMonthKey]);

  const prevMonth = useMemo(() => {
    if (!summaryData?.months) return null;
    const prevKey = getMonthKey(monthOffset - 1);
    return summaryData.months.find((m) => m.month === prevKey);
  }, [summaryData, monthOffset]);

  const [y, m] = currentMonthKey.split("-").map(Number);
  const monthLabel = `${FULL_MONTHS[m - 1]} ${y}`;

  if (loading) {
    return (
      <ExpenseLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: THEME.barTrack, borderTopColor: THEME.accent }} />
        </div>
      </ExpenseLayout>
    );
  }

  const changeVsPrev = prevMonth && prevMonth.total > 0
    ? ((currentMonth?.total || 0) - prevMonth.total) / prevMonth.total * 100
    : null;

  const breakdownItems = [
    { label: "Essential", amount: currentMonth?.essential || 0, color: THEME.essential, icon: Wallet, desc: "Housing, Food, Medical, EMI" },
    { label: "Lifestyle", amount: currentMonth?.lifestyle || 0, color: THEME.lifestyle, icon: ShoppingBag, desc: "Shopping, Travel, Subscriptions" },
    { label: "Wealth Building", amount: currentMonth?.wealth || 0, color: THEME.wealth, icon: PiggyBank, desc: "Investments, Savings" },
  ];

  const totalSpend = currentMonth?.total || 0;

  return (
    <ExpenseLayout>
      <div className="space-y-4">
        {/* Month Slider */}
        <div className="flex items-center justify-between" data-testid="month-slider">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${THEME.cardBorder}` }}
            data-testid="month-prev"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: THEME.textSecondary }} />
          </button>
          <span className="text-sm font-bold" style={{ color: THEME.textPrimary }}>
            {monthLabel}
          </span>
          <button
            onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
            disabled={monthOffset >= 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${THEME.cardBorder}` }}
            data-testid="month-next"
          >
            <ChevronRight className="h-4 w-4" style={{ color: THEME.textSecondary }} />
          </button>
        </div>

        {/* Monthly Summary Card */}
        <GlassCard testId="monthly-summary-card" style={{ background: `linear-gradient(135deg, rgba(99, 102, 241, 0.08), ${THEME.card})`, border: `1px solid rgba(99, 102, 241, 0.15)` }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.textMuted }}>
                Total Spent
              </p>
              <p className="text-3xl font-black mt-1" style={{ color: THEME.textPrimary }}>
                {fmtFull(totalSpend)}
              </p>
            </div>
            {changeVsPrev !== null && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: changeVsPrev > 0 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                  color: changeVsPrev > 0 ? "#EF4444" : "#10B981",
                }}
                data-testid="month-change"
              >
                {changeVsPrev > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(changeVsPrev).toFixed(1)}%
              </div>
            )}
          </div>

          {/* % of income */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span style={{ color: THEME.textMuted }}>% of Income</span>
              <span className="font-bold" style={{ color: (currentMonth?.percentOfIncome || 0) > 80 ? "#EF4444" : THEME.textSecondary }}>
                {currentMonth?.percentOfIncome || 0}%
              </span>
            </div>
            <ProgressBar
              value={currentMonth?.percentOfIncome || 0}
              max={100}
              color={(currentMonth?.percentOfIncome || 0) > 80 ? "#EF4444" : (currentMonth?.percentOfIncome || 0) > 60 ? "#F59E0B" : "#10B981"}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
              <p className="text-[9px]" style={{ color: THEME.textMuted }}>Income</p>
              <p className="text-xs font-bold" style={{ color: "#10B981" }}>{fmt(currentMonth?.incomeTotal || 0)}</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
              <p className="text-[9px]" style={{ color: THEME.textMuted }}>Savings</p>
              <p className="text-xs font-bold" style={{ color: THEME.accent }}>
                {fmt(Math.max(0, (currentMonth?.incomeTotal || 0) - totalSpend))}
              </p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
              <p className="text-[9px]" style={{ color: THEME.textMuted }}>Avg/Day</p>
              <p className="text-xs font-bold" style={{ color: THEME.textPrimary }}>
                {fmt(totalSpend / 30)}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Expense Breakdown */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: THEME.textMuted }}>
            Expense Breakdown
          </h3>
          <div className="space-y-2.5">
            {breakdownItems.map((item) => {
              const Icon = item.icon;
              const pct = totalSpend > 0 ? ((item.amount / totalSpend) * 100).toFixed(1) : 0;
              return (
                <GlassCard
                  key={item.label}
                  testId={`breakdown-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                  onClick={() => navigate("/wealth/expenses/monthly")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}25` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ color: THEME.textPrimary }}>{item.label}</span>
                        <span className="text-sm font-bold" style={{ color: item.color }}>{fmtFull(item.amount)}</span>
                      </div>
                      <p className="text-[10px]" style={{ color: THEME.textMuted }}>{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <ProgressBar value={item.amount} max={totalSpend} color={item.color} height="h-1.5" />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: item.color }}>{pct}%</span>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Top Categories */}
        {currentMonth?.topCategories?.length > 0 && (
          <GlassCard testId="top-categories">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: THEME.textMuted }}>
              Top Categories
            </h3>
            <div className="space-y-2">
              {currentMonth.topCategories.map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold w-4 text-center" style={{ color: THEME.textMuted }}>{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: THEME.textPrimary }}>{cat.category}</span>
                      <span className="text-xs font-bold" style={{ color: THEME.textSecondary }}>{fmtFull(cat.amount)}</span>
                    </div>
                    <ProgressBar value={cat.amount} max={currentMonth.topCategories[0].amount} color={THEME.accent} height="h-1" />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Spending Insights */}
        {summaryData?.insights?.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: THEME.textMuted }}>
              Spending Insights
            </h3>
            <div className="space-y-2">
              {summaryData.insights.map((insight, i) => (
                <GlassCard key={i} testId={`insight-${i}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(251, 191, 36, 0.1)" }}>
                      <Lightbulb className="h-4 w-4" style={{ color: "#FBBF24" }} />
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: THEME.textSecondary }}>{insight}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Smart Action */}
        <GlassCard
          testId="smart-action"
          onClick={() => navigate("/wealth/expenses/daily")}
          style={{ background: `linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))`, border: `1px solid rgba(99, 102, 241, 0.2)` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: THEME.textPrimary }}>Explore Daily Patterns</p>
              <p className="text-[10px]" style={{ color: THEME.textMuted }}>See your calendar heatmap and daily breakdown</p>
            </div>
            <ArrowRight className="h-4 w-4" style={{ color: "#818CF8" }} />
          </div>
        </GlassCard>
      </div>
    </ExpenseLayout>
  );
}
