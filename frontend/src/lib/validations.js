/**
 * MONEYSSUTRA - Global Validation System
 * Comprehensive validations for the finance app
 */

// ============================================
// 1. DATE VALIDATIONS
// ============================================

/**
 * Validate that end date is not before start date
 */
export const validateDateRange = (startDate, endDate, startLabel = "Start Date", endLabel = "End Date") => {
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end < start) {
    return `${endLabel} cannot be earlier than ${startLabel}.`;
  }
  return null;
};

/**
 * Validate that date is in the future
 */
export const validateFutureDate = (date, fieldName = "Date") => {
  if (!date) return null;
  
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    return `${fieldName} must be a future date.`;
  }
  return null;
};

/**
 * Validate that date is not in the future (for historical entries)
 */
export const validatePastOrTodayDate = (date, fieldName = "Date") => {
  if (!date) return null;
  
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (selectedDate > today) {
    return `${fieldName} cannot be a future date.`;
  }
  return null;
};

/**
 * Validate day of month for frequency-based entries
 * Returns adjusted day or warning message
 */
export const validateDayOfMonth = (day, month, year) => {
  if (!day || day < 1 || day > 31) return null;
  
  const daysInMonth = new Date(year || new Date().getFullYear(), month || new Date().getMonth() + 1, 0).getDate();
  
  if (day > daysInMonth) {
    return {
      warning: `Day ${day} does not exist in this month. Will be adjusted to ${daysInMonth}.`,
      adjustedDay: daysInMonth
    };
  }
  return null;
};

/**
 * Check if premium/policy end date has passed
 */
export const isPremiumExpired = (endDate) => {
  if (!endDate) return false;
  
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return end < today;
};

// ============================================
// 2. AMOUNT VALIDATIONS
// ============================================

/**
 * Validate amount is greater than zero
 */
export const validatePositiveAmount = (amount, fieldName = "Amount") => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return `${fieldName} must be greater than zero.`;
  }
  return null;
};

/**
 * Validate amount is not negative (zero allowed)
 */
export const validateNonNegativeAmount = (amount, fieldName = "Amount") => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount < 0) {
    return `${fieldName} cannot be negative.`;
  }
  return null;
};

/**
 * Validate loan outstanding does not exceed principal
 */
export const validateLoanOutstanding = (outstanding, principal) => {
  const outstandingNum = parseFloat(outstanding) || 0;
  const principalNum = parseFloat(principal) || 0;
  
  if (outstandingNum > principalNum) {
    return "Outstanding amount cannot exceed principal amount.";
  }
  return null;
};

/**
 * Validate credit card outstanding does not exceed limit
 */
export const validateCreditCardOutstanding = (outstanding, creditLimit) => {
  const outstandingNum = parseFloat(outstanding) || 0;
  const limitNum = parseFloat(creditLimit) || 0;
  
  if (limitNum > 0 && outstandingNum > limitNum) {
    return "Outstanding amount cannot exceed credit limit.";
  }
  return null;
};

/**
 * Validate SWP withdrawal does not exceed corpus
 */
export const validateWithdrawal = (withdrawalAmount, availableCorpus) => {
  const withdrawal = parseFloat(withdrawalAmount) || 0;
  const corpus = parseFloat(availableCorpus) || 0;
  
  if (withdrawal > corpus) {
    return "Withdrawal amount exceeds available investment value.";
  }
  return null;
};

/**
 * Format and validate amount input (only numbers, max 2 decimals)
 */
export const formatAmountInput = (value) => {
  // Remove non-numeric characters except decimal
  let formatted = value.replace(/[^0-9.]/g, '');
  
  // Ensure only one decimal point
  const parts = formatted.split('.');
  if (parts.length > 2) {
    formatted = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit to 2 decimal places
  if (parts.length === 2 && parts[1].length > 2) {
    formatted = parts[0] + '.' + parts[1].substring(0, 2);
  }
  
  return formatted;
};

// ============================================
// 3. LOGICAL RELATIONSHIP VALIDATIONS
// ============================================

/**
 * Validate goal allocation does not exceed target
 */
export const validateGoalAllocation = (allocatedAmount, targetAmount) => {
  const allocated = parseFloat(allocatedAmount) || 0;
  const target = parseFloat(targetAmount) || 0;
  
  if (target > 0 && allocated > target) {
    return {
      type: 'warning',
      message: "Allocated amount exceeds goal target. Goal will be marked as over-funded."
    };
  }
  return null;
};

/**
 * Validate insurance is selected when asset is marked as insured
 */
export const validateInsuranceLink = (isInsured, insuranceId) => {
  if (isInsured && !insuranceId) {
    return "Please select or add insurance for this insured asset.";
  }
  return null;
};

/**
 * Validate account is selected for fixed expense auto-deduction
 */
export const validateFixedExpenseAccount = (expenseType, linkedAccountId, autoDeduct) => {
  if (expenseType === 'Fixed' && autoDeduct && !linkedAccountId) {
    return "Select an account for auto deduction or disable auto-deduct mode.";
  }
  return null;
};

/**
 * Check account balance for auto-deduction (warning only)
 */
export const checkAccountBalance = (deductionAmount, accountBalance, accountName) => {
  const amount = parseFloat(deductionAmount) || 0;
  const balance = parseFloat(accountBalance) || 0;
  
  if (amount > balance) {
    return {
      type: 'warning',
      message: `Insufficient balance in ${accountName || 'account'}. Balance will go negative after deduction.`
    };
  }
  return null;
};

// ============================================
// 4. CROSS-MODULE VALIDATIONS
// ============================================

/**
 * Check if item can be deleted (has linked records)
 */
export const validateDeletion = (linkedItems = []) => {
  if (linkedItems.length > 0) {
    const itemList = linkedItems.join(', ');
    return `This item is linked to: ${itemList}. Remove links before deleting.`;
  }
  return null;
};

/**
 * Check for duplicate entry
 */
export const checkDuplicateEntry = (existingItems, newItem, fields = ['name', 'date', 'amount']) => {
  const isDuplicate = existingItems.some(item => {
    return fields.every(field => {
      const existingValue = item[field]?.toString().toLowerCase().trim();
      const newValue = newItem[field]?.toString().toLowerCase().trim();
      return existingValue === newValue;
    });
  });
  
  if (isDuplicate) {
    return {
      type: 'warning',
      message: "This entry may already exist. Please verify before saving."
    };
  }
  return null;
};

// ============================================
// 5. INPUT FORMAT VALIDATIONS
// ============================================

/**
 * Validate text field (no special characters, length limit)
 */
export const validateTextField = (value, fieldName = "Field", maxLength = 100, allowSpecialChars = false) => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required.`;
  }
  
  if (value.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters.`;
  }
  
  if (!allowSpecialChars) {
    const specialCharRegex = /[<>{}[\]\\\/]/;
    if (specialCharRegex.test(value)) {
      return `${fieldName} contains invalid characters.`;
    }
  }
  
  return null;
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email) return null;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
};

