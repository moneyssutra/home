import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import API_BASE from '../utils/apiConfig';

const API = API_BASE;

let sessionId = null;

function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function useEventTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const pageEnteredAt = useRef(Date.now());
  const prevPage = useRef("");
  const userId = user?.user_id || "anonymous";

  // Start session on mount
  useEffect(() => {
    if (!user) return;
    sessionId = generateSessionId();
    axios.post(`${API}/api/events/session`, { action: "start", sessionId, userId }, { withCredentials: true }).catch(() => {});

    // End session on unload
    const handleUnload = () => {
      const payload = JSON.stringify({ action: "end", sessionId, userId });
      navigator.sendBeacon(`${API}/api/events/session`, payload);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, [user, userId]);

  // Track page views
  useEffect(() => {
    if (!user || !sessionId) return;
    const pageName = getPageName(location.pathname);

    // Record time on previous page
    if (prevPage.current) {
      const duration = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      axios.post(`${API}/api/events/session`, {
        action: "page", sessionId, userId,
        pageName: prevPage.current, enteredAt: new Date(pageEnteredAt.current).toISOString(), durationSec: duration,
      }, { withCredentials: true }).catch(() => {});
    }

    // Track new page view event
    axios.post(`${API}/api/events/track`, {
      userId, sessionId, eventType: "page_view", pageName,
    }, { withCredentials: true }).catch(() => {});

    prevPage.current = pageName;
    pageEnteredAt.current = Date.now();
  }, [location.pathname, user, userId]);

  const trackEvent = useCallback((eventType, pageName, metadata = {}) => {
    if (!user || !sessionId) return;
    axios.post(`${API}/api/events/track`, {
      userId, sessionId, eventType, pageName, metadata,
    }, { withCredentials: true }).catch(() => {});
  }, [user, userId]);

  return { trackEvent };
}

function getPageName(pathname) {
  if (pathname === "/home" || pathname === "/") return "Home";
  if (pathname.startsWith("/wealth")) return "Wealth";
  if (pathname.startsWith("/health")) return "Health";
  if (pathname.startsWith("/goals")) return "Goals";
  if (pathname.startsWith("/expenses")) return "Expenses";
  if (pathname.startsWith("/income")) return "Income";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/insights")) return "Insights";
  if (pathname.startsWith("/profile")) return "Profile";
  return pathname.split("/").filter(Boolean)[0] || "Home";
}
