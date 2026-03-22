import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import API_BASE from '../utils/apiConfig';

const API = API_BASE;

const FamilyContext = createContext();

export const useFamilyContext = () => useContext(FamilyContext);

export const FamilyProvider = ({ children }) => {
  const { user } = useAuth();
  const [family, setFamily] = useState(null);
  const [activeViewId, setActiveViewId] = useState(null); // null = personal (self)
  const [loading, setLoading] = useState(false);
  const [quickSummary, setQuickSummary] = useState(null);

  const fetchFamily = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [famRes, summaryRes] = await Promise.all([
        axios.get(`${API}/api/family`, { withCredentials: true }),
        axios.get(`${API}/api/family/quick-summary`, { withCredentials: true }).catch(() => ({ data: null })),
      ]);
      const data = famRes.data.family !== undefined ? (famRes.data.family || null) : (famRes.data?.id ? famRes.data : null);
      setFamily(data);
      setQuickSummary(summaryRes.data);
    } catch {
      setFamily(null);
      setQuickSummary(null);
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
      quickSummary,
      switchToPersonal,
      switchToMember,
      switchToFamily,
      refreshFamily: fetchFamily,
    }}>
      {children}
    </FamilyContext.Provider>
  );
};
