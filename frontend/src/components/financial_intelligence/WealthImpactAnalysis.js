import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ChevronUp, ChevronDown, TrendingUp, Shield, Target,
  Landmark, Smile, Frown, AlertTriangle, Award, ArrowRight
} from "lucide-react";
import API_BASE from '../../utils/apiConfig';

const backendUrl = API_BASE;

const iconMap = {
  "trending-up": TrendingUp,
  "shield": Shield,
  "target": Target,
  "landmark": Landmark,
};

const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n));

const GradeRing = ({ grade, color }) => (
  <div className="relative w-20 h-20 flex items-center justify-center">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="34" fill="none" stroke="#E5E7EB" strokeWidth="5" />
      <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${Math.PI * 68}`}
        strokeDashoffset={`${Math.PI * 68 * 0.15}`}
        strokeLinecap="round" transform="rotate(-90 40 40)" />
    </svg>
    <span className="text-2xl font-black" style={{ color }}>{grade}</span>
  </div>
);

const AllocationBar = ({ label, pct, target, color }) => {
  const isOver = pct > target;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-16 font-semibold text-gray-600 capitalize">{label}</span>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
        <div className="absolute top-0 h-full w-px bg-gray-400"
          style={{ left: `${target}%` }} />
      </div>
      <span className={`w-12 text-right font-bold ${isOver ? "text-red-500" : "text-gray-700"}`}>
        {pct}%
      </span>
    </div>
  );
};

const WealthImpactAnalysis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [regretVotes, setRegretVotes] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/expenses/wealth-impact?tz_offset=${new Date().getTimezoneOffset()}`, { withCredentials: true });
      setData(res.data);
      const votes = {};
      (res.data.lifestyleOver5k || []).forEach((e) => {
        if (e.regret === true) votes[e.id] = "regret";
        else if (e.regret === false) votes[e.id] = "happy";
      });
      setRegretVotes(votes);
    } catch (err) {
      console.error("Wealth impact fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRegretVote = async (expenseId, isRegret) => {
    try {
      await axios.patch(`${backendUrl}/api/expenses/${expenseId}/regret`,
        { regret: isRegret }, { withCredentials: true });
      setRegretVotes((prev) => ({ ...prev, [expenseId]: isRegret ? "regret" : "happy" }));
      fetchData();
    } catch (err) {
      console.error("Regret flag error:", err);
    }
  };

  if (loading || !data) return null;

  const { wealthGrade, allocation, lifestyleOver5k, regretExpenses, totalRegret, opportunitySwaps } = data;

  return (
    <div className="mt-6 mb-4" data-testid="wealth-impact-section">
      {/* Collapsed trigger */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all"
        style={{
          backgroundColor: expanded ? "#F0FDF9" : "white",
          borderColor: expanded ? "#99F6E4" : "#E5E7EB",
        }}
        data-testid="wealth-impact-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: wealthGrade.color + "18" }}>
            <Award className="h-5 w-5" style={{ color: wealthGrade.color }} />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-gray-900">Wealth Impact Analysis</div>
            <div className="text-xs text-gray-500">
              Grade: <span className="font-black" style={{ color: wealthGrade.color }}>{wealthGrade.grade}</span>
              {totalRegret > 0 && (
                <span className="ml-2 text-red-500">Regret: ₹{fmt(totalRegret)}</span>
              )}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-4 animate-in slide-in-from-top-2 duration-200" data-testid="wealth-impact-expanded">
          {/* Wealth Grade Card */}
          <div className="rounded-2xl p-5 border border-gray-100 bg-white" data-testid="wealth-grade-card">
            <div className="flex items-start gap-5">
              <GradeRing grade={wealthGrade.grade} color={wealthGrade.color} />
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Wealth Grade</div>
                  <div className="text-sm text-gray-600 mt-1">Based on the 50/30/20 rule against your spending</div>
                </div>
                <AllocationBar label="Needs" pct={allocation.essential.pct} target={50} color="#3B82F6" />
                <AllocationBar label="Wants" pct={allocation.lifestyle.pct} target={30} color="#8B5CF6" />
                <AllocationBar label="Savings" pct={allocation.wealth.pct} target={20} color="#10B981" />
              </div>
            </div>
          </div>

          {/* Regret Check — Lifestyle > ₹5K */}
          {lifestyleOver5k.length > 0 && (
            <div className="rounded-2xl p-5 border border-gray-100 bg-white" data-testid="regret-check-card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-bold text-gray-900">Regret Check</span>
                <span className="text-xs text-gray-400 ml-auto">Wants over ₹5,000</span>
              </div>
              <div className="space-y-3">
                {lifestyleOver5k.map((exp) => (
                  <div key={exp.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{exp.name}</div>
                      <div className="text-xs text-gray-500">{exp.category} — ₹{fmt(exp.amount)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRegretVote(exp.id, false)}
                        className={`p-2 rounded-full transition-all ${regretVotes[exp.id] === "happy" ? "bg-green-100 ring-2 ring-green-400" : "bg-gray-100 hover:bg-green-50"}`}
                        data-testid={`regret-happy-${exp.id}`}
                        title="Worth it!"
                      >
                        <Smile className={`h-5 w-5 ${regretVotes[exp.id] === "happy" ? "text-green-600" : "text-gray-400"}`} />
                      </button>
                      <button
                        onClick={() => handleRegretVote(exp.id, true)}
                        className={`p-2 rounded-full transition-all ${regretVotes[exp.id] === "regret" ? "bg-red-100 ring-2 ring-red-400" : "bg-gray-100 hover:bg-red-50"}`}
                        data-testid={`regret-sad-${exp.id}`}
                        title="I regret this"
                      >
                        <Frown className={`h-5 w-5 ${regretVotes[exp.id] === "regret" ? "text-red-600" : "text-gray-400"}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opportunity Cost / Sutra Swap */}
          {opportunitySwaps.length > 0 && (
            <div className="rounded-2xl p-5 border border-gray-100 bg-white" data-testid="sutra-swap-card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-bold text-gray-900">Sutra Swap</span>
                <span className="text-xs text-gray-400 ml-auto">₹{fmt(totalRegret)} regret spend</span>
              </div>
              <div className="space-y-2">
                {opportunitySwaps.map((swap, i) => {
                  const SwapIcon = iconMap[swap.icon] || TrendingUp;
                  return (
                    <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-xl bg-teal-50/50">
                      <SwapIcon className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                      <span className="text-xs text-gray-700 leading-relaxed">{swap.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No regret yet message */}
          {regretExpenses.length === 0 && lifestyleOver5k.length > 0 && (
            <div className="text-center py-3 text-xs text-gray-400">
              <ArrowRight className="h-3 w-3 inline mr-1" />
              Tag expenses above as "Regret" to unlock Sutra Swap insights
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WealthImpactAnalysis;
