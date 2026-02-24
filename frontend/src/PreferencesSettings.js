import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Palette, 
  Moon, 
  Sun
} from "lucide-react";
import { toast } from "sonner";

const PreferencesSettings = () => {
  const navigate = useNavigate();
  
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

  const handleChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    toast.success("Preference updated");
  };

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
                />
              ))}
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
          <p className="text-xs text-center" style={{ color: "var(--brand-primary)" }}>
            More preferences coming soon
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings;
