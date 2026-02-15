import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Target, 
  Plus, 
  ChevronRight, 
  TrendingUp, 
  CreditCard, 
  PiggyBank, 
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";

const MyGoals = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [filter, setFilter] = useState("all"); // all, active, completed

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/goals`);
      setGoals(response.data);
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
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
        return "bg-emerald-500/20 text-emerald-600";
      case "Debt Elimination":
        return "bg-rose-500/20 text-rose-600";
      case "Investment Target":
        return "bg-violet-500/20 text-violet-600";
      case "Emergency Fund":
        return "bg-amber-500/20 text-amber-600";
      default:
        return "bg-blue-500/20 text-blue-600";
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 1:
        return { label: "High", color: "bg-red-100 text-red-700 border-red-200" };
      case 2:
        return { label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200" };
      case 3:
        return { label: "Low", color: "bg-gray-100 text-gray-700 border-gray-200" };
      default:
        return { label: "Normal", color: "bg-gray-100 text-gray-700 border-gray-200" };
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 75) return "bg-green-500";
    if (percent >= 50) return "bg-amber-500";
    if (percent >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const filteredGoals = goals.filter((goal) => {
    if (filter === "active") return !goal.isCompleted;
    if (filter === "completed") return goal.isCompleted;
    return true;
  });

  // Calculate summary stats
  const activeGoals = goals.filter(g => !g.isCompleted);
  const completedGoals = goals.filter(g => g.isCompleted);
  const totalTarget = activeGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  const totalCurrent = activeGoals.reduce((sum, g) => sum + (g.calculatedAmount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F8FAF9] pb-24" data-testid="my-goals-page">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#7C3AED] px-6 pt-8 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <BackButton forceNavigate="/" className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Goals
          </h1>
        </div>

        {/* Summary Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10" data-testid="goals-summary">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/60 text-sm font-medium mb-1">Overall Progress</p>
              <h2 className="text-3xl font-bold text-white">{overallProgress.toFixed(1)}%</h2>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <Target className="h-8 w-8 text-white" />
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-green-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-white/60">
              <span>₹ {formatAmount(totalCurrent)} saved</span>
              <span>₹ {formatAmount(totalTarget)} target</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-white/60 text-sm">Active Goals</p>
              <p className="text-2xl font-bold text-white">{activeGoals.length}</p>
            </div>
            <div className="text-center">
              <p className="text-white/60 text-sm">Completed</p>
              <p className="text-2xl font-bold text-emerald-300">{completedGoals.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="px-6 mt-4">
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
          {["all", "active", "completed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                filter === tab
                  ? "bg-[#7C3AED] text-white"
                  : "text-[#0B3D2E]/60 hover:bg-gray-100"
              }`}
              data-testid={`filter-${tab}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Goals List */}
      <div className="px-6 mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#0B3D2E]/60">Loading goals...</div>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 mb-4">
              <Target className="h-10 w-10 text-violet-500" />
            </div>
            <h2 className="text-lg font-semibold text-[#0B3D2E] mb-2">
              {filter === "completed" ? "No Completed Goals Yet" : "No Goals Yet"}
            </h2>
            <p className="text-[#0B3D2E]/60 text-center text-sm mb-6">
              {filter === "completed" 
                ? "Complete your first goal to see it here!"
                : "Set your first financial goal and start tracking your progress"
              }
            </p>
            {filter !== "completed" && (
              <button
                onClick={() => navigate("/goal")}
                className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-white font-medium transition-all hover:bg-[#6D28D9] active:scale-[0.98]"
                data-testid="add-first-goal-btn"
              >
                <Plus className="h-5 w-5" />
                Create Your First Goal
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGoals.map((goal) => {
              const Icon = getGoalIcon(goal.goalType);
              const priorityBadge = getPriorityBadge(goal.priority);
              const progress = goal.progressPercent || 0;
              
              return (
                <button
                  key={goal.id}
                  onClick={() => navigate(`/goal/${goal.id}`)}
                  className={`w-full bg-white rounded-2xl p-4 border transition-all hover:shadow-md ${
                    goal.isCompleted ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100"
                  }`}
                  data-testid={`goal-card-${goal.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl ${getGoalColor(goal.goalType)} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#0B3D2E] truncate">{goal.goalName}</h3>
                        {goal.isCompleted && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#0B3D2E]/50 mb-2">
                        <span className={`px-2 py-0.5 rounded-full border ${priorityBadge.color}`}>
                          {priorityBadge.label}
                        </span>
                        <span>{goal.goalType === "Other" ? goal.customTypeName : goal.goalType}</span>
                        {goal.daysRemaining !== null && !goal.isCompleted && (
                          <>
                            <span>•</span>
                            {goal.isOverdue ? (
                              <span className="text-red-500 font-medium flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {Math.abs(goal.daysRemaining)} days overdue
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {goal.daysRemaining} days left
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getProgressColor(progress)} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#0B3D2E]/70">
                          ₹ {formatAmount(goal.calculatedAmount || 0)} / ₹ {formatAmount(goal.targetAmount)}
                        </span>
                        <span className={`text-sm font-bold ${progress >= 100 ? "text-emerald-600" : "text-[#0B3D2E]"}`}>
                          {progress.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#0B3D2E]/30 flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Goal Button */}
      {filteredGoals.length > 0 && filter !== "completed" && (
        <div className="px-6 mt-6">
          <button
            onClick={() => navigate("/goal")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#7C3AED] py-3 text-[#7C3AED] font-medium transition-all hover:bg-[#7C3AED]/5"
            data-testid="add-goal-btn"
          >
            <Plus className="h-5 w-5" />
            Add New Goal
          </button>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyGoals;
