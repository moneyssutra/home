import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { useLocation } from "react-router-dom";

const API = process.env.REACT_APP_BACKEND_URL;

const FamilyContext = createContext();

export const useFamilyContext = () => useContext(FamilyContext);

export const FamilyProvider = ({ children }) => {
  const { user } = useAuth();
  const [family, setFamily] = useState(null);
  const [activeViewId, setActiveViewId] = useState(null); // null = personal (self)
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  const fetchFamily = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/family`, { withCredentials: true });
      const data = res.data.family !== undefined ? (res.data.family || null) : (res.data?.id ? res.data : null);
      setFamily(data);
    } catch {
      setFamily(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  // Reset to personal view when user changes
  useEffect(() => {
    setActiveViewId(null);
  }, [user]);

  // Auto-reset to personal view when navigating away from dashboard
  useEffect(() => {
    if (activeViewId && prevPathRef.current === '/home' && location.pathname !== '/home') {
      setActiveViewId(null);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, activeViewId]);

  const switchToPersonal = () => setActiveViewId(null);
  const switchToMember = (memberId) => setActiveViewId(memberId);

  // Get the current effective userId for data queries
  const effectiveUserId = activeViewId || (user?.user_id ?? null);

  // Get current view label
  const activeViewLabel = (() => {
    if (!activeViewId || !family) return "Personal";
    const member = family.members?.find(m => m.id === activeViewId);
    return member?.name || "Personal";
  })();

  const isPersonalView = !activeViewId;

  return (
    <FamilyContext.Provider value={{
      family,
      loading,
      activeViewId,
      effectiveUserId,
      activeViewLabel,
      isPersonalView,
      switchToPersonal,
      switchToMember,
      refreshFamily: fetchFamily,
    }}>
      {children}
    </FamilyContext.Provider>
  );
};
