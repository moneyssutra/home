import { useState, useEffect } from "react";
import { Bell, BellOff, Check, X, Loader2 } from "lucide-react";
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  initPushNotifications
} from "@/utils/pushNotifications";

const PushNotificationToggle = ({ className = "" }) => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const isSupported = isPushSupported();
      setSupported(isSupported);
      
      if (isSupported) {
        setPermission(getPermissionStatus());
        const sub = await isSubscribed();
        setSubscribed(sub);
        
        // Initialize service worker
        await initPushNotifications();
        
        // Show banner if not subscribed and permission not denied
        if (!sub && getPermissionStatus() !== "denied") {
          // Check if user dismissed the banner recently
          const dismissed = localStorage.getItem("push_banner_dismissed");
          if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
            setShowBanner(true);
          }
        }
      }
    };
    
    checkStatus();
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    const result = await subscribeToPush();
    setLoading(false);
    
    if (result.success) {
      setSubscribed(true);
      setShowBanner(false);
      setPermission("granted");
    } else {
      if (result.permission === "denied") {
        setPermission("denied");
      }
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    const result = await unsubscribeFromPush();
    setLoading(false);
    
    if (result.success) {
      setSubscribed(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("push_banner_dismissed", Date.now().toString());
  };

  if (!supported) {
    return null;
  }

  // Floating banner for first-time users
  if (showBanner && !subscribed && permission !== "denied") {
    return (
      <div className={`fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 ${className}`}>
        <div className="bg-gradient-to-r from-[#00D09C] to-[#00B88A] rounded-2xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white text-sm">Enable Notifications</h4>
              <p className="text-white/80 text-xs mt-0.5">
                Get reminders for variable income entries and auto-recorded transactions.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="px-4 py-1.5 bg-white text-[#00D09C] rounded-full text-xs font-semibold flex items-center gap-1.5 hover:bg-white/90 transition-colors disabled:opacity-50"
                  data-testid="enable-push-btn"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Enable
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-1.5 bg-white/20 text-white rounded-full text-xs font-semibold hover:bg-white/30 transition-colors"
                  data-testid="dismiss-push-btn"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Settings toggle (for use in settings page)
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        {subscribed ? (
          <Bell className="w-5 h-5 text-[#00D09C]" />
        ) : (
          <BellOff className="w-5 h-5 text-gray-400" />
        )}
        <div>
          <p className="font-medium text-sm text-gray-800">
            Push Notifications
          </p>
          <p className="text-xs text-gray-500">
            {permission === "denied" 
              ? "Blocked in browser settings"
              : subscribed 
                ? "Enabled" 
                : "Disabled"}
          </p>
        </div>
      </div>
      
      {permission !== "denied" && (
        <button
          onClick={subscribed ? handleUnsubscribe : handleSubscribe}
          disabled={loading}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
            subscribed
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-[#00D09C] text-white hover:bg-[#00B88A]"
          }`}
          data-testid="toggle-push-btn"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : subscribed ? (
            "Disable"
          ) : (
            "Enable"
          )}
        </button>
      )}
    </div>
  );
};

export default PushNotificationToggle;
