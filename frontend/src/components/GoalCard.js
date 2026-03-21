import { Target, TrendingUp, AlertTriangle, Flame, ChevronRight } from "lucide-react";

const GoalCard = ({ goal, onClick }) => {
  const progress = Math.min(
    ((goal.currentAmount || 0) / (goal.targetAmount || 1)) * 100,
    100
  );
  const remaining = (goal.targetAmount || 0) - (goal.currentAmount || 0);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const getColor = () => {
    if (progress >= 70) return "var(--status-success)";
    if (progress >= 30) return "var(--status-warning)";
    return "var(--status-error)";
  };

  const getStatus = () => {
    if (progress >= 70) return { icon: Flame, text: "Near Goal", color: "var(--status-success)" };
    if (progress >= 30) return { icon: TrendingUp, text: "On Track", color: "var(--status-warning)" };
    return { icon: AlertTriangle, text: "Behind", color: "var(--status-error)" };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const formatAmount = (amt) => {
    if (amt >= 10000000) return `${(amt / 10000000).toFixed(1)}Cr`;
    if (amt >= 100000) return `${(amt / 100000).toFixed(1)}L`;
    if (amt >= 1000) return `${(amt / 1000).toFixed(1)}K`;
    return amt.toLocaleString("en-IN");
  };

  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-4 w-[240px] min-w-[240px] flex-shrink-0 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        backgroundColor: "var(--bg-card)",
        border: `1px solid var(--border-light)`,
      }}
      data-testid={`goal-card-${goal.id}`}
    >
      <h3 className="text-sm font-bold truncate mb-3" style={{ color: "var(--text-primary)" }}>
        {goal.goalName || goal.name}
      </h3>

      <div className="relative flex items-center justify-center mb-3">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r={radius} stroke="var(--border-light)" strokeWidth="6" fill="none" />
          <circle
            cx="42" cy="42" r={radius}
            stroke={getColor()}
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <span className="absolute text-base font-black" style={{ color: "var(--text-primary)" }}>
          {progress.toFixed(0)}%
        </span>
      </div>

      <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
        <span style={{ color: getColor() }}>{formatAmount(goal.currentAmount || 0)}</span>
        <span style={{ color: "var(--text-muted)" }}> / {formatAmount(goal.targetAmount || 0)}</span>
      </p>

      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
        {formatAmount(remaining)} left
      </p>

      {goal.targetDate && (
        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          Target: {new Date(goal.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
        </p>
      )}

      <div className="flex items-center gap-1 mt-2">
        <StatusIcon className="h-3 w-3" style={{ color: status.color }} />
        <span className="text-[10px] font-bold" style={{ color: status.color }}>{status.text}</span>
      </div>
    </div>
  );
};

export default GoalCard;
