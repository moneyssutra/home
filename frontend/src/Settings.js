import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Database,
  ChevronRight,
  ArrowLeft,
  FileSpreadsheet,
  Users
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { LogoIcon, LogoFull, BRAND } from "@/components/Logo";

const Settings = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);

  const sections = [
    {
      id: "profile",
      title: "Profile",
      description: "Manage your personal information",
      icon: User,
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)",
      path: "/settings/profile"
    },
    {
      id: "security",
      title: "Security",
      description: "Password, authentication & login settings",
      icon: Shield,
      color: "#059669",
      bgColor: "rgba(5, 150, 105, 0.1)",
      path: "/settings/security"
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Email, push notifications & reminders",
      icon: Bell,
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.1)",
      path: "/settings/notifications"
    },
    {
      id: "preferences",
      title: "Preferences",
      description: "Theme, colors & display options",
      icon: Palette,
      color: "#8B5CF6",
      bgColor: "rgba(139, 92, 246, 0.1)",
      path: "/settings/preferences"
    },
    {
      id: "data-privacy",
      title: "Data & Privacy",
      description: "Export data, delete account & privacy settings",
      icon: Database,
      color: "#EF4444",
      bgColor: "rgba(239, 68, 68, 0.1)",
      path: "/settings/data-privacy"
    }
  ];

  const legalLinks = [
    { label: "Terms of Service", path: "/terms-of-service" },
    { label: "Privacy Policy", path: "/privacy-policy" },
    { label: "Data Deletion", path: "/data-deletion" },
  ];

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="settings-page">
      {/* Header */}
      <header 
        className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <button
          onClick={() => navigate("/home", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Settings
        </h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2">
        {/* Settings Sections */}
        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => navigate(section.path)}
                className="w-full rounded-2xl p-4 text-left transition-all hover:shadow-md active:scale-[0.98]"
                style={{ 
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-light)"
                }}
                data-testid={`settings-${section.id}`}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: section.bgColor }}
                  >
                    <Icon className="h-6 w-6" style={{ color: section.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-base font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {section.title}
                    </h3>
                    <p 
                      className="text-sm mt-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {section.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight 
                    className="h-5 w-5 flex-shrink-0" 
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* App Info */}
        <div className="mt-8 text-center">
          <div className="flex justify-center mb-2">
            <LogoFull height={48} />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            v1.0.0
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            {legalLinks.map((link, i) => (
              <span key={link.path} className="flex items-center gap-3">
                {i > 0 && <span className="text-xs" style={{ color: "var(--border-light)" }}>|</span>}
                <button
                  onClick={() => navigate(link.path)}
                  className="text-xs underline"
                  style={{ color: "var(--text-muted)" }}
                  data-testid={`legal-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {link.label}
                </button>
              </span>
            ))}
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
            {BRAND.company}
          </p>
        </div>
      </div>

      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
};

export default Settings;
