// Convert number to Indian currency words
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const convertToWords = (num) => {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + convertToWords(Math.abs(num));
  
  let words = '';
  
  // Crores (10,000,000)
  if (Math.floor(num / 10000000) > 0) {
    words += convertToWords(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }
  
  // Lakhs (100,000)
  if (Math.floor(num / 100000) > 0) {
    words += convertToWords(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }
  
  // Thousands
  if (Math.floor(num / 1000) > 0) {
    words += convertToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  
  // Hundreds
  if (Math.floor(num / 100) > 0) {
    words += convertToWords(Math.floor(num / 100)) + ' Hundred ';
    num %= 100;
  }
  
  if (num > 0) {
    if (words !== '') words += 'and ';
    
    if (num < 20) {
      words += ones[num];
    } else {
      words += tens[Math.floor(num / 10)];
      if (num % 10 > 0) {
        words += ' ' + ones[num % 10];
      }
    }
  }
  
  return words.trim();
};

export const numberToWords = (amount) => {
  if (!amount || isNaN(amount)) return '';
  
  const num = Math.abs(parseFloat(amount));
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = 'Rupees ' + convertToWords(rupees);
  
  if (paise > 0) {
    result += ' and ' + convertToWords(paise) + ' Paise';
  }
  
  result += ' Only';
  
  return result;
};

// Format amount for display
export const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0';
  const num = parseFloat(amount);
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)} K`;
  return new Intl.NumberFormat('en-IN').format(num);
};

// Format full amount with Indian numbering
export const formatFullAmount = (amount) => {
  if (!amount && amount !== 0) return '0';
  return new Intl.NumberFormat('en-IN').format(Math.round(parseFloat(amount)));
};

// Get ordinal suffix
export const getOrdinal = (n) => {
  const num = parseInt(n);
  if (num > 3 && num < 21) return 'th';
  switch (num % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Normalize expense amount to monthly based on frequency
export const normalizeToMonthly = (amount, frequency) => {
  if (!amount) return 0;
  switch (frequency) {
    case 'Daily': return amount * 30;
    case 'Weekly': return amount * 4;
    case 'Monthly': return amount;
    case 'Quarterly': return amount / 3;
    case 'Half-Yearly': return amount / 6;
    case 'Yearly': return amount / 12;
    default: return amount;
  }
};
