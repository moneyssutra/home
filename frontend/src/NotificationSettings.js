import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Bell, 
  CreditCard, 
  PiggyBank, 
  Shield, 
  Target,
  TrendingUp,
  Mail,
  FileText,
  Trophy,
  Calendar,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const NotificationSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [financialReminders, setFinancialReminders] = useState({
    emiReminder: { enabled: true, frequency: "3_days_before" },
    sipReminder: { enabled: true, frequency: "same_day" },
    insuranceReminder: { enabled: true, frequency: "3_days_before" },
    creditCardReminder: { enabled: true, frequency: "3_days_before" },
    goalDeadline: { enabled: true, frequency: "1_day_before" },
    irregularIncome: { enabled: false, frequency: "same_day" }
  });

  const [insightsReports, setInsightsReports] = useState({
    monthlySummary: true,
    quarterlyReport: true,
    goalAchievement: true
  });

  const frequencyOptions = [
    { value: "same_day", label: "Same day" },
    { value: "1_day_before", label: "1 day before" },
    { value: "3_days_before", label: "3 days before" }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/settings/notifications`, { withCredentials: true });
      if (response.data) {
        // Map API response to local state format
        setInsightsReports({
          monthlySummary: response.data.weeklyDigest ?? true,
          quarterlyReport: response.data.monthlyReport ?? true,
          goalAchievement: response.data.goalReminders ?? true
        });
        setFinancialReminders(prev => ({
          ...prev,
          emiReminder: { ...prev.emiReminder, enabled: response.data.billReminders ?? true },
          sipReminder: { ...prev.sipReminder, enabled: response.data.incomeReminders ?? true },
          insuranceReminder: { ...prev.insuranceReminder, enabled: response.data.billReminders ?? true },
          creditCardReminder: { ...prev.creditCardReminder, enabled: response.data.expenseReminders ?? true },
          goalDeadline: { ...prev.goalDeadline, enabled: response.data.goalReminders ?? true }
        }));
      }
    } catch (error) {
      console.error("Failed to fetch notification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${backendUrl}/api/settings/notifications`, {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        incomeReminders: financialReminders.sipReminder.enabled,
        expenseReminders: financialReminders.creditCardReminder.enabled,
        billReminders: financialReminders.emiReminder.enabled,
        goalReminders: financialReminders.goalDeadline.enabled,
        weeklyDigest: insightsReports.monthlySummary,
        monthlyReport: insightsReports.quarterlyReport
      }, { withCredentials: true });
      
      toast.success("Notification preferences saved!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleFinancialToggle = (key) => {
    setFinancialReminders(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }));
  };

  const handleFrequencyChange = (key, frequency) => {
    setFinancialReminders(prev => ({
      ...prev,
      [key]: { ...prev[key], frequency }
    }));
  };

  const handleInsightToggle = (key) => {
    setInsightsReports(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const financialReminderItems = [
    { 
      key: "emiReminder", 
      title: "EMI Reminder", 
      description: "Get notified before loan EMI due dates",
      icon: CreditCard, 
      color: "#EF4444" 
    },
    { 
      key: "sipReminder", 
      title: "SIP Reminder", 
      description: "Never miss your SIP investment dates",
      icon: PiggyBank, 
      color: "#8B5CF6" 
    },
    { 
      key: "insuranceReminder", 
      title: "Insurance Premium Reminder", 
      description: "Stay on top of premium due dates",
      icon: Shield, 
      color: "#059669" 
    },
    { 
      key: "creditCardReminder", 
      title: "Credit Card Due Reminder", 
      description: "Avoid late fees on card payments",
      icon: CreditCard, 
      color: "#3B82F6" 
    },
    { 
      key: "goalDeadline", 
      title: "Goal Deadline Alert", 
      description: "Track milestones and deadlines",
      icon: Target, 
      color: "#EC4899" 
    },
    { 
      key: "irregularIncome", 
      title: "Irregular Income Tracker", 
      description: "Log freelance or side income",
      icon: TrendingUp, 
      color: "#F59E0B" 
    }
  ];

  const insightItems = [
    {
      key: "monthlySummary",
      title: "Monthly Summary",
      description: "Receive monthly financial overview",
      icon: FileText,
      color: "#3B82F6"
    },
    {
      key: "quarterlyReport",
      title: "Quarterly Report",
      description: "Detailed quarterly analysis",
      icon: Calendar,
      color: "#8B5CF6"
    },
    {
      key: "goalAchievement",
      title: "Goal Achievement",
      description: "Celebrate when you hit milestones",
      icon: Trophy,
      color: "#F59E0B"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="notification-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate("/home", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Notifications</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Financial Reminders */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Bell className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            Financial Reminders
          </h3>

          <div className="space-y-4">
            {financialReminderItems.map((item) => {
              const Icon = item.icon;
              const reminder = financialReminders[item.key];
              
              return (
                <div key={item.key} className="py-3 border-b last:border-b-0" style={{ borderColor: "var(--border-light)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: item.color }} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFinancialToggle(item.key)}
                      className={`w-12 h-7 rounded-full transition-colors flex-shrink-0 ${reminder.enabled ? "" : "bg-gray-200"}`}
                      style={{ backgroundColor: reminder.enabled ? "var(--brand-primary)" : undefined }}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${reminder.enabled ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                  
                  {reminder.enabled && (
                    <div className="mt-3 ml-13 pl-13">
                      <select
                        value={reminder.frequency}
                        onChange={(e) => handleFrequencyChange(item.key, e.target.value)}
                        className="w-full p-2 rounded-lg text-sm"
                        style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                      >
                        {frequencyOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights & Reports */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Mail className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            Insights & Reports
          </h3>

          <div className="space-y-4">
            {insightItems.map((item) => {
              const Icon = item.icon;
              const enabled = insightsReports[item.key];
              
              return (
                <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-b-0" style={{ borderColor: "var(--border-light)" }}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInsightToggle(item.key)}
                    className={`w-12 h-7 rounded-full transition-colors ${enabled ? "" : "bg-gray-200"}`}
                    style={{ backgroundColor: enabled ? "var(--brand-primary)" : undefined }}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: "var(--brand-primary)" }}
          data-testid="save-notifications-btn"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
