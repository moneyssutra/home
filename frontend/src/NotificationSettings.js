import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Mail, Smartphone, Calendar, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const NotificationSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    billReminders: true,
    goalAlerts: true,
    weeklyDigest: true,
    monthlyReport: true
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    toast.success("Settings updated");
  };

  const notificationOptions = [
    {
      id: "emailNotifications",
      title: "Email Notifications",
      description: "Receive updates and alerts via email",
      icon: Mail,
      color: "#3B82F6"
    },
    {
      id: "pushNotifications",
      title: "Push Notifications",
      description: "Get instant alerts on your device",
      icon: Smartphone,
      color: "#8B5CF6"
    },
    {
      id: "billReminders",
      title: "Bill Reminders",
      description: "Remind me before bills are due",
      icon: Calendar,
      color: "#F59E0B"
    },
    {
      id: "goalAlerts",
      title: "Goal Alerts",
      description: "Notify me about goal progress",
      icon: AlertCircle,
      color: "#059669"
    },
    {
      id: "weeklyDigest",
      title: "Weekly Digest",
      description: "Weekly summary of your finances",
      icon: Bell,
      color: "#EC4899"
    },
    {
      id: "monthlyReport",
      title: "Monthly Report",
      description: "Detailed monthly financial report",
      icon: Bell,
      color: "#06B6D4"
    }
  ];

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="notification-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate("/settings", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Notifications</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-4">
        {notificationOptions.map((option) => {
          const Icon = option.icon;
          return (
            <div 
              key={option.id}
              className="rounded-2xl p-4" 
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${option.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: option.color }} />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{option.title}</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{option.description}</p>
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(option.id)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${settings[option.id] ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <div 
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[option.id] ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationSettings;
