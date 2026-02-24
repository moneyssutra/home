import { useState } from "react";
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
  Calendar
} from "lucide-react";
import { toast } from "sonner";

const NotificationSettings = () => {
  const navigate = useNavigate();
  
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

  const handleFinancialToggle = (key) => {
    setFinancialReminders(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }));
    toast.success("Setting updated");
  };

  const handleFrequencyChange = (key, frequency) => {
    setFinancialReminders(prev => ({
      ...prev,
      [key]: { ...prev[key], frequency }
    }));
    toast.success("Reminder frequency updated");
  };

  const handleInsightToggle = (key) => {
    setInsightsReports(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success("Setting updated");
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
      description: "Stay updated on premium due dates",
      icon: Shield, 
      color: "#3B82F6" 
    },
    { 
      key: "creditCardReminder", 
      title: "Credit Card Due Reminder", 
      description: "Avoid late payment fees",
      icon: CreditCard, 
      color: "#F59E0B" 
    },
    { 
      key: "goalDeadline", 
      title: "Goal Deadline Alert", 
      description: "Track progress before goal deadlines",
      icon: Target, 
      color: "#059669" 
    },
    { 
      key: "irregularIncome", 
      title: "Irregular Income Prompt", 
      description: "Reminder to log variable income",
      icon: TrendingUp, 
      color: "#06B6D4" 
    }
  ];

  const insightItems = [
    { 
      key: "monthlySummary", 
      title: "Monthly Summary Email", 
      description: "Receive monthly financial overview",
      icon: Mail, 
      color: "#3B82F6" 
    },
    { 
      key: "quarterlyReport", 
      title: "Quarterly Wealth Report", 
      description: "Detailed quarterly analysis",
      icon: FileText, 
      color: "#8B5CF6" 
    },
    { 
      key: "goalAchievement", 
      title: "Goal Achievement Notification", 
      description: "Celebrate when you reach goals",
      icon: Trophy, 
      color: "#F59E0B" 
    }
  ];

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
        {/* Section 1: Financial Reminders */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Calendar className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            Financial Reminders
          </h3>

          <div className="space-y-1">
            {financialReminderItems.map((item, index) => {
              const Icon = item.icon;
              const setting = financialReminders[item.key];
              
              return (
                <div 
                  key={item.key}
                  className={`py-4 ${index < financialReminderItems.length - 1 ? 'border-b' : ''}`}
                  style={{ borderColor: "var(--border-light)" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.description}</p>
                        
                        {/* Frequency Selector - only show when enabled */}
                        {setting.enabled && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {frequencyOptions.map((freq) => (
                              <button
                                key={freq.value}
                                onClick={() => handleFrequencyChange(item.key, freq.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                  setting.frequency === freq.value ? 'text-white' : ''
                                }`}
                                style={{
                                  backgroundColor: setting.frequency === freq.value ? item.color : "var(--bg-subtle)",
                                  color: setting.frequency === freq.value ? "white" : "var(--text-secondary)"
                                }}
                              >
                                {freq.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Toggle */}
                    <button
                      onClick={() => handleFinancialToggle(item.key)}
                      className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-3 ${
                        setting.enabled ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <div 
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          setting.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Insights & Reports */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Bell className="h-5 w-5" style={{ color: "#8B5CF6" }} />
            Insights & Reports
          </h3>

          <div className="space-y-1">
            {insightItems.map((item, index) => {
              const Icon = item.icon;
              
              return (
                <div 
                  key={item.key}
                  className={`flex items-center justify-between py-4 ${
                    index < insightItems.length - 1 ? 'border-b' : ''
                  }`}
                  style={{ borderColor: "var(--border-light)" }}
                >
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
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      insightsReports[item.key] ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <div 
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        insightsReports[item.key] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Note */}
        <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
          <p className="text-xs text-center" style={{ color: "var(--brand-primary)" }}>
            Changes are saved automatically
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
