import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Target, Clock, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import { useAuth } from "@/context/AuthContext";
import { useFamilyContext } from "@/context/FamilyContext";

/* ─── keyword → image mapping ─── */
const GOAL_IMAGES = {
  home: "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  house: "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  flat: "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  apartment: "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  property: "https://images.pexels.com/photos/7031598/pexels-photo-7031598.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  car: "https://images.pexels.com/photos/7150302/pexels-photo-7150302.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  vehicle: "https://images.pexels.com/photos/7150302/pexels-photo-7150302.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  bike: "https://images.pexels.com/photos/35974726/pexels-photo-35974726.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  motorcycle: "https://images.pexels.com/photos/35974726/pexels-photo-35974726.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  travel: "https://images.unsplash.com/photo-1631535152690-ba1a85229136?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwdHJhdmVsJTIwdmFjYXRpb258ZW58MHx8fHwxNzc0MDgxNzUyfDA&ixlib=rb-4.1.0&q=85",
  trip: "https://images.unsplash.com/photo-1631535152690-ba1a85229136?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwdHJhdmVsJTIwdmFjYXRpb258ZW58MHx8fHwxNzc0MDgxNzUyfDA&ixlib=rb-4.1.0&q=85",
  vacation: "https://images.unsplash.com/photo-1631535152690-ba1a85229136?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwdHJhdmVsJTIwdmFjYXRpb258ZW58MHx8fHwxNzc0MDgxNzUyfDA&ixlib=rb-4.1.0&q=85",
  goa: "https://images.unsplash.com/photo-1631535152690-ba1a85229136?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwdHJhdmVsJTIwdmFjYXRpb258ZW58MHx8fHwxNzc0MDgxNzUyfDA&ixlib=rb-4.1.0&q=85",
  phone: "https://images.pexels.com/photos/215581/pexels-photo-215581.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  iphone: "https://images.pexels.com/photos/215581/pexels-photo-215581.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  samsung: "https://images.pexels.com/photos/215581/pexels-photo-215581.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  gadget: "https://images.pexels.com/photos/3945693/pexels-photo-3945693.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  laptop: "https://images.pexels.com/photos/3945693/pexels-photo-3945693.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  macbook: "https://images.pexels.com/photos/3945693/pexels-photo-3945693.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  buds: "https://images.pexels.com/photos/215581/pexels-photo-215581.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  watch: "https://images.pexels.com/photos/3945693/pexels-photo-3945693.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  education: "https://images.pexels.com/photos/5820203/pexels-photo-5820203.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  school: "https://images.pexels.com/photos/5820203/pexels-photo-5820203.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  college: "https://images.pexels.com/photos/5820203/pexels-photo-5820203.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  wedding: "https://images.pexels.com/photos/1646730/pexels-photo-1646730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  marriage: "https://images.pexels.com/photos/1646730/pexels-photo-1646730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  shoe: "https://images.pexels.com/photos/215581/pexels-photo-215581.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  balance: "https://images.pexels.com/photos/215581/pexels-photo-215581.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
};

const TYPE_IMAGES = {
  "Wealth Creation": "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "Debt Elimination": "https://images.unsplash.com/photo-1705056509273-3e2292bd2e39?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHwyfHxkZWJ0JTIwZnJlZSUyMGZpbmFuY2lhbCUyMGZyZWVkb218ZW58MHx8fHwxNzc0MDgxNzU3fDA&ixlib=rb-4.1.0&q=85",
  "Investment Target": "https://images.pexels.com/photos/7567445/pexels-photo-7567445.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "Emergency Fund": "https://images.pexels.com/photos/3943727/pexels-photo-3943727.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
};

const FALLBACK_IMG = "https://images.pexels.com/photos/3943727/pexels-photo-3943727.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

function getGoalImage(goalName, goalType) {
  const lower = (goalName || "").toLowerCase();
  for (const [kw, url] of Object.entries(GOAL_IMAGES)) {
    if (lower.includes(kw)) return url;
  }
  return TYPE_IMAGES[goalType] || FALLBACK_IMG;
}

/* ─── Progress Ring SVG ─── */
const ProgressRing = ({ percent, size = 90, stroke = 5 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const capped = Math.min(percent, 100);
  const offset = circ - (capped / 100) * circ;
  const color = percent >= 100 ? "#10B981" : percent >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <svg width={size} height={size} className="progress-ring-svg">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1.2s ease-out" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill="#fff" fontSize={size > 70 ? 18 : 14} fontWeight="700">
        {Math.round(capped)}%
      </text>
    </svg>
  );
};

/* ─── Status Badge ─── */
const StatusBadge = ({ goal }) => {
  if (goal.isCompleted) {
    return (
      <span className="gv-badge gv-badge--completed" data-testid={`badge-completed-${goal.id}`}>
        <CheckCircle2 size={12} /> Completed
      </span>
    );
  }
  if (goal.isOverdue) {
    return (
      <span className="gv-badge gv-badge--overdue" data-testid={`badge-overdue-${goal.id}`}>
        <AlertCircle size={12} /> Overdue
      </span>
    );
  }
  return (
    <span className="gv-badge gv-badge--active" data-testid={`badge-active-${goal.id}`}>
      <Clock size={12} /> Active
    </span>
  );
};

