import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Target, Clock, CheckCircle2, AlertCircle, Sparkles, ChevronRight, ChevronLeft } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import FamilyToggle from "@/components/FamilyToggle";
import { useFamilyContext } from "@/context/FamilyContext";
import API_BASE from '../utils/apiConfig';

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
  travel: "https://images.unsplash.com/photo-1631535152690-ba1a85229136?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
  trip: "https://images.unsplash.com/photo-1631535152690-ba1a85229136?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
  vacation: "https://images.unsplash.com/photo-1631535152690-ba1a85229136?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
  goa: "https://images.unsplash.com/photo-1631535152690-ba1a85229136?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
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
  gold: "https://images.pexels.com/photos/3943727/pexels-photo-3943727.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  fund: "https://static.prod-images.emergentagent.com/jobs/01b891f9-9672-414f-bf4d-1ee4283b2940/images/92df9115bec6fdb3fb22c69cd7379d7818f14c4d28b812829eef970c7c3ddfc7.png",
  emergency: "https://static.prod-images.emergentagent.com/jobs/01b891f9-9672-414f-bf4d-1ee4283b2940/images/92df9115bec6fdb3fb22c69cd7379d7818f14c4d28b812829eef970c7c3ddfc7.png",
  saving: "https://static.prod-images.emergentagent.com/jobs/01b891f9-9672-414f-bf4d-1ee4283b2940/images/92df9115bec6fdb3fb22c69cd7379d7818f14c4d28b812829eef970c7c3ddfc7.png",
};

const TYPE_IMAGES = {
  "Wealth Creation": "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "Debt Elimination": "https://images.unsplash.com/photo-1705056509273-3e2292bd2e39?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
  "Investment Target": "https://images.pexels.com/photos/7567445/pexels-photo-7567445.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "Emergency Fund": "https://static.prod-images.emergentagent.com/jobs/01b891f9-9672-414f-bf4d-1ee4283b2940/images/92df9115bec6fdb3fb22c69cd7379d7818f14c4d28b812829eef970c7c3ddfc7.png",
};
const FALLBACK_IMG = "https://static.prod-images.emergentagent.com/jobs/01b891f9-9672-414f-bf4d-1ee4283b2940/images/92df9115bec6fdb3fb22c69cd7379d7818f14c4d28b812829eef970c7c3ddfc7.png";

function getGoalImage(goal) {
  if (goal.goalImage) {
    const backendUrl = API_BASE || "";
    return goal.goalImage.startsWith("/api") ? `${backendUrl}${goal.goalImage}` : goal.goalImage;
  }
  const lower = (goal.goalName || "").toLowerCase();
  for (const [kw, url] of Object.entries(GOAL_IMAGES)) {
    if (lower.includes(kw)) return url;
  }
  return TYPE_IMAGES[goal.goalType] || FALLBACK_IMG;
}