/**
 * Validate mobile number (Indian format)
 */
export const validateMobile = (mobile) => {
  if (!mobile) return null;
  
  const mobileRegex = /^[6-9]\d{9}$/;
  const cleanMobile = mobile.replace(/[\s-+]/g, '');
  
  if (!mobileRegex.test(cleanMobile)) {
    return "Please enter a valid 10-digit mobile number.";
  }
  return null;
};

// ============================================
// 6. SYSTEM SAFETY VALIDATIONS
// ============================================

/**
 * Validate recurring entry has proper dates
 */
export const validateRecurringEntry = (frequency, startDate, endDate) => {
  if (!frequency || frequency === 'One-Time') return null;
  
  if (!startDate) {
    return "Start date is required for recurring entries.";
  }
  
  // End date is optional - if not provided, entry is marked as ongoing
  if (endDate) {
    const rangeError = validateDateRange(startDate, endDate, "Start Date", "End Date");
    if (rangeError) return rangeError;
  }
  
  return null;
};

// ============================================
// 7. FORM VALIDATION HELPERS
// ============================================

/**
 * Run multiple validations and return first error
 */
export const runValidations = (validations) => {
  for (const validation of validations) {
    const error = validation();
    if (error) return error;
  }
  return null;
};

/**
 * Run all validations and return all errors
 */
export const runAllValidations = (validations) => {
  const errors = {};
  
  for (const [field, validation] of Object.entries(validations)) {
    const error = typeof validation === 'function' ? validation() : validation;
    if (error) {
      errors[field] = error;
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

/**
 * Scroll to first error field
 */
export const scrollToFirstError = (errorFields) => {
  if (!errorFields || Object.keys(errorFields).length === 0) return;
  
  const firstErrorField = Object.keys(errorFields)[0];
  const element = document.querySelector(`[data-testid="${firstErrorField}"], [name="${firstErrorField}"], #${firstErrorField}`);
  
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.focus?.();
  }
};

/**
 * Get validation class for input field
 */
export const getValidationClass = (error, baseClass = '') => {
  if (error) {
    return `${baseClass} border-red-500 focus:border-red-500 focus:ring-red-500/20`;
  }
  return baseClass;
};

// ============================================
// 8. DATE-SPECIFIC VALIDATIONS BY MODULE
// ============================================

export const moduleValidationRules = {
  investment: {
    startDate: { allowPast: true, allowFuture: true },
    maturityDate: { allowPast: false, allowFuture: true, mustBeAfterStart: true }
  },
  loan: {
    startDate: { allowPast: true, allowFuture: true },
    endDate: { allowPast: false, allowFuture: true, mustBeAfterStart: true }
  },
  goal: {
    targetDate: { allowPast: false, allowFuture: true }
  },
  insurance: {
    startDate: { allowPast: true, allowFuture: true },
    endDate: { allowPast: false, allowFuture: true, mustBeAfterStart: true },
    premiumEndDate: { allowPast: true, allowFuture: true, mustBeAfterStart: true }
  },
  expense: {
    date: { allowPast: true, allowFuture: true },
    dueDate: { allowPast: false, allowFuture: true }
  },
  creditCard: {
    dueDate: { allowPast: false, allowFuture: true },
    billingDate: { allowPast: true, allowFuture: true }
  },
  income: {
    date: { allowPast: true, allowFuture: true }
  },
  asset: {
    purchaseDate: { allowPast: true, allowFuture: false }
  }
};

/**
 * Validate date based on module rules
 */
export const validateDateByModule = (module, dateField, dateValue, relatedDate = null) => {
  const rules = moduleValidationRules[module]?.[dateField];
  if (!rules || !dateValue) return null;
  
  const date = new Date(dateValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check future restriction
  if (!rules.allowFuture && date > today) {
    return `${dateField.replace(/([A-Z])/g, ' $1').trim()} cannot be a future date.`;
  }
  
  // Check past restriction
  if (!rules.allowPast && date < today) {
    return `${dateField.replace(/([A-Z])/g, ' $1').trim()} must be a future date.`;
  }
  
  // Check must be after start date
  if (rules.mustBeAfterStart && relatedDate) {
    const startDate = new Date(relatedDate);
    if (date < startDate) {
      return `${dateField.replace(/([A-Z])/g, ' $1').trim()} must be after start date.`;
    }
  }
  
  return null;
};