/* ─── Goal Visual Card ─── */
const GoalVisualCard = ({ goal, navigate, formatAmount, index }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const progress = goal.progressPercent || 0;
  const imgUrl = getGoalImage(goal.goalName, goal.goalType);

  return (
    <button
      onClick={() => navigate(`/goal/${goal.id}`)}
      className="gv-card"
      style={{ animationDelay: `${index * 0.08}s` }}
      data-testid={`goal-visual-card-${goal.id}`}
    >
      {/* Background Image */}
      <img
        src={imgUrl}
        alt=""
        className={`gv-card__img ${imgLoaded ? "gv-card__img--loaded" : ""}`}
        onLoad={() => setImgLoaded(true)}
        loading="lazy"
      />
      <div className="gv-card__overlay" />

      {/* Top Row: Name + Badge */}
      <div className="gv-card__top">
        <div className="gv-card__name-wrap">
          <p className="gv-card__label">Your Dream</p>
          <h3 className="gv-card__name">{goal.goalName}</h3>
        </div>
        <StatusBadge goal={goal} />
      </div>

      {/* Center: Progress Ring */}
      <div className="gv-card__center">
        <ProgressRing percent={progress} />
      </div>

      {/* Bottom: Amount + Days */}
      <div className="gv-card__bottom">
        <div className="gv-card__amount">
          <span className="gv-card__saved">{formatAmount(goal.calculatedAmount || 0)}</span>
          <span className="gv-card__sep">/</span>
          <span className="gv-card__target">{formatAmount(goal.targetAmount)}</span>
        </div>
        <div className="gv-card__timeline">
          {goal.isCompleted ? (
            <span className="gv-card__days gv-card__days--done">Goal Achieved</span>
          ) : goal.isOverdue ? (
            <span className="gv-card__days gv-card__days--overdue">
              {Math.abs(goal.daysRemaining)}d overdue
            </span>
          ) : goal.daysRemaining != null ? (
            <span className="gv-card__days">{goal.daysRemaining}d left</span>
          ) : null}
        </div>
      </div>
    </button>
  );
};

/* ─── Main Page ─── */
const MyGoalsVisual = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [filter, setFilter] = useState("all");
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  const { isPersonalView, isFamilyView, activeViewLabel, activeViewId } = useFamilyContext();

  useEffect(() => { fetchGoals(); }, [activeViewId]);

  const fetchGoals = async () => {
    if (!isPersonalView) { setGoals([]); setLoading(false); return; }
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/goals`);
      setGoals(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatAmount = (n) => {
    if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `${(n / 100000).toFixed(2)} L`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(n);
  };

  const filtered = useMemo(() =>
    goals
      .filter(g => filter === "all" ? true : filter === "active" ? !g.isCompleted : g.isCompleted)
      .sort((a, b) => (a.isCompleted === b.isCompleted ? (a.priority || 99) - (b.priority || 99) : a.isCompleted ? 1 : -1)),
    [goals, filter]
  );

  const active = goals.filter(g => !g.isCompleted);
  const totalTarget = active.reduce((s, g) => s + (g.targetAmount || 0), 0);
  const totalCurrent = active.reduce((s, g) => s + (g.calculatedAmount || 0), 0);
  const overallPct = totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0;

  return (
    <div className="gv-page" data-testid="goals-visual-page">
      {/* Header */}
      <header className="gv-header">
        <div className="gv-header__row">
          <ProfileMenu userName={null} userPicture={null} />
          <NotificationBell />
        </div>
        <div className="gv-header__hero">
          <div>
            <p className="gv-header__sub">Dream Tracker</p>
            <h1 className="gv-header__title">
              {isFamilyView ? `${activeViewLabel} Goals` : "My Dreams"}
            </h1>
          </div>
          <div className="gv-header__ring">
            <ProgressRing percent={overallPct} size={72} stroke={4} />
          </div>
        </div>
        <div className="gv-header__stats">
          <div className="gv-stat">
            <span className="gv-stat__val">{active.length}</span>
            <span className="gv-stat__lbl">Active</span>
          </div>
          <div className="gv-stat__divider" />
          <div className="gv-stat">
            <span className="gv-stat__val">{formatAmount(totalCurrent)}</span>
            <span className="gv-stat__lbl">Saved</span>
          </div>
          <div className="gv-stat__divider" />
          <div className="gv-stat">
            <span className="gv-stat__val">{formatAmount(totalTarget)}</span>
            <span className="gv-stat__lbl">Target</span>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="gv-filters">
        {["all", "active", "completed"].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`gv-filter-btn ${filter === tab ? "gv-filter-btn--on" : ""}`}
            data-testid={`gv-filter-${tab}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      <div className="gv-grid">
        {loading ? (
          <div className="gv-empty">
            <div className="gv-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="gv-empty" data-testid="gv-empty-state">
            <div className="gv-empty__icon"><Sparkles size={40} /></div>
            <h2 className="gv-empty__title">
              {filter === "completed" ? "No Achievements Yet" : "No Dreams Yet"}
            </h2>
            <p className="gv-empty__desc">
              {filter === "completed"
                ? "Complete your first goal to celebrate here!"
                : "Start building your dreams. Set your first financial goal."}
            </p>
            {filter !== "completed" && (
              <button onClick={() => navigate("/goal")} className="gv-empty__cta" data-testid="gv-add-first">
                <Plus size={18} /> Create Your First Dream
              </button>
            )}
          </div>
        ) : (
          filtered.map((goal, i) => (
            <GoalVisualCard key={goal.id} goal={goal} navigate={navigate} formatAmount={formatAmount} index={i} />
          ))
        )}
      </div>

      {/* Floating Add Button */}
      {filtered.length > 0 && filter !== "completed" && (
        <button onClick={() => navigate("/goal")} className="gv-fab" data-testid="gv-add-goal-fab">
          <Plus size={24} />
        </button>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyGoalsVisual;
