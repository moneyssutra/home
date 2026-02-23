import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

/**
 * Record an income transaction
 * @param {Object} data - Transaction data
 * @param {string} data.entityId - ID of the income source
 * @param {number} data.amount - Transaction amount
 * @param {string} data.transactionDate - Date in YYYY-MM-DD format
 * @param {string} [data.notes] - Optional notes
 * @returns {Promise<Object>} - Created transaction
 */
export const recordIncomeTransaction = async (data) => {
  try {
    const response = await axios.post(`${backendUrl}/api/income-transactions`, {
      entityId: data.entityId,
      amount: data.amount,
      transactionDate: data.transactionDate,
      notes: data.notes || "",
      source: "manual"
    });
    return response.data;
  } catch (error) {
    console.error("Error recording income transaction:", error);
    throw error;
  }
};

/**
 * Record an expense transaction
 * @param {Object} data - Transaction data
 * @param {string} data.entityId - ID of the expense
 * @param {number} data.amount - Transaction amount
 * @param {string} data.transactionDate - Date in YYYY-MM-DD format
 * @param {string} [data.notes] - Optional notes
 * @returns {Promise<Object>} - Created transaction
 */
export const recordExpenseTransaction = async (data) => {
  try {
    const response = await axios.post(`${backendUrl}/api/expense-transactions`, {
      entityId: data.entityId,
      amount: data.amount,
      transactionDate: data.transactionDate,
      notes: data.notes || "",
      source: "manual"
    });
    return response.data;
  } catch (error) {
    console.error("Error recording expense transaction:", error);
    throw error;
  }
};

/**
 * Get income transaction history for an entity
 * @param {string} entityId - ID of the income source
 * @returns {Promise<Object>} - Transaction history with summary
 */
export const getIncomeTransactionHistory = async (entityId) => {
  try {
    const response = await axios.get(`${backendUrl}/api/income-transactions/history/${entityId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching income transaction history:", error);
    throw error;
  }
};

/**
 * Get expense transaction history for an entity
 * @param {string} entityId - ID of the expense
 * @returns {Promise<Object>} - Transaction history with summary
 */
export const getExpenseTransactionHistory = async (entityId) => {
  try {
    const response = await axios.get(`${backendUrl}/api/expense-transactions/history/${entityId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching expense transaction history:", error);
    throw error;
  }
};

/**
 * Get monthly income summary
 * @param {string} [month] - Month in YYYY-MM format (defaults to current month)
 * @returns {Promise<Object>} - Monthly income summary
 */
export const getMonthlyIncomeSummary = async (month) => {
  try {
    const url = month 
      ? `${backendUrl}/api/income-transactions/monthly-summary?month=${month}`
      : `${backendUrl}/api/income-transactions/monthly-summary`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching monthly income summary:", error);
    throw error;
  }
};

/**
 * Get monthly expense summary
 * @param {string} [month] - Month in YYYY-MM format (defaults to current month)
 * @returns {Promise<Object>} - Monthly expense summary
 */
export const getMonthlyExpenseSummary = async (month) => {
  try {
    const url = month 
      ? `${backendUrl}/api/expense-transactions/monthly-summary?month=${month}`
      : `${backendUrl}/api/expense-transactions/monthly-summary`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching monthly expense summary:", error);
    throw error;
  }
};

/**
 * Delete an income transaction (only if not locked)
 * @param {string} transactionId - ID of the transaction to delete
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteIncomeTransaction = async (transactionId) => {
  try {
    const response = await axios.delete(`${backendUrl}/api/income-transactions/${transactionId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting income transaction:", error);
    throw error;
  }
};

/**
 * Update an income transaction (only if not locked)
 * @param {string} transactionId - ID of the transaction to update
 * @param {Object} data - Updated transaction data
 * @returns {Promise<Object>} - Updated transaction
 */
export const updateIncomeTransaction = async (transactionId, data) => {
  try {
    const response = await axios.put(`${backendUrl}/api/income-transactions/${transactionId}`, {
      amount: data.amount,
      transactionDate: data.transactionDate,
      notes: data.notes || ""
    });
    return response.data;
  } catch (error) {
    console.error("Error updating income transaction:", error);
    throw error;
  }
};

/**
 * Delete an expense transaction (only if not locked)
 * @param {string} transactionId - ID of the transaction to delete
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteExpenseTransaction = async (transactionId) => {
  try {
    const response = await axios.delete(`${backendUrl}/api/expense-transactions/${transactionId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting expense transaction:", error);
    throw error;
  }
};

/**
 * Dismiss notifications related to an entity (called after recording a transaction)
 * @param {string} entityId - ID of the income/expense source
 * @returns {Promise<Object>} - Deletion result
 */
export const dismissRelatedNotifications = async (entityId) => {
  try {
    const response = await axios.delete(`${backendUrl}/api/notifications/by-entity/${entityId}`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    // Don't throw - this is a non-critical operation
    console.log("Note: Could not dismiss related notifications:", error.message);
    return { success: false };
  }
};

export default {
  recordIncomeTransaction,
  recordExpenseTransaction,
  getIncomeTransactionHistory,
  getExpenseTransactionHistory,
  getMonthlyIncomeSummary,
  getMonthlyExpenseSummary,
  deleteIncomeTransaction,
  updateIncomeTransaction,
  deleteExpenseTransaction,
  dismissRelatedNotifications
};
