import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import SetMPINModal from "./SetMPINModal";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { processGoogleSession } = useAuth();
  const hasProcessed = useRef(false);
  const [showMpinModal, setShowMpinModal] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        const result = await processGoogleSession(sessionId);
        
        if (result.success) {
          setUserData(result.user);
          // New Google user → prompt to set MPIN for quick login
          if (result.user.auth_type === 'google' && result.user.is_new_user) {
            setShowMpinModal(true);
          } else {
            navigate("/home", { replace: true, state: { user: result.user } });
          }
        } else {
          navigate("/login", { replace: true, state: { error: result.error } });
        }
      } else {
        navigate("/login", { replace: true });
      }
    };

    processSession();
  }, []);

  const handleMpinSet = () => {
    setShowMpinModal(false);
    if (userData?.is_new_user) {
      navigate("/settings/profile", { replace: true, state: { completeProfile: true } });
    } else {
      navigate("/home", { replace: true, state: { user: userData } });
    }
  };

  const handleSkip = () => {
    setShowMpinModal(false);
    if (userData?.is_new_user) {
      navigate("/settings/profile", { replace: true, state: { completeProfile: true } });
    } else {
      navigate("/home", { replace: true, state: { user: userData } });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app, #0F172A)" }}>
      {showMpinModal ? (
        <SetMPINModal 
          isOpen={showMpinModal}
          onClose={handleSkip}
          onSuccess={handleMpinSet}
        />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#14B8A6] border-t-transparent rounded-full animate-spin"></div>
          <p style={{ color: "var(--text-muted, #94a3b8)" }}>Authenticating...</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
