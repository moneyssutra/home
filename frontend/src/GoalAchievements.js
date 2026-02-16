import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  CreditCard, 
  PiggyBank, 
  Wallet,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Clock,
  Sparkles,
  Star
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";

// Milestone Badge Component
const MilestoneBadge = ({ milestone, reached }) => {
  const styles = {
    25: { bg: reached ? "bg-emerald-100" : "bg-gray-100", text: reached ? "text-emerald-600" : "text-gray-400", icon: "🌱", label: "First Steps" },
    50: { bg: reached ? "bg-amber-100" : "bg-gray-100", text: reached ? "text-amber-600" : "text-gray-400", icon: "🔥", label: "Halfway" },
    75: { bg: reached ? "bg-violet-100" : "bg-gray-100", text: reached ? "text-violet-600" : "text-gray-400", icon: "🚀", label: "Almost There" },
    100: { bg: reached ? "bg-pink-100" : "bg-gray-100", text: reached ? "text-pink-600" : "text-gray-400", icon: "🎉", label: "Complete" },
  };

  const style = styles[milestone] || styles[25];

  return (
    <div 
      className={`flex flex-col items-center p-2 rounded-xl ${style.bg} ${reached ? "opacity-100 scale-100" : "opacity-40 scale-95"} transition-all`}
      data-testid={`achievement-milestone-${milestone}`}
    >
      <span className="text-xl mb-1">{style.icon}</span>
      <span className={`text-xs font-bold ${style.text}`}>{milestone}%</span>
      <span className={`text-[10px] ${reached ? style.text : "text-gray-400"}`}>{style.label}</span>
    </div>
  );
};

// Achievement Card Component
const AchievementCard = ({ achievement, navigate, getGoalIcon, getGoalColor, formatAmount }) => {
  const Icon = getGoalIcon(achievement.goalType);
  const colors = getGoalColor(achievement.goalType);
  
  const completedDate = achievement.completedDate 
    ? new Date(achievement.completedDate).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      })
    : 'N/A';

  return (
    <div 
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
      data-testid={`achievement-card-${achievement.id}`}
    >
      {/* Card Header with gradient */}
      <div className={`bg-gradient-to-r ${colors.gradient} p-4`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{achievement.goalName}</h3>
              <p className="text-white/70 text-sm">
                {achievement.goalType === "Other" ? achievement.customTypeName : achievement.goalType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
            <Trophy className="h-4 w-4 text-yellow-300" />
            <span className="text-xs font-semibold text-white">Achieved</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Amount Achieved */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-1">Amount Achieved</p>
            <p className="text-xl font-bold text-gray-800">₹ {formatAmount(achievement.finalAmount)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Target</p>
            <p className="text-lg font-semibold text-gray-600">₹ {formatAmount(achievement.targetAmount)}</p>
          </div>
        </div>

        {/* Milestone Badges */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Star className="h-3 w-3" />
            Milestones Achieved
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((milestone) => (
              <MilestoneBadge 
                key={milestone}
                milestone={milestone} 
                reached={achievement.reachedMilestones?.includes(milestone) || true} 
              />
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-gray-500">Completed On</span>
            </div>
            <p className="text-sm font-semibold text-gray-800">{completedDate}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-gray-500">Journey Duration</span>
            </div>
            <p className="text-sm font-semibold text-gray-800">
              {achievement.durationDays ? `${achievement.durationDays} days` : 'N/A'}
            </p>
          </div>
        </div>

        {/* View Details Button */}
        <button
          onClick={() => navigate(`/goal/${achievement.id}`)}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          data-testid={`view-achievement-${achievement.id}`}
        >
          View Details
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const GoalAchievements = () => {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/goals/achievements`);
      setAchievements(response.data.achievements || []);
      setSummary({
        totalCompleted: response.data.totalCompleted || 0,
        totalAmountAchieved: response.data.totalAmountAchieved || 0,
        averageDurationDays: response.data.averageDurationDays || 0
      });
    } catch (error) {
      console.error("Error fetching achievements:", error);
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
        return { gradient: "from-emerald-500 to-green-600", icon: "bg-emerald-500/20 text-emerald-400" };
      case "Debt Elimination":
        return { gradient: "from-rose-500 to-red-600", icon: "bg-rose-500/20 text-rose-400" };
      case "Investment Target":
        return { gradient: "from-violet-500 to-purple-600", icon: "bg-violet-500/20 text-violet-400" };
      case "Emergency Fund":
        return { gradient: "from-amber-500 to-orange-600", icon: "bg-amber-500/20 text-amber-400" };
      default:
        return { gradient: "from-blue-500 to-indigo-600", icon: "bg-blue-500/20 text-blue-400" };
    }
  };

  return (
    <div className="min-h-screen honeycomb-bg pb-24" data-testid="goal-achievements-page">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309] px-6 pt-8 pb-8 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-[#1E293B]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-10 w-40 h-40 bg-[#1E293B]/5 rounded-full blur-3xl"></div>
        
        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <BackButton fallbackPath="/my-goals" forceNavigate={true} className="bg-[#1E293B]/20 border-white/30 text-white hover:bg-[#1E293B]/30" />
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Goal Achievements
            </h1>
          </div>

          {/* Trophy Summary Card */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="achievements-summary">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <Trophy className="h-8 w-8 text-yellow-300" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Goals Completed</p>
                <h2 className="text-4xl font-bold text-white">{summary.totalCompleted || 0}</h2>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
              <div className="text-center">
                <p className="text-white/80 text-xs mb-1">Total Achieved</p>
                <p className="text-xl font-bold text-white">₹ {formatAmount(summary.totalAmountAchieved || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-white/80 text-xs mb-1">Avg. Duration</p>
                <p className="text-xl font-bold text-white">
                  {summary.averageDurationDays || 0} days
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading achievements...</div>
          </div>
        ) : achievements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 mb-4">
              <Trophy className="h-12 w-12 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">No Achievements Yet</h2>
            <p className="text-gray-500 text-center text-sm mb-6">
              Complete your first goal to see it celebrated here!
            </p>
            <button
              onClick={() => navigate("/my-goals")}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-white font-medium transition-all hover:bg-amber-600 active:scale-[0.98]"
              data-testid="view-active-goals-btn"
            >
              <Target className="h-5 w-5" />
              View Active Goals
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Celebration Banner */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200 flex items-center gap-3">
              <div className="flex-shrink-0">
                <Sparkles className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Congratulations!</span> You've achieved {summary.totalCompleted} {summary.totalCompleted === 1 ? 'goal' : 'goals'}. Keep up the great work!
              </p>
            </div>

            {/* Achievement Cards */}
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                navigate={navigate}
                getGoalIcon={getGoalIcon}
                getGoalColor={getGoalColor}
                formatAmount={formatAmount}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default GoalAchievements;
