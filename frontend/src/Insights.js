import { useNavigate } from "react-router-dom";
import { BarChart3, FileText, ChevronRight, TrendingUp, PieChart, ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useState, useEffect } from "react";

const Insights = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const cards = [
    {
      id: "analytics",
      title: "Analytics",
      description: "Track your financial growth with interactive charts and trends",
      icon: BarChart3,
      color: "#8B5CF6", // Purple
      bgColor: "rgba(139, 92, 246, 0.1)",
      path: "/insights/analytics"
    },
    {
      id: "reports",
      title: "Reports",
      description: "Generate and download detailed financial reports",
      icon: FileText,
      color: "#059669", // Green
      bgColor: "rgba(5, 150, 105, 0.1)",
      path: "/insights/reports"
    }
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="insights-page">
      {/* Header */}
      <header 
        className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <BackButton fallbackPath="/home" />
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Insights
        </h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2">
        {/* Hero Section */}
        <div 
          className="rounded-2xl p-6 mb-6"
          style={{ 
            background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)"
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Financial Insights</h2>
              <p className="text-white/70 text-sm">Understand your money better</p>
            </div>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">
            Explore detailed analytics of your finances and generate comprehensive reports to track your progress.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="space-y-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => navigate(card.path)}
                className="w-full rounded-2xl p-5 text-left transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ 
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-light)"
                }}
                data-testid={`insights-${card.id}-card`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: card.bgColor }}
                  >
                    <Icon className="h-7 w-7" style={{ color: card.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 
                        className="text-lg font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {card.title}
                      </h3>
                      <ChevronRight 
                        className="h-5 w-5 flex-shrink-0" 
                        style={{ color: "var(--text-muted)" }}
                      />
                    </div>
                    <p 
                      className="text-sm mt-1 leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {card.description}
                    </p>
                  </div>
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap gap-2 mt-4 ml-[4.5rem]">
                  {card.id === "analytics" && (
                    <>
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: card.bgColor, color: card.color }}>
                        Net Worth
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: card.bgColor, color: card.color }}>
                        Cash Flow
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: card.bgColor, color: card.color }}>
                        Investments
                      </span>
                    </>
                  )}
                  {card.id === "reports" && (
                    <>
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: card.bgColor, color: card.color }}>
                        PDF Export
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: card.bgColor, color: card.color }}>
                        Excel Export
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: card.bgColor, color: card.color }}>
                        Custom Range
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Stats Preview */}
        <div className="mt-6 rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Quick Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate("/insights/analytics")}
              className="text-center p-4 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: "var(--bg-subtle)" }}
              data-testid="quick-overview-charts"
            >
              <PieChart className="h-8 w-8 mx-auto mb-2" style={{ color: "#8B5CF6" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>View Charts</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Analytics & Insights</p>
            </button>
            <button 
              onClick={() => navigate("/insights/reports")}
              className="text-center p-4 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: "var(--bg-subtle)" }}
              data-testid="quick-overview-reports"
            >
              <FileText className="h-8 w-8 mx-auto mb-2" style={{ color: "#059669" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Download Reports</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>PDF & Excel Export</p>
            </button>
          </div>
        </div>
      </div>

      <AddActionSheet 
        isOpen={showAddSheet} 
        onClose={() => setShowAddSheet(false)} 
      />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
};

export default Insights;
