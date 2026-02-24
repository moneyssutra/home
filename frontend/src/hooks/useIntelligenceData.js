import { useState, useEffect } from "react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

export function useIntelligenceData() {
  const [survivalClock, setSurvivalClock] = useState(null);
  const [controlScore, setControlScore] = useState(null);
  const [behaviorAlerts, setBehaviorAlerts] = useState(null);
  const [gamification, setGamification] = useState(null);
  const [challenges, setChallenges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [survivalRes, scoreRes, alertsRes, profileRes, challengesRes] = await Promise.all([
        axios.get(`${backendUrl}/api/intelligence/survival-clock`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/intelligence/control-score`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/intelligence/behavior-alerts`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/gamification/profile`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/gamification/challenges`, { withCredentials: true }),
      ]);
      setSurvivalClock(survivalRes.data);
      setControlScore(scoreRes.data);
      setBehaviorAlerts(alertsRes.data);
      setGamification(profileRes.data);
      setChallenges(challengesRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
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

  return { survivalClock, controlScore, behaviorAlerts, gamification, challenges, loading, error, refresh: fetchAll, processWeekly, joinChallenge, leaveChallenge };
}
