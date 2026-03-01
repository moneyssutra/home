import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Shield, TrendingUp, Wallet, Heart, Loader2 } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { OpportunityCard } from "@/components/OpportunityCard";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_META = {
  Safety: { icon: Shield, color: "#059669", description: "Secure your financial foundation" },
  Growth: { icon: TrendingUp, color: "#3B82F6", description: "Grow your wealth intelligently" },
  Debt: { icon: Wallet, color: "#F59E0B", description: "Optimize your debt & liabilities" },
  Protection: { icon: Heart, color: "#8B5CF6", description: "Protect what matters most" },
};

export default function Opportunities() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const fetchOpportunities = useCallback(async () => {
    try {
      const r = await axios.get(`${backendUrl}/api/opportunities/eligible?limit=20&skip_shown_filter=true`, { withCredentials: true });
      setOpportunities(r.data.opportunities || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOpportunities(); }, [fetchOpportunities]);

  const handleDismiss = (oppId) => {
    setOpportunities((prev) => prev.filter((o) => o.id !== oppId));
  };

  // Group by category
  const grouped = {};
  for (const opp of opportunities) {
    const cat = opp.category || "Growth";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(opp);
  }

  const categoryOrder = ["Safety", "Growth", "Debt", "Protection"];
  const sortedCategories = categoryOrder.filter((c) => grouped[c]);

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="opportunities-page">
      <header className="px-5 pt-6 pb-6" style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 80%)" }}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white" data-testid="back-button">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Smart Opportunities</h1>
            <p className="text-white/60 text-xs">Personalized financial suggestions</p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-yellow-300" />
          <p className="text-white/80 text-xs leading-relaxed">
            These suggestions are based on your financial profile. We analyze your data to find opportunities that matter to you.
          </p>
        </div>
      </header>

      <div className="px-5 pt-4 pb-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <Sparkles className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>All caught up!</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No new suggestions right now. Check back later.</p>
          </div>
        ) : (
          sortedCategories.map((cat) => {
            const meta = CATEGORY_META[cat] || CATEGORY_META.Growth;
            const CatIcon = meta.icon;
            return (
              <div key={cat} data-testid={`opp-category-${cat.toLowerCase()}`}>
                <div className="flex items-center gap-2 mb-3">
                  <CatIcon className="h-4 w-4" style={{ color: meta.color }} />
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{cat}</h3>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{meta.description}</span>
                </div>
                <div className="space-y-3">
                  {grouped[cat].map((opp) => (
                    <OpportunityCard key={opp.id} opportunity={opp} onDismiss={handleDismiss} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
}
