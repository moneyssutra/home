import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Palette, 
  Globe, 
  Calendar, 
  DollarSign, 
  Moon, 
  Sun,
  LayoutDashboard,
  Hash,
  CalendarDays,
  Home,
  TrendingUp,
  Wallet,
  Minimize2
} from "lucide-react";
import { toast } from "sonner";

const PreferencesSettings = () => {
  const navigate = useNavigate();
  
  const [preferences, setPreferences] = useState({
    // Display
    theme: "light",
    accentColor: "#10B981",
    compactMode: false,
    // Regional
    currency: "INR",
    numberFormat: "indian",
    dateFormat: "DD/MM/YYYY",
    firstDayOfWeek: "Monday",
    // Dashboard
    showNetWorthTrend: true,
    showCashFlowSummary: true,
    defaultLandingPage: "home"
  });

  const currencies = [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" }
  ];

  const numberFormats = [
    { value: "indian", label: "Indian (Lakh/Crore)", example: "₹10,00,000" },
    { value: "international", label: "International (Million/Billion)", example: "₹1,000,000" }
  ];

  const dateFormats = [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "31/12/2024" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "12/31/2024" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2024-12-31" }
  ];

  const weekDays = ["Monday", "Sunday", "Saturday"];

  const landingPages = [
    { value: "home", label: "Home Dashboard", icon: Home },
    { value: "portfolio", label: "Portfolio", icon: TrendingUp },
    { value: "goals", label: "Goals", icon: Wallet }
  ];

  const accentColors = [
    { value: "#10B981", name: "Teal" },
    { value: "#3B82F6", name: "Blue" },
    { value: "#8B5CF6", name: "Purple" },
    { value: "#F59E0B", name: "Amber" },
    { value: "#EF4444", name: "Red" },
    { value: "#EC4899", name: "Pink" }
  ];

  const handleChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    toast.success("Preference updated");
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="preferences-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Preferences</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Section 1: Display */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Palette className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            Display
          </h3>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-3">
              {preferences.theme === "light" ? (
                <Sun className="h-5 w-5" style={{ color: "#F59E0B" }} />
              ) : (
                <Moon className="h-5 w-5" style={{ color: "#8B5CF6" }} />
              )}
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Theme</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {preferences.theme === "light" ? "Light mode" : "Dark mode"}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleChange("theme", preferences.theme === "light" ? "dark" : "light")}
              className="flex gap-1 p-1 rounded-full" style={{ backgroundColor: "var(--bg-subtle)" }}
            >
              <div 
                className={`p-2 rounded-full transition-all ${preferences.theme === "light" ? "bg-white shadow" : ""}`}
              >
                <Sun className="h-4 w-4" style={{ color: preferences.theme === "light" ? "#F59E0B" : "var(--text-muted)" }} />
              </div>
              <div 
                className={`p-2 rounded-full transition-all ${preferences.theme === "dark" ? "bg-white shadow" : ""}`}
              >
                <Moon className="h-4 w-4" style={{ color: preferences.theme === "dark" ? "#8B5CF6" : "var(--text-muted)" }} />
              </div>
            </button>
          </div>

          {/* Accent Color */}
          <div className="py-4 border-b" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-3 mb-3">
              <Palette className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Accent Color</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Customize app appearance</p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              {accentColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleChange("accentColor", color.value)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    preferences.accentColor === color.value ? "ring-2 ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: color.value, ringColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Compact Mode */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Minimize2 className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Compact Mode</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Show more content with less spacing</p>
              </div>
            </div>
            <button
              onClick={() => handleChange("compactMode", !preferences.compactMode)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                preferences.compactMode ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                preferences.compactMode ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>

        {/* Section 2: Regional Settings */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Globe className="h-5 w-5" style={{ color: "#3B82F6" }} />
            Regional Settings
          </h3>

          {/* Currency */}
          <div className="py-4 border-b" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>Currency</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {currencies.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => handleChange("currency", curr.code)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    preferences.currency === curr.code ? "ring-2 ring-offset-1" : ""
                  }`}
                  style={{ 
                    backgroundColor: preferences.currency === curr.code ? "var(--brand-primary-soft)" : "var(--bg-subtle)",
                    ringColor: "var(--brand-primary)"
                  }}
                >
                  <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{curr.symbol}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{curr.code}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Number Format */}
          <div className="py-4 border-b" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-3 mb-3">
              <Hash className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>Number Format</p>
            </div>
            <div className="space-y-2">
              {numberFormats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => handleChange("numberFormat", format.value)}
                  className={`w-full p-3 rounded-xl text-left transition-all flex justify-between items-center ${
                    preferences.numberFormat === format.value ? "ring-2 ring-offset-1" : ""
                  }`}
                  style={{ 
                    backgroundColor: preferences.numberFormat === format.value ? "var(--brand-primary-soft)" : "var(--bg-subtle)",
                    ringColor: "var(--brand-primary)"
                  }}
                >
                  <span style={{ color: "var(--text-primary)" }}>{format.label}</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{format.example}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Format */}
          <div className="py-4 border-b" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>Date Format</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {dateFormats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => handleChange("dateFormat", format.value)}
                  className={`px-4 py-2 rounded-xl text-sm transition-all ${
                    preferences.dateFormat === format.value ? "text-white" : ""
                  }`}
                  style={{ 
                    backgroundColor: preferences.dateFormat === format.value ? "var(--brand-primary)" : "var(--bg-subtle)",
                    color: preferences.dateFormat === format.value ? "white" : "var(--text-secondary)"
                  }}
                >
                  {format.example}
                </button>
              ))}
            </div>
          </div>

          {/* First Day of Week */}
          <div className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <CalendarDays className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>First Day of Week</p>
            </div>
            <div className="flex gap-2">
              {weekDays.map((day) => (
                <button
                  key={day}
                  onClick={() => handleChange("firstDayOfWeek", day)}
                  className={`px-4 py-2 rounded-xl text-sm transition-all ${
                    preferences.firstDayOfWeek === day ? "text-white" : ""
                  }`}
                  style={{ 
                    backgroundColor: preferences.firstDayOfWeek === day ? "var(--brand-primary)" : "var(--bg-subtle)",
                    color: preferences.firstDayOfWeek === day ? "white" : "var(--text-secondary)"
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Dashboard Preferences */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <LayoutDashboard className="h-5 w-5" style={{ color: "#8B5CF6" }} />
            Dashboard Preferences
          </h3>

          {/* Show Net Worth Trend */}
          <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-primary)" }}>Show Net Worth Trend</span>
            </div>
            <button
              onClick={() => handleChange("showNetWorthTrend", !preferences.showNetWorthTrend)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                preferences.showNetWorthTrend ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                preferences.showNetWorthTrend ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          {/* Show Cash Flow Summary */}
          <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-primary)" }}>Show Cash Flow Summary</span>
            </div>
            <button
              onClick={() => handleChange("showCashFlowSummary", !preferences.showCashFlowSummary)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                preferences.showCashFlowSummary ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                preferences.showCashFlowSummary ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          {/* Default Landing Page */}
          <div className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <Home className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>Default Landing Page</p>
            </div>
            <div className="space-y-2">
              {landingPages.map((page) => {
                const Icon = page.icon;
                return (
                  <button
                    key={page.value}
                    onClick={() => handleChange("defaultLandingPage", page.value)}
                    className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                      preferences.defaultLandingPage === page.value ? "ring-2 ring-offset-1" : ""
                    }`}
                    style={{ 
                      backgroundColor: preferences.defaultLandingPage === page.value ? "var(--brand-primary-soft)" : "var(--bg-subtle)",
                      ringColor: "var(--brand-primary)"
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: preferences.defaultLandingPage === page.value ? "var(--brand-primary)" : "var(--text-muted)" }} />
                    <span style={{ color: "var(--text-primary)" }}>{page.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings;
