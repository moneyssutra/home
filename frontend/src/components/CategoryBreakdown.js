import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const CHART_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#14B8A6", "#6366F1", "#16A34A", "#0EA5E9", "#6B7280"];

const formatAmount = (amount) => {
  if (!amount) return "0";
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
  return new Intl.NumberFormat("en-IN").format(amount);
};

/**
 * Generic CategoryBreakdown component used by Asset, Loan, Investment, Expense, Insurance breakdown pages.
 *
 * Props:
 * - items: Array of raw data items
 * - typeConfig: Object mapping type slug -> { name, icon, color, bgColor }
 * - backPath: Route to navigate on back button click
 * - title: Page title
 * - summaryGradient: CSS gradient for summary card
 * - summaryLabel: Label for the total amount
 * - getTypeSlug: (item) => slug string
 * - getItemValue: (item) => number (primary value for grouping)
 * - getGroupMeta: (group) => { subtitle } for extra info under count
 * - emptyIcon: Lucide icon component for empty state
 * - emptyTitle: Title for empty state
 * - emptyColor: Color for empty state icon
 * - emptyBgColor: Background color for empty state icon container
 * - navigateTo: (typeSlug) => route string
 * - loading: Boolean
 * - extraSummary: Optional array of { label, value } for summary card extras
 */
const CategoryBreakdown = ({
  items = [],
  typeConfig = {},
  backPath,
  title,
  summaryGradient,
  summaryLabel,
  getTypeSlug,
  getItemValue,
  getGroupMeta,
  emptyIcon: EmptyIcon,
  emptyTitle = "No Data",
  emptyColor = "#6B7280",
  emptyBgColor = "#F3F4F6",
  navigateTo,
  loading = false,
  extraSummary = [],
}) => {
  const navigate = useNavigate();
  const defaultConfig = { name: "Other", icon: ChevronRight, color: "#6B7280", bgColor: "#F3F4F6" };

  const { totalValue, typeBreakdown } = useMemo(() => {
    const breakdown = {};
    let value = 0;

    items.forEach((item) => {
      const slug = getTypeSlug(item);
      const val = getItemValue(item) || 0;

      if (!breakdown[slug]) {
        breakdown[slug] = { typeSlug: slug, value: 0, count: 0, items: [] };
      }
      breakdown[slug].value += val;
      breakdown[slug].count += 1;
      breakdown[slug].items.push(item);
      value += val;
    });

    return {
      totalValue: value,
      typeBreakdown: Object.values(breakdown).sort((a, b) => b.value - a.value),
    };
  }, [items, getTypeSlug, getItemValue]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-base)" }}>
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(backPath)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            aria-label="Go back"
            data-testid="back-button"
          >
            <ChevronRight className="h-5 w-5 rotate-180" style={{ color: "var(--text-primary)" }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }} data-testid="breakdown-title">{title}</h1>
        </div>

        <div className="rounded-xl p-5 mb-4" style={{ background: summaryGradient }}>
          <p className="text-white/80 text-sm mb-1">{summaryLabel}</p>
          <h2 className="text-3xl font-bold text-white mb-3" data-testid="breakdown-total">
            {"\u20b9"} {formatAmount(totalValue)}
          </h2>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div>
              <span className="text-white/70">Total: </span>
              <span className="text-white font-semibold">{items.length}</span>
            </div>
            {extraSummary.map((s, i) => (
              <div key={i}>
                <span className="text-white/70">{s.label}: </span>
                <span className="text-white font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="px-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>By Category</h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : typeBreakdown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: emptyBgColor }}>
              <EmptyIcon className="h-10 w-10" style={{ color: emptyColor }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{emptyTitle}</h2>
          </div>
        ) : (
          <div className="space-y-3">
            {typeBreakdown.map((group, idx) => {
              const config = typeConfig[group.typeSlug] || defaultConfig;
              const Icon = config.icon;
              const percentage = totalValue > 0 ? (group.value / totalValue) * 100 : 0;
              const meta = getGroupMeta ? getGroupMeta(group) : null;

              return (
                <button
                  key={group.typeSlug}
                  onClick={() => navigate(navigateTo(group.typeSlug))}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                  data-testid={`category-${group.typeSlug}`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: config.bgColor }}>
                    <Icon className="h-6 w-6" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold" style={{ color: "var(--text-primary)" }}>{config.name}</h4>
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        {"\u20b9"}{formatAmount(group.value)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {group.count} {group.count === 1 ? "item" : "items"}
                        {meta?.subtitle ? ` ${meta.subtitle}` : ""}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default CategoryBreakdown;
