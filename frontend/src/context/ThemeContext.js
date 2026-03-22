import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE from '../utils/apiConfig';

const ThemeContext = createContext();
const backendUrl = API_BASE;

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('moneyssutra-theme');
    if (savedTheme) return savedTheme;
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Sync theme from backend after login
  const syncThemeFromBackend = useCallback(async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/settings/preferences`, { withCredentials: true });
      const serverTheme = res.data?.theme;
      if (serverTheme && (serverTheme === 'dark' || serverTheme === 'light')) {
        setTheme(serverTheme);
        localStorage.setItem('moneyssutra-theme', serverTheme);
      }
    } catch {
      // Not logged in or no preferences — keep current theme
    }
  }, []);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('moneyssutra-theme', theme);
    
    // Apply theme to document
    const root = document.documentElement;
    
    if (theme === 'dark') {
      // Dark mode colors
      root.style.setProperty('--bg-app', '#0f172a');
      root.style.setProperty('--bg-card', '#1e293b');
      root.style.setProperty('--bg-subtle', '#334155');
      root.style.setProperty('--text-primary', '#f1f5f9');
      root.style.setProperty('--text-secondary', '#cbd5e1');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-light', '#334155');
      root.style.setProperty('--brand-primary', '#10b981');
      root.style.setProperty('--brand-primary-soft', 'rgba(16, 185, 129, 0.15)');
      root.style.setProperty('--finance-gain', '#22c55e');
      root.style.setProperty('--finance-loss', '#ef4444');
      root.style.setProperty('--input-bg', '#1e293b');
      root.style.setProperty('--input-border', '#475569');
    } else {
      // Light mode colors (default)
      root.style.setProperty('--bg-app', '#f8fafc');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-subtle', '#f1f5f9');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-light', '#e2e8f0');
      root.style.setProperty('--brand-primary', '#10b981');
      root.style.setProperty('--brand-primary-soft', 'rgba(16, 185, 129, 0.1)');
      root.style.setProperty('--finance-gain', '#059669');
      root.style.setProperty('--finance-loss', '#dc2626');
      root.style.setProperty('--input-bg', '#ffffff');
      root.style.setProperty('--input-border', '#e2e8f0');
    }
    
    // Also set data attribute for CSS targeting
    document.body.setAttribute('data-theme', theme);
    
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    syncThemeFromBackend
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
