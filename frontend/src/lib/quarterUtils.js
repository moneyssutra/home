/**
 * Quarter Utility Functions
 * Provides helper functions for quarter-based date restrictions
 */

// Quarter to month index mapping (0-indexed)
export const QUARTER_MONTHS = {
  Q1: [0, 1, 2],      // January, February, March
  Q2: [3, 4, 5],      // April, May, June
  Q3: [6, 7, 8],      // July, August, September
  Q4: [9, 10, 11],    // October, November, December
};

// Half-year to month index mapping
export const HALF_YEAR_MONTHS = {
  H1: [0, 1, 2, 3, 4, 5],      // January - June
  H2: [6, 7, 8, 9, 10, 11],    // July - December
};

// Month names for display
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Get the allowed month indices for a given quarter
 * @param {string} quarter - Quarter identifier (Q1, Q2, Q3, Q4) or label like "Q1 (Jan–Mar)"
 * @returns {number[]} Array of month indices (0-11)
 */
export const getQuarterMonths = (quarter) => {
  if (!quarter) return null;
  
  // Handle both "Q1" format and "Q1 (Jan–Mar)" format
  const quarterKey = quarter.startsWith("Q") ? quarter.substring(0, 2).toUpperCase() : null;
  
  if (quarterKey && QUARTER_MONTHS[quarterKey]) {
    return QUARTER_MONTHS[quarterKey];
  }
  
  // Try to match by label pattern
  if (quarter.includes("Jan") || quarter.includes("Q1")) return QUARTER_MONTHS.Q1;
  if (quarter.includes("Apr") || quarter.includes("Q2")) return QUARTER_MONTHS.Q2;
  if (quarter.includes("Jul") || quarter.includes("Q3")) return QUARTER_MONTHS.Q3;
  if (quarter.includes("Oct") || quarter.includes("Q4")) return QUARTER_MONTHS.Q4;
  
  return null;
};

/**
 * Get the allowed month indices for a given half-year
 * @param {string} half - Half-year identifier (H1, H2) or label like "Jan–Jun"
 * @returns {number[]} Array of month indices (0-11)
 */
export const getHalfYearMonths = (half) => {
  if (!half) return null;
  
  // Handle both "H1" format and "Jan–Jun" format
  if (half === "H1" || half.includes("Jan–Jun") || half.includes("Jan-Jun")) {
    return HALF_YEAR_MONTHS.H1;
  }
  if (half === "H2" || half.includes("Jul–Dec") || half.includes("Jul-Dec")) {
    return HALF_YEAR_MONTHS.H2;
  }
  
  return null;
};

/**
 * Check if a date falls within a specific quarter
 * @param {Date} date - The date to check
 * @param {string} quarter - Quarter identifier
 * @returns {boolean}
 */
export const isDateInQuarter = (date, quarter) => {
  if (!date || !quarter) return true; // Allow if not specified
  
  const allowedMonths = getQuarterMonths(quarter);
  if (!allowedMonths) return true;
  
  const month = date.getMonth();
  return allowedMonths.includes(month);
};

/**
 * Check if a date falls within a specific half-year
 * @param {Date} date - The date to check
 * @param {string} half - Half-year identifier
 * @returns {boolean}
 */
export const isDateInHalfYear = (date, half) => {
  if (!date || !half) return true;
  
  const allowedMonths = getHalfYearMonths(half);
  if (!allowedMonths) return true;
  
  const month = date.getMonth();
  return allowedMonths.includes(month);
};

/**
 * Get the first allowed date for a quarter in a given year
 * @param {string} quarter - Quarter identifier
 * @param {number} year - Year
 * @returns {Date}
 */
export const getQuarterStartDate = (quarter, year = new Date().getFullYear()) => {
  const months = getQuarterMonths(quarter);
  if (!months) return new Date(year, 0, 1);
  return new Date(year, months[0], 1);
};

/**
 * Get the last allowed date for a quarter in a given year
 * @param {string} quarter - Quarter identifier
 * @param {number} year - Year
 * @returns {Date}
 */
export const getQuarterEndDate = (quarter, year = new Date().getFullYear()) => {
  const months = getQuarterMonths(quarter);
  if (!months) return new Date(year, 11, 31);
  const lastMonth = months[months.length - 1];
  const lastDay = new Date(year, lastMonth + 1, 0).getDate();
  return new Date(year, lastMonth, lastDay);
};

/**
 * Create a date disabled function for react-day-picker
 * @param {number[]} allowedMonths - Array of allowed month indices (0-11)
 * @returns {function} Matcher function for disabled dates
 */
export const createQuarterDisabledMatcher = (allowedMonths) => {
  if (!allowedMonths || allowedMonths.length === 0) return undefined;
  
  return (date) => {
    const month = date.getMonth();
    return !allowedMonths.includes(month);
  };
};

/**
 * Validate if a selected date matches the quarter constraint
 * @param {string} dateString - Date string (YYYY-MM-DD format)
 * @param {string} quarter - Quarter identifier
 * @returns {string|null} Error message or null if valid
 */
export const validateQuarterDate = (dateString, quarter) => {
  if (!dateString || !quarter) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  
  if (!isDateInQuarter(date, quarter)) {
    const allowedMonths = getQuarterMonths(quarter);
    if (allowedMonths) {
      const monthNames = allowedMonths.map(i => MONTH_NAMES[i]).join(", ");
      return `Please select a date within the chosen quarter (${monthNames}).`;
    }
    return "Please select a date within the chosen quarter.";
  }
  
  return null;
};

/**
 * Validate if a selected date matches the half-year constraint
 * @param {string} dateString - Date string (YYYY-MM-DD format)
 * @param {string} half - Half-year identifier
 * @returns {string|null} Error message or null if valid
 */
export const validateHalfYearDate = (dateString, half) => {
  if (!dateString || !half) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  
  if (!isDateInHalfYear(date, half)) {
    const allowedMonths = getHalfYearMonths(half);
    if (allowedMonths) {
      const monthNames = allowedMonths.map(i => MONTH_NAMES[i]).join(", ");
      return `Please select a date within the chosen half-year (${monthNames}).`;
    }
    return "Please select a date within the chosen half-year.";
  }
  
  return null;
};

export default {
  QUARTER_MONTHS,
  HALF_YEAR_MONTHS,
  MONTH_NAMES,
  getQuarterMonths,
  getHalfYearMonths,
  isDateInQuarter,
  isDateInHalfYear,
  getQuarterStartDate,
  getQuarterEndDate,
  createQuarterDisabledMatcher,
  validateQuarterDate,
  validateHalfYearDate,
};
