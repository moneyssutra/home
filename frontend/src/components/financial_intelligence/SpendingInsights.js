import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { TrendingUp, AlertTriangle, Scale, Wallet, Activity } from "lucide-react";
import API_BASE from '../../utils/apiConfig';

const backendUrl = API_BASE;

const ruleIcons = {
  A: TrendingUp,
  B: Wallet,
  C: Scale,
  D: AlertTriangle,
  E: Activity,
};

const severityConfig = {
  high: {
    gradient: "linear-gradient(135deg, #FF6B6B 0%, #EE5A24 100%)",
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.18)",
    barColor: "#EF4444",
  },
  medium: {
    gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.18)",
    barColor: "#F59E0B",
  },
  low: {
    gradient: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    bg: "rgba(59, 130, 246, 0.08)",
    border: "rgba(59, 130, 246, 0.18)",
    barColor: "#3B82F6",
  },
};

const InsightCard = ({ insight, index, onClick }) => {
  const config = severityConfig[insight.severity] || severityConfig.medium;
  const Icon = ruleIcons[insight.rule] || TrendingUp;
  const [barWidth, setBarWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), index * 120);
    const t2 = setTimeout(() => setBarWidth(insight.value), index * 120 + 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [index, insight.value]);

  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all duration-200 active:scale-[0.98] hover:shadow-lg"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease, box-shadow 0.2s ease",
      }}
      data-testid={`insight-card-${insight.id}`}
    >
      <div
        className="rounded-2xl p-4 backdrop-blur-sm"
        style={{
          backgroundColor: config.bg,
          border: `1px solid ${config.border}`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: config.gradient }}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
              {insight.title}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {insight.subtitle}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${barWidth}%`,
              background: config.gradient,
            }}
          />
        </div>
      </div>
    </button>
  );
};

const SpendingInsights = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchInsights = useCallback(async () => {
    try {
      const tz = new Date().getTimezoneOffset();
      const res = await axios.get(
        `${backendUrl}/api/expenses/spending-insights?tz_offset=${tz}`,
        { withCredentials: true }
      );
      setData(res.data);
    } catch (err) {
      console.error("Spending insights fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const handleClick = (insight) => {
    const cat = insight.category;
    navigate(`/my-expenses?tab=monthly&category=${encodeURIComponent(cat)}`);
  };

  if (loading || !data || !data.insights || data.insights.length === 0) return null;

  return (
    <div className="mt-6 mb-4" data-testid="spending-insights-section">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Spending Insights
        </h3>
        {data.totalInsights > 3 && (
          <span className="text-xs text-gray-400">
            +{data.totalInsights - 3} more
          </span>
        )}
      </div>
      <div className="space-y-3">
        {data.insights.map((insight, i) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            index={i}
            onClick={() => handleClick(insight)}
          />
        ))}
      </div>
    </div>
  );
};

export default SpendingInsights;
