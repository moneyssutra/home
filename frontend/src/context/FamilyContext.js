import { createContext, useContext, useState, useEffect, useCallback } from "react";
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

  const switchToPersonal = () => setActiveViewId(null);
  const switchToMember = (memberId) => setActiveViewId(memberId);
  const switchToFamily = () => setActiveViewId("__family__");

  // Get the current effective userId for data queries
  const effectiveUserId = (activeViewId && activeViewId !== "__family__") ? activeViewId : (user?.user_id ?? null);

  // Get current view label
  const activeViewLabel = (() => {
    if (!activeViewId) return "Personal";
    if (activeViewId === "__family__") return family?.familyName || "Family";
    const member = family?.members?.find(m => m.id === activeViewId);
    return member?.name || member?.relationship || "Member";
  })();

  const isPersonalView = !activeViewId;
  const isFamilyView = activeViewId === "__family__";

  return (
    <FamilyContext.Provider value={{
      family,
      loading,
      activeViewId,
      effectiveUserId,
      activeViewLabel,
      isPersonalView,
      isFamilyView,
      switchToPersonal,
      switchToMember,
      switchToFamily,
      refreshFamily: fetchFamily,
    }}>
      {children}
    </FamilyContext.Provider>
  );
};