const fmt = (n) => {
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} K`;
  return new Intl.NumberFormat("en-IN").format(n);
};

const fmtFull = (n) => Math.abs(n).toLocaleString("en-IN");

const getProgressColor = (pct) => {
  if (pct >= 100) return "#10B981";
  if (pct >= 75) return "#22C55E";
  if (pct >= 50) return "#F59E0B";
  if (pct >= 25) return "#F97316";
  return "#EF4444";
};

const getStatusInfo = (goal) => {
  if (goal.isCompleted) return { label: "Completed", cls: "gv-badge--completed" };
  if (goal.isOverdue) return { label: "Overdue", cls: "gv-badge--overdue" };
  return { label: "Active", cls: "gv-badge--active" };
};

/* ─── Horizontal Scroll Card ─── */
const GoalScrollCard = ({ goal, isActive }) => {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const pct = Math.min(goal.progressPercent || 0, 100);
  const imgUrl = getGoalImage(goal);
  const status = getStatusInfo(goal);

  return (
    <button
      onClick={() => navigate(`/goal/${goal.id}`)}
      data-testid={`goal-scroll-card-${goal.id}`}
      className="gv-scroll-card"
      style={{
        transform: isActive ? "scale(1)" : "scale(0.93)",
        opacity: isActive ? 1 : 0.75,
        backgroundColor: "#2d2d3a",
      }}
    >
      <img
        src={imgUrl} alt={goal.goalName}
        className={`gv-scroll-card__img ${imgLoaded ? "gv-scroll-card__img--on" : ""}`}
        onLoad={() => setImgLoaded(true)}
        onError={(e) => {
          e.target.src = "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&w=600";
          setImgLoaded(true);
        }}
      />
      <div className="gv-scroll-card__overlay" />

      <div className="gv-scroll-card__content">
        {/* Top */}
        <div className="gv-scroll-card__top">
          <div className="gv-scroll-card__name-area">
            <span className="gv-scroll-card__dream-label">Your Dream</span>
            <h3 className="gv-scroll-card__name">{goal.goalName}</h3>
          </div>
          <span className={`gv-badge ${status.cls}`}>
            {status.label === "Completed" && <CheckCircle2 size={10} />}
            {status.label === "Overdue" && <AlertCircle size={10} />}
            {status.label === "Active" && <Clock size={10} />}
            {status.label}
          </span>
        </div>

        {/* Amount */}
        <div className="gv-scroll-card__amount-row">
          <span className="gv-scroll-card__saved">{fmt(goal.calculatedAmount || 0)}</span>
          <span className="gv-scroll-card__sep">/</span>
          <span className="gv-scroll-card__target">{fmt(goal.targetAmount)}</span>
        </div>

        {/* Progress Bar */}
        <div className="gv-scroll-card__bar-wrap">
          <div className="gv-scroll-card__bar-bg">
            <div
              className="gv-scroll-card__bar-fill"
              style={{ width: `${pct}%`, background: getProgressColor(pct) }}
            />
          </div>
          <div className="gv-scroll-card__bar-meta">
            <span className="gv-scroll-card__pct">{(goal.progressPercent || 0).toFixed(1)}%</span>
            {goal.isCompleted ? (
              <span className="gv-scroll-card__days gv-scroll-card__days--done">Achieved</span>
            ) : goal.isOverdue ? (
              <span className="gv-scroll-card__days gv-scroll-card__days--overdue">{Math.abs(goal.daysRemaining)}d overdue</span>
            ) : goal.daysRemaining != null ? (
              <span className="gv-scroll-card__days">{goal.daysRemaining}d left</span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
};

/* ─── Row Label Item ─── */
const GoalRow = ({ goal }) => {
  const navigate = useNavigate();
  const pct = Math.min(goal.progressPercent || 0, 100);
  const status = getStatusInfo(goal);
  const imgUrl = getGoalImage(goal);

  return (
    <button
      onClick={() => navigate(`/goal/${goal.id}`)}
      className="gv-row"
      data-testid={`goal-row-${goal.id}`}
    >
      <div className="gv-row__thumb" style={{ backgroundImage: `url(${imgUrl})` }} />
      <div className="gv-row__info">
        <p className="gv-row__name">{goal.goalName}</p>
        <p className="gv-row__sub">
          {goal.goalType === "Other" ? goal.customTypeName || "Other" : goal.goalType}
          {goal.daysRemaining != null && !goal.isCompleted && (
            <span>
              {" · "}
              {goal.isOverdue
                ? <span style={{ color: "#C0392B" }}>{Math.abs(goal.daysRemaining)}d overdue</span>
                : `${goal.daysRemaining}d left`}
            </span>
          )}
        </p>
        <div className="gv-row__bar-bg">
          <div className="gv-row__bar-fill" style={{ width: `${pct}%`, background: getProgressColor(pct) }} />
        </div>
      </div>
      <div className="gv-row__right">
        <p className="gv-row__amount">{fmt(goal.calculatedAmount || 0)}</p>
        <p className="gv-row__total">/ {fmt(goal.targetAmount)}</p>
        <span className={`gv-badge-sm ${status.cls}`}>{status.label}</span>
      </div>
      <ChevronRight size={16} className="gv-row__chevron" />
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
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef(null);
  const backendUrl = API_BASE || "";
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

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / 296);
    setActiveIdx(Math.min(idx, goals.length - 1));
  }, [goals.length]);

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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
              onClick={() => navigate(-1)}
              data-testid="back-button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <ProfileMenu userName={null} userPicture={null} />
            <FamilyToggle />
          </div>
          <NotificationBell />
        </div>
        <h1 className="gv-header__title">
          {isFamilyView ? `${activeViewLabel} Goals` : "My Dreams"}
        </h1>

        {/* Summary Stats */}
        <div className="gv-header__stats">
          <div className="gv-stat">
            <span className="gv-stat__val">{active.length}</span>
            <span className="gv-stat__lbl">Active</span>
          </div>
          <div className="gv-stat__divider" />
          <div className="gv-stat">
            <span className="gv-stat__val">{fmt(totalCurrent)}</span>
            <span className="gv-stat__lbl">Saved</span>
          </div>
          <div className="gv-stat__divider" />
          <div className="gv-stat">
            <span className="gv-stat__val">{fmt(totalTarget)}</span>
            <span className="gv-stat__lbl">Target</span>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="gv-header__bar-wrap">
          <div className="gv-header__bar-bg">
            <div className="gv-header__bar-fill" style={{ width: `${overallPct}%` }} />
          </div>
          <span className="gv-header__bar-pct">{overallPct.toFixed(0)}% overall</span>
        </div>
      </header>

      {/* Content */}
      <div className="gv-body">
        {/* Filter Tabs - always visible */}
        {!loading && goals.length > 0 && (
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
        )}

        {loading ? (
          <div className="gv-empty"><div className="gv-spinner" /></div>
        ) : goals.length === 0 ? (
          <div className="gv-empty" data-testid="gv-empty-state">
            <div className="gv-empty__icon"><Sparkles size={36} /></div>
            <h2 className="gv-empty__title">No Dreams Yet</h2>
            <p className="gv-empty__desc">Start building your dreams. Set your first financial goal.</p>
            <button onClick={() => navigate("/goal")} className="gv-empty__cta" data-testid="gv-add-first">
              <Plus size={18} /> Create Your First Dream
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="gv-empty" data-testid="gv-empty-state">
            <div className="gv-empty__icon"><Sparkles size={36} /></div>
            <h2 className="gv-empty__title">
              {filter === "completed" ? "No Achievements Yet" : "No Active Goals"}
            </h2>
            <p className="gv-empty__desc">
              {filter === "completed" ? "Complete your first goal to celebrate here!" : "All caught up! Create a new goal."}
            </p>
          </div>
        ) : (
          <>
            {/* Horizontal Card Scroll */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="gv-scroll"
              data-testid="goals-card-scroll"
            >
              {filtered.map((goal, i) => (
                <GoalScrollCard key={goal.id} goal={goal} isActive={i === activeIdx} />
              ))}
            </div>

            {/* Dot Indicators */}
            {filtered.length > 1 && (
              <div className="gv-dots" data-testid="goal-dots">
                {filtered.map((_, i) => (
                  <div key={i} className={`gv-dot ${i === activeIdx ? "gv-dot--on" : ""}`} />
                ))}
              </div>
            )}

            {/* All Goals Label List */}
            <div className="gv-list-section">
              <p className="gv-list-title">All Goals</p>
              <div className="gv-list">
                {filtered.map(goal => <GoalRow key={goal.id} goal={goal} />)}
              </div>
            </div>
          </>
        )}

        {/* Add Goal Button (dashed) */}
        {filtered.length > 0 && filter !== "completed" && (
          <div className="gv-add-wrap">
            <button onClick={() => navigate("/goal")} className="gv-add-btn" data-testid="gv-add-goal-btn">
              <Plus size={18} /> Add New Goal
            </button>
          </div>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyGoalsVisual;
