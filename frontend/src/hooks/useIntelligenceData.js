import { useState, useEffect } from "react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

export function useIntelligenceData() {
  const [survivalClock, setSurvivalClock] = useState(null);
  const [controlScore, setControlScore] = useState(null);
  const [behaviorAlerts, setBehaviorAlerts] = useState(null);
  const [gamification, setGamification] = useState(null);
  const [challenges, setChallenges] = useState(null);
  const [moneyPattern, setMoneyPattern] = useState(null);
  const [futureYou, setFutureYou] = useState(null);
  const [personalityHistory, setPersonalityHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // Phase 1: Critical data (shown above the fold) — load first
      const [survivalRes, scoreRes, profileRes] = await Promise.all([
        axios.get(`${backendUrl}/api/intelligence/survival-clock`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/intelligence/control-score`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/gamification/profile`, { withCredentials: true }),
      ]);
      setSurvivalClock(survivalRes.data);
      setControlScore(scoreRes.data);
      setGamification(profileRes.data);
      setLoading(false);

      // Phase 2: Secondary data — load in background after UI renders
      const [alertsRes, challengesRes, patternRes, futureRes, historyRes] = await Promise.all([
        axios.get(`${backendUrl}/api/intelligence/behavior-alerts`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${backendUrl}/api/gamification/challenges`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${backendUrl}/api/intelligence/money-pattern`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${backendUrl}/api/intelligence/future-you`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${backendUrl}/api/intelligence/personality-history`, { withCredentials: true }).catch(() => ({ data: null })),
      ]);
      setBehaviorAlerts(alertsRes.data);
      setChallenges(challengesRes.data);
      setMoneyPattern(patternRes.data);
      setFutureYou(futureRes.data);
      setPersonalityHistory(historyRes.data);

      // Phase 3: Auto-process gamification to award any new badges
      try {
        const processRes = await axios.post(`${backendUrl}/api/gamification/process`, {}, { withCredentials: true });
        if (processRes.data) setGamification(prev => ({ ...prev, ...processRes.data }));
      } catch (e) { /* silently skip if already processed recently */ }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const processWeekly = async () => {
    try {
      const res = await axios.post(`${backendUrl}/api/gamification/process`, {}, { withCredentials: true });
      await fetchAll();
      return res.data;
    } catch (err) {
      return null;
    }
  };

  const joinChallenge = async (code) => {
    try {
      await axios.post(`${backendUrl}/api/gamification/challenges/${code}/join`, {}, { withCredentials: true });
      await fetchAll();
      return true;
    } catch {
      return false;
    }
  };

  const leaveChallenge = async (id) => {
    try {
      await axios.delete(`${backendUrl}/api/gamification/challenges/${id}/leave`, { withCredentials: true });
      await fetchAll();
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return { survivalClock, controlScore, behaviorAlerts, gamification, challenges, moneyPattern, futureYou, personalityHistory, loading, error, refresh: fetchAll, processWeekly, joinChallenge, leaveChallenge };
}
