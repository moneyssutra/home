import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, Globe, Calendar, DollarSign, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

const PreferencesSettings = () => {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    theme: "light",
    language: "English"
  });

  const currencies = [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" }
  ];

  const dateFormats = [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" }
  ];

  const handleCurrencyChange = (currency) => {
    setPreferences(prev => ({ ...prev, currency }));
    toast.success(`Currency changed to ${currency}`);
  };

  const handleDateFormatChange = (dateFormat) => {
    setPreferences(prev => ({ ...prev, dateFormat }));
    toast.success("Date format updated");
  };

  const toggleTheme = () => {
    const newTheme = preferences.theme === "light" ? "dark" : "light";
    setPreferences(prev => ({ ...prev, theme: newTheme }));
    toast.success(`Theme changed to ${newTheme} mode`);
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="preferences-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate("/settings", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Preferences</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Currency Selection */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Currency</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {currencies.map((curr) => (
              <button
                key={curr.code}
                onClick={() => handleCurrencyChange(curr.code)}
                className={`p-3 rounded-xl text-left transition-all ${preferences.currency === curr.code ? "ring-2 ring-offset-2" : ""}`}
                style={{ 
                  backgroundColor: preferences.currency === curr.code ? "var(--brand-primary-soft)" : "var(--bg-subtle)",
                  ringColor: "var(--brand-primary)"
                }}
              >
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{curr.symbol} {curr.code}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{curr.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Date Format */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5" style={{ color: "#F59E0B" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Date Format</h3>
          </div>
          <div className="space-y-2">
            {dateFormats.map((format) => (
              <button
                key={format.value}
                onClick={() => handleDateFormatChange(format.value)}
                className={`w-full p-3 rounded-xl text-left transition-all ${preferences.dateFormat === format.value ? "ring-2 ring-offset-2" : ""}`}
                style={{ 
                  backgroundColor: preferences.dateFormat === format.value ? "var(--brand-primary-soft)" : "var(--bg-subtle)",
                  ringColor: "var(--brand-primary)"
                }}
              >
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{format.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5" style={{ color: "#8B5CF6" }} />
              <div>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Theme</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {preferences.theme === "light" ? "Light mode" : "Dark mode"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: "var(--bg-subtle)" }}
            >
              {preferences.theme === "light" ? (
                <Sun className="h-6 w-6" style={{ color: "#F59E0B" }} />
              ) : (
                <Moon className="h-6 w-6" style={{ color: "#8B5CF6" }} />
              )}
            </button>
          </div>
        </div>

        {/* Language (Coming Soon) */}
        <div className="rounded-2xl p-4 opacity-60" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <div>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Language</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>English (Coming soon)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings;
