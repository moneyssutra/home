import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ChevronLeft, 
  Target, 
  TrendingUp, 
  CreditCard, 
  PiggyBank, 
  Wallet,
  Clock,
  CheckCircle2,
  Edit3,
  AlertCircle,
  Calendar,
  Link2,
  Landmark,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import axios from "axios";
import { useMilestoneNotification, MilestoneProgress } from "@/components/MilestoneNotification";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const GoalDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  
  // Milestone notification hook
  const { checkMilestones } = useMilestoneNotification(id, backendUrl);

  useEffect(() => {
    fetchGoal();
  }, [id]);

  // Check milestones after goal data is loaded
  useEffect(() => {
    if (goal && !goal.isCompleted) {
      checkMilestones();
    }
  }, [goal?.id, goal?.progressPercent]);

  const fetchGoal = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/goals/${id}`);
      setGoal(response.data);
    } catch (error) {
      console.error("Error fetching goal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    setIsCompleting(true);
    setShowCompleteConfirm(false);
    try {
      await axios.patch(`${backendUrl}/api/goals/${id}/complete`);
      // Check for 100% milestone celebration
      await checkMilestones();
      await fetchGoal();
    } catch (error) {
      console.error("Error marking goal complete:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  const getGoalIcon = (goalType) => {
    switch (goalType) {
      case "Wealth Creation":
        return TrendingUp;
      case "Debt Elimination":
        return CreditCard;
      case "Investment Target":
        return Target;
      case "Emergency Fund":
        return PiggyBank;
      default:
        return Wallet;
    }
  };

  const getGoalColor = (goalType) => {
    switch (goalType) {
      case "Wealth Creation":
        return { bg: "from-emerald-500 to-green-600", icon: "bg-emerald-500/20 text-emerald-400" };
      case "Debt Elimination":
        return { bg: "from-rose-500 to-red-600", icon: "bg-rose-500/20 text-rose-400" };
      case "Investment Target":
        return { bg: "from-violet-500 to-purple-600", icon: "bg-violet-500/20 text-violet-400" };
      case "Emergency Fund":
        return { bg: "from-amber-500 to-orange-600", icon: "bg-amber-500/20 text-amber-400" };
      default:
        return { bg: "from-blue-500 to-indigo-600", icon: "bg-blue-500/20 text-blue-400" };
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return "from-emerald-400 to-green-500";
    if (percent >= 75) return "from-green-400 to-emerald-500";
    if (percent >= 50) return "from-amber-400 to-yellow-500";
    if (percent >= 25) return "from-orange-400 to-amber-500";
    return "from-red-400 to-rose-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center">
        <div className="text-[#0B3D2E]/60">Loading...</div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#0B3D2E]/60 mb-4">Goal not found</p>
          <button
            onClick={() => navigate("/my-goals")}
            className="text-[#7C3AED] font-medium"
          >
            Go back to My Goals
          </button>
        </div>
      </div>
    );
  }

  const Icon = getGoalIcon(goal.goalType);
  const colors = getGoalColor(goal.goalType);
  const progress = goal.progressPercent || 0;
  const remaining = goal.targetAmount - (goal.calculatedAmount || 0);

  return (
    <div className="min-h-screen bg-[#F8FAF9] pb-24" data-testid="goal-detail-page">
      {/* Header */}
      <header className={`bg-gradient-to-br ${colors.bg} px-6 pt-8 pb-12 relative overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-40 h-40 rounded-full bg-white/20 blur-3xl" />
        </div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
              onClick={() => navigate("/my-goals")}
              data-testid="back-button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
              onClick={() => navigate(`/goal/${id}/edit`)}
              data-testid="edit-button"
            >
              <Edit3 className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <div className={`w-14 h-14 rounded-2xl ${colors.icon} flex items-center justify-center`}>
              <Icon className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white" data-testid="goal-name">
                  {goal.goalName}
                </h1>
                {goal.isCompleted && (
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                )}
              </div>
              <p className="text-white/70 text-sm">
                {goal.goalType === "Other" ? goal.customTypeName : goal.goalType}
              </p>
            </div>
          </div>

          {/* Progress Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10" data-testid="progress-section">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/60 text-sm mb-1">Current Progress</p>
                <h2 className="text-3xl font-bold text-white" data-testid="current-amount">
                  ₹ {formatAmount(goal.calculatedAmount || 0)}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-sm mb-1">Target</p>
                <h2 className="text-2xl font-bold text-white" data-testid="target-amount">
                  ₹ {formatAmount(goal.targetAmount)}
                </h2>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getProgressColor(progress)} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">
                {progress >= 100 ? "Goal Achieved!" : `₹ ${formatAmount(remaining)} to go`}
              </span>
              <span className="text-white font-bold text-lg" data-testid="progress-percent">
                {progress.toFixed(1)}%
              </span>
            </div>
            
            {/* Milestone Progress Badges */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/50 text-xs mb-2">Milestones</p>
              <MilestoneProgress 
                progress={progress} 
                reachedMilestones={goal.reachedMilestones || []} 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 -mt-4 space-y-4 relative z-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm" data-testid="target-date-card">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-[#7C3AED]" />
              <span className="text-xs text-[#0B3D2E]/50">Target Date</span>
            </div>
            <p className="text-lg font-semibold text-[#0B3D2E]">
              {new Date(goal.targetDate).toLocaleDateString('en-IN', { 
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm" data-testid="time-remaining-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-[#7C3AED]" />
              <span className="text-xs text-[#0B3D2E]/50">Time Remaining</span>
            </div>
            {goal.isCompleted ? (
              <p className="text-lg font-semibold text-emerald-600">Completed!</p>
            ) : goal.isOverdue ? (
              <p className="text-lg font-semibold text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {Math.abs(goal.daysRemaining)} days overdue
              </p>
            ) : (
              <p className="text-lg font-semibold text-[#0B3D2E]">
                {goal.daysRemaining} days left
              </p>
            )}
          </div>
        </div>

        {/* SIP Projections - Only show if there are SIP investments */}
        {goal.sipProjections && goal.sipProjections.length > 0 && (
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border border-emerald-200" data-testid="sip-projections-section">
            <h3 className="text-sm font-semibold text-emerald-800 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              SIP Projections at Target Date
            </h3>
            
            {/* Total Projection Summary */}
            <div className="bg-white/70 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#0B3D2E]/70">Projected Value from SIPs</span>
                <span className="text-lg font-bold text-emerald-600">
                  ₹ {formatAmount(goal.totalProjectedFromSIPs || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#0B3D2E]/70">Monthly SIP Contributions</span>
                <span className="text-sm font-semibold text-[#0B3D2E]">
                  ₹ {formatAmount(goal.totalMonthlySIPContribution || 0)}/month
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#0B3D2E]/70">Months to Target</span>
                <span className="text-sm font-semibold text-[#0B3D2E]">
                  {Math.round(goal.monthsToTarget || 0)} months
                </span>
              </div>
            </div>
            
            {/* Individual SIP Details */}
            <div className="space-y-2">
              {goal.sipProjections.map((sip, index) => (
                <div key={index} className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#0B3D2E]">{sip.investmentName}</span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                      {sip.frequency} SIP
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#0B3D2E]/60">
                    <div>Current: ₹{formatAmount(sip.currentValue)}</div>
                    <div>SIP: ₹{formatAmount(sip.sipAmount)}/{sip.frequency?.toLowerCase()}</div>
                    <div>Return: {sip.returnRate || 0}% p.a.</div>
                    <div className="text-emerald-600 font-medium">
                      Projected: ₹{formatAmount(sip.projectedValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linked Sources */}
        {(goal.linkedDetails?.length > 0 || goal.linkedLoan || goal.linkedCreditCard) && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm" data-testid="linked-sources-section">
            <h3 className="text-sm font-semibold text-[#0B3D2E] mb-4 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[#7C3AED]" />
              Linked Sources
            </h3>
            <div className="space-y-3">
              {goal.linkedDetails?.map((source, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#F8FAF9] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      source.type === "Investment" ? "bg-violet-100 text-violet-600" :
                      source.type === "Account" ? "bg-emerald-100 text-emerald-600" :
                      source.type === "Loan" ? "bg-rose-100 text-rose-600" :
                      "bg-amber-100 text-amber-600"
                    }`}>
                      {source.type === "Investment" ? <TrendingUp className="h-5 w-5" /> :
                       source.type === "Account" ? <Landmark className="h-5 w-5" /> :
                       source.type === "Loan" ? <CreditCard className="h-5 w-5" /> :
                       <CreditCard className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0B3D2E]">{source.name}</p>
                      <p className="text-xs text-[#0B3D2E]/50">
                        {source.type}{source.category ? ` • ${source.category}` : ""}
                        {source.accountType ? ` • ${source.accountType}` : ""}
                        {source.hasSIP && <span className="ml-1 text-emerald-600">• Has SIP</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#0B3D2E]">
                      ₹ {formatAmount(source.contribution)}
                    </p>
                    {source.projectedValue && source.projectedValue > source.contribution && (
                      <p className="text-xs text-emerald-600">
                        → ₹{formatAmount(source.projectedValue)}
                      </p>
                    )}
                    {!source.projectedValue && (
                      <p className="text-xs text-emerald-600 flex items-center justify-end gap-0.5">
                        <ArrowUpRight className="h-3 w-3" />
                        Contributing
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calculation Method */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#0B3D2E]">Progress Tracking</p>
              <p className="text-xs text-[#0B3D2E]/50 mt-0.5">
                {goal.calculationMethod === "auto" ? "Auto-calculated from linked sources" :
                 goal.calculationMethod === "manual_override" ? "Manually entered (override)" :
                 "Manually entered"}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              goal.calculationMethod === "auto" 
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {goal.calculationMethod === "auto" ? "Automatic" : "Manual"}
            </span>
          </div>
        </div>

        {/* Notes */}
        {goal.notes && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-[#0B3D2E] mb-2">Notes</h3>
            <p className="text-sm text-[#0B3D2E]/70">{goal.notes}</p>
          </div>
        )}

        {/* Smart Suggestions with Monthly Breakdown */}
        <div className="bg-gradient-to-br from-[#7C3AED]/5 to-[#7C3AED]/10 rounded-2xl p-5 border border-[#7C3AED]/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-[#7C3AED]" />
            <h3 className="text-sm font-semibold text-[#7C3AED]">Smart Suggestions</h3>
          </div>
          {progress < 100 ? (
            <div className="space-y-4">
              {/* Monthly Contribution Summary */}
              <div className="bg-white/50 rounded-xl p-4">
                <p className="text-xs text-[#0B3D2E]/60 mb-3">
                  Monthly Contribution Breakdown
                </p>
                <div className="space-y-2">
                  {goal.totalMonthlySIPContribution > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-700">Existing SIP Contributions</span>
                      <span className="text-sm font-semibold text-emerald-700">
                        ₹ {formatAmount(goal.totalMonthlySIPContribution)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-700">Additional Savings Needed</span>
                    <span className="text-sm font-semibold text-amber-700">
                      ₹ {formatAmount(goal.additionalMonthlySavingsNeeded || (remaining / Math.max(goal.daysRemaining / 30, 1)))}
                    </span>
                  </div>
                  <div className="border-t border-[#7C3AED]/20 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#7C3AED]">Total Monthly Needed</span>
                      <span className="text-lg font-bold text-[#7C3AED]">
                        ₹ {formatAmount(goal.totalMonthlyNeeded || (remaining / Math.max(goal.daysRemaining / 30, 1)))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-[#0B3D2E]/70">
                To reach your goal of <span className="font-semibold">₹{formatAmount(goal.targetAmount)}</span> by{" "}
                {new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}, 
                {goal.totalMonthlySIPContribution > 0 ? (
                  <> your existing SIPs will contribute significantly. Consider adding <span className="font-semibold text-amber-700">₹{formatAmount(goal.additionalMonthlySavingsNeeded || 0)}</span> more per month.</>
                ) : (
                  <> consider saving approximately <span className="font-semibold text-[#7C3AED]">₹{formatAmount(remaining / Math.max(goal.daysRemaining / 30, 1))}</span> per month.</>
                )}
              </p>
              
              {/* Projected vs Target */}
              {goal.totalProjectedFromSIPs > 0 && (
                <div className="bg-white/50 rounded-lg p-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#0B3D2E]/60">Projected at Target Date (from SIPs)</span>
                    <span className={`text-sm font-bold ${goal.totalProjectedFromSIPs >= goal.targetAmount ? 'text-emerald-600' : 'text-amber-600'}`}>
                      ₹ {formatAmount(goal.totalProjectedFromSIPs)}
                    </span>
                  </div>
                  {goal.totalProjectedFromSIPs >= goal.targetAmount ? (
                    <p className="text-xs text-emerald-600 mt-1">
                      Great news! Your current SIPs are on track to exceed your goal!
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 mt-1">
                      Gap to fill: ₹{formatAmount(goal.targetAmount - goal.totalProjectedFromSIPs)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-emerald-600 font-medium">
              Congratulations! You've achieved your goal! Consider setting a new target to keep growing.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {!goal.isCompleted && (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/goal/${id}/edit`)}
              className="flex-1 rounded-xl border-2 border-[#7C3AED] bg-white py-3.5 text-[#7C3AED] font-semibold transition-all hover:bg-[#7C3AED]/5"
              data-testid="edit-goal-btn"
            >
              Edit Goal
            </button>
            <button
              type="button"
              onClick={() => setShowCompleteConfirm(true)}
              disabled={isCompleting}
              className="flex-1 rounded-xl bg-emerald-500 py-3.5 text-white font-semibold transition-all hover:bg-emerald-600 disabled:opacity-50"
              data-testid="mark-complete-btn"
            >
              {isCompleting ? "Completing..." : "Mark Complete"}
            </button>
          </div>
        )}
      </div>

      {/* Complete Confirmation Dialog */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-[#0B3D2E] text-center mb-2">
              Mark Goal as Complete?
            </h3>
            <p className="text-[#0B3D2E]/70 text-center mb-6">
              Congratulations on reaching your goal! This will mark "{goal.goalName}" as completed.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCompleteConfirm(false)}
                className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium"
              >
                Not Yet
              </button>
              <button
                type="button"
                onClick={handleMarkComplete}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-white font-medium"
              >
                Yes, Complete!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default GoalDetail;
