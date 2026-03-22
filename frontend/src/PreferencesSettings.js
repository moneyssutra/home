import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Palette, 
  Moon, 
  Sun,
  Loader2,
  Check,
  Crown,
  Handshake
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useTheme } from "@/context/ThemeContext";
import API_BASE from './utils/apiConfig';

const backendUrl = API_BASE;

const PreferencesSettings = () => {
  const navigate = useNavigate();
  const { theme, setTheme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [accentColor, setAccentColor] = useState("#10B981");
  const [isPremium, setIsPremium] = useState(false);
  const [partnerConsent, setPartnerConsent] = useState(true);

  const accentColors = [
    { value: "#10B981", name: "Teal" },
    { value: "#3B82F6", name: "Blue" },
    { value: "#8B5CF6", name: "Purple" },
    { value: "#F59E0B", name: "Amber" },
    { value: "#EF4444", name: "Red" },
    { value: "#EC4899", name: "Pink" }
  ];

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/settings/preferences`, { withCredentials: true });
      if (response.data) {
        setAccentColor(response.data.accentColor || "#10B981");
        setIsPremium(response.data.is_premium || false);
        setPartnerConsent(response.data.partner_consent !== false);
      }
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    toast.success(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
    
    // Save to backend
    try {
      await axios.post(`${backendUrl}/api/settings/preferences`, {
        theme: newTheme,
        accentColor: accentColor,
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
        language: "en"
      }, { withCredentials: true });
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  };

  const handleAccentChange = async (color) => {
    setAccentColor(color);
    
    // Apply accent color to CSS variables
    document.documentElement.style.setProperty('--brand-primary', color);
    document.documentElement.style.setProperty('--brand-primary-soft', `${color}20`);
    
    toast.success("Accent color updated");
    
    // Save to backend
    try {
      await axios.post(`${backendUrl}/api/settings/preferences`, {
        theme: theme,
        accentColor: color,
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
        language: "en"
      }, { withCredentials: true });
    } catch (error) {
      console.error("Failed to save accent color:", error);
    }
  };

  const handleTogglePremium = async (val) => {
    setIsPremium(val);
    toast.success(val ? "Premium mode enabled" : "Premium mode disabled");
    try {
      await axios.post(`${backendUrl}/api/settings/preferences`, {
        theme, accentColor, currency: "INR", dateFormat: "DD/MM/YYYY", language: "en",
        is_premium: val, partner_consent: partnerConsent,
      }, { withCredentials: true });
    } catch { /* silent */ }
  };

  const handleTogglePartnerConsent = async (val) => {
    setPartnerConsent(val);
    toast.success(val ? "Partner suggestions enabled" : "Partner suggestions hidden");
    try {
      await axios.post(`${backendUrl}/api/settings/preferences`, {
        theme, accentColor, currency: "INR", dateFormat: "DD/MM/YYYY", language: "en",
        is_premium: isPremium, partner_consent: val,
      }, { withCredentials: true });
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="preferences-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate("/settings", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "transparent" }}
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Preferences</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Color Mode Section */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Palette className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            Appearance
          </h3>

          {/* Theme Selection */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Theme</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Light Mode Option */}
              <button
                onClick={() => handleThemeChange("light")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  theme === "light" ? "border-[var(--brand-primary)]" : "border-transparent"
                }`}
                style={{ backgroundColor: theme === "light" ? "var(--brand-primary-soft)" : "var(--bg-subtle)" }}
              >
                <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm">
                  <Sun className="h-6 w-6 text-amber-500" />
                </div>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>Light</span>
                {theme === "light" && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--brand-primary)" }}>
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
              
              {/* Dark Mode Option */}
              <button
                onClick={() => handleThemeChange("dark")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  theme === "dark" ? "border-[var(--brand-primary)]" : "border-transparent"
                }`}
                style={{ backgroundColor: theme === "dark" ? "var(--brand-primary-soft)" : "var(--bg-subtle)" }}
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shadow-sm">
                  <Moon className="h-6 w-6 text-violet-400" />
                </div>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>Dark</span>
                {theme === "dark" && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--brand-primary)" }}>
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Accent Color</p>
            <div className="flex gap-3 flex-wrap">
              {accentColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleAccentChange(color.value)}
                  className={`w-12 h-12 rounded-full transition-all flex items-center justify-center ${
                    accentColor === color.value ? "ring-2 ring-offset-2 scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value, ringColor: color.value }}
                  title={color.name}
                  data-testid={`color-${color.name.toLowerCase()}`}
                >
                  {accentColor === color.value && (
                    <Check className="h-5 w-5 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription & Opportunities */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Crown className="h-5 w-5" style={{ color: "#F59E0B" }} />
            Subscription & Opportunities
          </h3>

          {/* Premium Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl mb-3" style={{ backgroundColor: isPremium ? "#F59E0B10" : "var(--bg-subtle)", border: isPremium ? "1px solid #F59E0B30" : "1px solid transparent" }} data-testid="premium-toggle-section">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Premium Mode</p>
                {isPremium && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">ACTIVE</span>}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {isPremium ? "Partner suggestions are hidden. Only premium insights shown." : "Upgrade to hide partner suggestions and get premium-only insights."}
              </p>
            </div>
            <button
              onClick={() => handleTogglePremium(!isPremium)}
              className="relative w-12 h-7 rounded-full transition-colors shrink-0"
              style={{ backgroundColor: isPremium ? "#F59E0B" : "var(--border-light)" }}
              data-testid="premium-toggle"
            >
              <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: isPremium ? "translateX(20px)" : "translateX(0)" }} />
            </button>
          </div>

          {/* Partner Consent Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }} data-testid="partner-consent-section">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Partner Suggestions</p>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Allow personalized suggestions from financial partners
              </p>
            </div>
            <button
              onClick={() => handleTogglePartnerConsent(!partnerConsent)}
              className="relative w-12 h-7 rounded-full transition-colors shrink-0"
              style={{ backgroundColor: partnerConsent ? "var(--brand-primary)" : "var(--border-light)" }}
              data-testid="partner-consent-toggle"
            >
              <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: partnerConsent ? "translateX(20px)" : "translateX(0)" }} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Preview</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Sample Card</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>This is how your cards will look</p>
            </div>
            <button className="w-full py-3 rounded-xl text-white font-medium" style={{ backgroundColor: accentColor }}>
              Sample Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings;
