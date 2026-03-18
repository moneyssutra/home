import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import SetPasswordModal from "./SetPasswordModal";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { processGoogleSession } = useAuth();
  const hasProcessed = useRef(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      // Extract session_id from URL hash
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        const result = await processGoogleSession(sessionId);
        
        if (result.success) {
          setUserData(result.user);
          
          // Google user without password → show set password modal
          if (result.user.auth_type === 'google' && !result.user.has_password) {
            setShowSetPasswordModal(true);
          } else {
            // Navigate to home with user data
            navigate("/home", { replace: true, state: { user: result.user } });
          }
        } else {
          // Navigate to login with error
          navigate("/login", { replace: true, state: { error: result.error } });
        }
      } else {
        // No session_id found, redirect to login
        navigate("/login", { replace: true });
      }
    };

    processSession();
  }, []);

  const handlePasswordSet = () => {
    // New users go to profile setup, existing users go home
    if (userData?.is_new_user) {
      navigate("/settings/profile", { replace: true, state: { completeProfile: true } });
    } else {
      navigate("/home", { replace: true, state: { user: userData } });
    }
  };

  const handleSkipPassword = () => {
    setShowSetPasswordModal(false);
    // New users go to profile setup, existing users go home
    if (userData?.is_new_user) {
      navigate("/settings/profile", { replace: true, state: { completeProfile: true } });
    } else {
      navigate("/home", { replace: true, state: { user: userData } });
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      {showSetPasswordModal ? (
        <SetPasswordModal 
          isOpen={showSetPasswordModal}
          onClose={handleSkipPassword}
          onSuccess={handlePasswordSet}
        />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#14B8A6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#334155]/60">Authenticating...</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
