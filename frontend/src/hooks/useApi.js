import useSWR from 'swr';
import axios from 'axios';

const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

// Global fetcher with credentials
const fetcher = (url) => axios.get(url, { withCredentials: true }).then(res => res.data);

// SWR configuration for optimal mobile performance
const defaultConfig = {
  revalidateOnFocus: false,        // Don't refetch when tab regains focus
  revalidateOnReconnect: true,     // Refetch when network reconnects
  dedupingInterval: 60000,         // Dedupe requests within 60 seconds
  focusThrottleInterval: 120000,   // Throttle focus revalidation to 2 minutes
  errorRetryCount: 2,              // Limit error retries
  shouldRetryOnError: true,
  keepPreviousData: true,          // Show stale data while revalidating
};

/**
 * Hook for fetching income sources list (optimized for list view)
 * @param {string} type - Optional income type filter (Business, Job, etc.)
 * @param {object} options - SWR options
 */
export function useIncomeList(type = null, options = {}) {
  const url = type 
    ? `${backendUrl}/api/income/list/summary?type=${encodeURIComponent(type)}`
    : `${backendUrl}/api/income/list/summary`;
  
  return useSWR(url, fetcher, {
    ...defaultConfig,
    revalidateIfStale: true,
    ...options
  });
}

/**
 * Hook for fetching a single income source (full data)
 * @param {string} id - Income source ID
 * @param {object} options - SWR options
 */
export function useIncomeSource(id, options = {}) {
  return useSWR(
    id ? `${backendUrl}/api/income/${id}` : null,
    fetcher,
    {
      ...defaultConfig,
      ...options
    }
  );
}

/**
 * Hook for fetching expenses list (optimized for list view)
 * @param {object} filters - Optional filters { category, expenseType }
 * @param {object} options - SWR options
 */
export function useExpenseList(filters = {}, options = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.expenseType) params.append('expense_type', filters.expenseType);
  
  const queryString = params.toString();
  const url = queryString 
    ? `${backendUrl}/api/expenses/list/summary?${queryString}`
    : `${backendUrl}/api/expenses/list/summary`;
  
  return useSWR(url, fetcher, {
    ...defaultConfig,
    revalidateIfStale: true,
    ...options
  });
}

/**
 * Hook for fetching a single expense (full data)
 * @param {string} id - Expense ID
 * @param {object} options - SWR options
 */
export function useExpense(id, options = {}) {
  return useSWR(
    id ? `${backendUrl}/api/expenses/${id}` : null,
    fetcher,
    {
      ...defaultConfig,
      ...options
    }
  );
}

/**
 * Hook for fetching assets list
 * @param {object} options - SWR options
 */
export function useAssetList(options = {}) {
  return useSWR(`${backendUrl}/api/assets`, fetcher, {
    ...defaultConfig,
    ...options
  });
}

/**
 * Hook for fetching insurance list
 * @param {object} options - SWR options
 */
export function useInsuranceList(options = {}) {
  return useSWR(`${backendUrl}/api/insurance`, fetcher, {
    ...defaultConfig,
    ...options
  });
}

/**
 * Hook for fetching loans list
 * @param {object} options - SWR options
 */
export function useLoanList(options = {}) {
  return useSWR(`${backendUrl}/api/loans`, fetcher, {
    ...defaultConfig,
    ...options
  });
}

/**
 * Hook for fetching goals list
 * @param {object} options - SWR options
 */
export function useGoalList(options = {}) {
  return useSWR(`${backendUrl}/api/goals`, fetcher, {
    ...defaultConfig,
    ...options
  });
}

/**
 * Hook for fetching investments list
 * @param {object} options - SWR options
 */
export function useInvestmentList(options = {}) {
  return useSWR(`${backendUrl}/api/investments`, fetcher, {
    ...defaultConfig,
    ...options
  });
}

/**
 * Hook for fetching other income list
 * @param {object} options - SWR options
 */
export function useOtherIncomeList(options = {}) {
  return useSWR(`${backendUrl}/api/other-income`, fetcher, {
    ...defaultConfig,
    revalidateIfStale: true,
    ...options
  });
}

/**
 * Hook for fetching notifications
 * @param {object} options - SWR options
 */
export function useNotifications(options = {}) {
  return useSWR(`${backendUrl}/api/notifications`, fetcher, {
    ...defaultConfig,
    refreshInterval: 60000,  // Poll every minute for new notifications
    ...options
  });
}

/**
 * Hook for fetching dashboard summary data
 * @param {object} options - SWR options
 */
export function useDashboardSummary(options = {}) {
  return useSWR(`${backendUrl}/api/dashboard/summary`, fetcher, {
    ...defaultConfig,
    revalidateIfStale: true,
    ...options
  });
}

/**
 * Hook for fetching transaction history for an entity
 * @param {string} entityId - Entity ID
 * @param {string} type - 'income' or 'expense'
 * @param {object} options - SWR options
 */
export function useTransactionHistory(entityId, type = 'income', options = {}) {
  const endpoint = type === 'expense' 
    ? `${backendUrl}/api/expense-transactions/history/${entityId}`
    : `${backendUrl}/api/income-transactions/history/${entityId}`;
  
  return useSWR(
    entityId ? endpoint : null,
    fetcher,
    {
      ...defaultConfig,
      ...options
    }
  );
}

/**
 * Mutate (invalidate/refresh) cached data
 * Use this after creating, updating, or deleting data
 */
export { mutate } from 'swr';

export default {
  useIncomeList,
  useIncomeSource,
  useExpenseList,
  useExpense,
  useAssetList,
  useInsuranceList,
  useLoanList,
  useGoalList,
  useInvestmentList,
  useOtherIncomeList,
  useNotifications,
  useDashboardSummary,
  useTransactionHistory
};
