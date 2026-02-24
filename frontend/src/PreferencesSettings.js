import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Palette, 
  Moon, 
  Sun,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const PreferencesSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [preferences, setPreferences] = useState({
    theme: "light",
    accentColor: "#10B981"
  });

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
        setPreferences({
          theme: response.data.theme || "light",
          accentColor: response.data.accentColor || "#10B981"
        });
      }
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    // Auto-save on change
    try {
      await axios.put(`${backendUrl}/api/settings/preferences`, {
        theme: newPrefs.theme,
        accentColor: newPrefs.accentColor,
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
        language: "en"
      }, { withCredentials: true });
      toast.success("Preference saved");
    } catch (error) {
      console.error("Failed to save preference:", error);
      toast.error("Failed to save");
    }
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
          onClick={() => navigate("/home", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
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
            Color Mode
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
          <div className="py-4">
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
                  data-testid={`color-${color.name.toLowerCase()}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
          <p className="text-xs text-center" style={{ color: "var(--brand-primary)" }}>
            Dark mode and accent colors will be fully implemented in a future update
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings;
