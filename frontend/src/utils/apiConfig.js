/**
 * Centralized API base URL configuration.
 * 
 * Uses window.location.origin so the app always calls its OWN backend,
 * regardless of whether it runs on preview or a deployed domain.
 * Falls back to REACT_APP_BACKEND_URL for non-browser environments (tests, SSR).
 */
const API_BASE = typeof window !== 'undefined'
  ? window.location.origin
  : (process.env.REACT_APP_BACKEND_URL || '');

export default API_BASE;
