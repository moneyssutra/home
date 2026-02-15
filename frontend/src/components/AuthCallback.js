import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { processGoogleSession } = useAuth();
  const hasProcessed = useRef(false);

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
          // Navigate to home with user data
          navigate("/home", { replace: true, state: { user: result.user } });
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

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#14B8A6] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#334155]/60">Authenticating...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
