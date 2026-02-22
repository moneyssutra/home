import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

/**
 * Custom hook for checking entity name uniqueness
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.collection - Collection name (income_sources, expenses, assets, etc.)
 * @param {string} config.field - Field name to check (name, expenseName, assetName, etc.)
 * @param {string} config.excludeId - ID to exclude (for edit mode)
 * @param {string} config.typeFilter - Optional type filter (for income sources)
 * @param {number} config.debounceMs - Debounce delay in milliseconds (default: 500)
 * 
 * @returns {Object} - { checkUniqueness, isChecking, isUnique, error, reset }
 */
export const useEntityUniqueness = ({
  collection,
  field,
  excludeId = null,
  typeFilter = null,
  debounceMs = 500
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isUnique, setIsUnique] = useState(null); // null = not checked, true = unique, false = duplicate
  const [error, setError] = useState("");
  const debounceRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const checkUniqueness = useCallback(async (value) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset states if value is empty
    if (!value || !value.trim()) {
      setIsChecking(false);
      setIsUnique(null);
      setError("");
      return;
    }

    // Show loading state immediately
    setIsChecking(true);
    setError("");

    // Debounce the actual API call
    debounceRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      
      try {
        const response = await axios.post(
          `${backendUrl}/api/check-entity-uniqueness`,
          {
            collection,
            field,
            value: value.trim(),
            exclude_id: excludeId,
            type_filter: typeFilter
          },
          { 
            signal: abortControllerRef.current.signal,
            withCredentials: true 
          }
        );

        setIsUnique(response.data.available);
        setError(response.data.available ? "" : response.data.message);
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
          // Request was cancelled, ignore
          return;
        }
        console.error("Error checking uniqueness:", err);
        // On error, don't block the user - allow them to continue
        setIsUnique(null);
        setError("");
      } finally {
        setIsChecking(false);
      }
    }, debounceMs);
  }, [collection, field, excludeId, typeFilter, debounceMs]);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsChecking(false);
    setIsUnique(null);
    setError("");
  }, []);

  return {
    checkUniqueness,
    isChecking,
    isUnique,
    error,
    reset
  };
};

export default useEntityUniqueness;
