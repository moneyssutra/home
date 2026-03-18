import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "@/context/ThemeContext";

// WebAuthn helpers
function _base64urlToBuffer(base64url) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function _bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { syncThemeFromBackend } = useTheme();

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
      setIsAuthenticated(true);
      syncThemeFromBackend();
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const setPassword = async (newPassword) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/auth/set-password`,
        { password: newPassword },
        { withCredentials: true }
      );
      // Update local user state to reflect they now have a password
      setUser(prev => ({ ...prev, has_password: true }));
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || "Failed to set password" 
      };
    }
  };

  const login = async (username, password, rememberMe = false) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/auth/login`,
        { username, password, remember_me: rememberMe },
        { withCredentials: true }
      );
      setUser(response.data);
      setIsAuthenticated(true);
      syncThemeFromBackend();
      return { success: true, user: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || "Login failed" 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/auth/register`,
        userData,
        { withCredentials: true }
      );
      setUser(response.data);
      setIsAuthenticated(true);
      return { success: true, user: response.data, isNewUser: response.data.isNewUser };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || "Registration failed" 
      };
    }
  };

  const loginWithMpin = async (email, mpin) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/mpin/login`,
        { email, mpin },
        { withCredentials: true }
      );
      setUser(response.data);
      setIsAuthenticated(true);
      syncThemeFromBackend();
      return { success: true, user: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || "MPIN login failed" 
      };
    }
  };

  const loginWithBiometric = async (email) => {
    try {
      // Step 1: Get authentication options
      const optRes = await axios.post(`${backendUrl}/api/biometric/login/options`, { email });
      const options = JSON.parse(optRes.data.options);

      // Decode challenge and allowCredentials
      options.challenge = _base64urlToBuffer(options.challenge);
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials.map(c => ({
          ...c, id: _base64urlToBuffer(c.id),
        }));
      }

      // Step 2: Prompt user for biometric
      const assertion = await navigator.credentials.get({ publicKey: options });

      // Step 3: Encode and send to server
      const credential = {
        id: assertion.id,
        rawId: _bufferToBase64url(assertion.rawId),
        type: assertion.type,
        response: {
          authenticatorData: _bufferToBase64url(assertion.response.authenticatorData),
          clientDataJSON: _bufferToBase64url(assertion.response.clientDataJSON),
          signature: _bufferToBase64url(assertion.response.signature),
          userHandle: assertion.response.userHandle ? _bufferToBase64url(assertion.response.userHandle) : null,
        },
      };

      const verifyRes = await axios.post(
        `${backendUrl}/api/biometric/login/verify`,
        { credential, email },
        { withCredentials: true }
      );

      setUser(verifyRes.data);
      setIsAuthenticated(true);
      syncThemeFromBackend();
      return { success: true, user: verifyRes.data };
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || "Biometric login failed";
      return { success: false, error: msg };
    }
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/home';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const processGoogleSession = async (sessionId) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/auth/google/session`,
        { session_id: sessionId },
        { withCredentials: true }
      );
      setUser(response.data);
      setIsAuthenticated(true);
      return { success: true, user: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || "Google authentication failed" 
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${backendUrl}/api/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    loginWithMpin,
    loginWithBiometric,
    register,
    loginWithGoogle,
    processGoogleSession,
    setPassword,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
