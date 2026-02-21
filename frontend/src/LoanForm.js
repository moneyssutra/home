import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Trash2, Building2, Home, ExternalLink, Plus } from "lucide-react";
import axios from "axios";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import { RestrictedDatePicker } from "@/components/ui/date-picker";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { ValidationMessage } from "@/components/ValidationMessage";
import { 
  validatePositiveAmount, 
  validateLoanOutstanding, 
  validateDateRange,
  validateTextField,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";

const LoanIncome = () => {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  // Form fields
  const [loanType, setLoanType] = useState("");
  const [loanName, setLoanName] = useState("");
  const [lenderName, setLenderName] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [emiAmount, setEmiAmount] = useState("");
  const [emiFrequency, setEmiFrequency] = useState("Monthly");
  const [tenureMonths, setTenureMonths] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasLinkedAsset, setHasLinkedAsset] = useState(false);
  const [linkedAssetId, setLinkedAssetId] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [autoCreateExpense, setAutoCreateExpense] = useState(true);
  
  // Track if end date was manually overridden
  const [endDateManuallySet, setEndDateManuallySet] = useState(false);
  
  // Assets and Accounts for linking
  const [assets, setAssets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [reverseLinkedAssets, setReverseLinkedAssets] = useState([]); // Assets that link to this loan
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  // Today's date for maxDate constraint
  const today = format(new Date(), "yyyy-MM-dd");

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const loanTypeOptions = [
    "Home Loan",
    "Vehicle Loan",
    "Personal Loan",
    "Education Loan",
    "Business Loan",
    "Gold Loan",
    "Credit Card Dues",
    "Hand Loan Taken",
    "Other"
  ];

  const emiFrequencyOptions = ["Monthly", "Quarterly", "Half-Yearly"];

  // Fetch assets, accounts and loan data
  useEffect(() => {
    fetchAssets();
    fetchAccounts();
    if (id) {
      fetchLoanData();
    }
  }, [id]);

  // Restore form state if returning from asset creation
  useEffect(() => {
    if (location.state?.loanFormData) {
      const data = location.state.loanFormData;
      setLoanType(data.loanType || "");
      setLoanName(data.loanName || "");
      setLenderName(data.lenderName || "");
      setPrincipalAmount(data.principalAmount || "");
      setOutstandingAmount(data.outstandingAmount || "");
      setInterestRate(data.interestRate || "");
      setEmiAmount(data.emiAmount || "");
      setEmiFrequency(data.emiFrequency || "Monthly");
      setTenureMonths(data.tenureMonths || "");
      setStartDate(data.startDate || "");
      setEndDate(data.endDate || "");
      setHasLinkedAsset(data.hasLinkedAsset || false);
      setLinkedAccountId(data.linkedAccountId || "");
      setAutoCreateExpense(data.autoCreateExpense !== false);
      
      // If a new asset was just created, set it as linked
      if (location.state?.newAssetId) {
        fetchAssets().then(() => {
          setLinkedAssetId(location.state.newAssetId);
          setHasLinkedAsset(true);
        });
      }
    }
  }, [location.state]);

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/assets`);
      setAssets(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching assets:", error);
      return [];
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchLoanData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/loans/${id}`);
      const data = response.data;
      
      setLoanType(data.loanType || "");
      setLoanName(data.loanName || "");
      setLenderName(data.lenderName || "");
      setPrincipalAmount(data.principalAmount?.toString() || "");
      setOutstandingAmount(data.outstandingAmount?.toString() || "");
      setInterestRate(data.interestRate?.toString() || "");
      setEmiAmount(data.emiAmount?.toString() || "");
      setEmiFrequency(data.emiFrequency || "Monthly");
      setTenureMonths(data.tenureMonths?.toString() || "");
      setStartDate(data.startDate || "");
      setEndDate(data.endDate || "");
      setLinkedAssetId(data.linkedAssetId || "");
      setHasLinkedAsset(!!data.linkedAssetId);
      setLinkedAccountId(data.linkedAccountId || "");
      setAutoCreateExpense(data.autoCreateExpense !== false);
      
      // Fetch reverse-linked assets (assets that have this loan linked)
      try {
        const linkedResponse = await axios.get(`${backendUrl}/api/loans/${id}/linked-assets`);
        setReverseLinkedAssets(linkedResponse.data || []);
      } catch (e) {
        console.log("No reverse linked assets found");
      }
    } catch (error) {
      console.error("Error fetching loan data:", error);
      setErrors({ submit: "Failed to load loan data" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate EMI when principal, rate, tenure change
  useEffect(() => {
    const p = parseFloat(principalAmount) || 0;
    const r = (parseFloat(interestRate) || 0) / 12 / 100;
    const n = parseInt(tenureMonths) || 0;
    
    if (p > 0 && r > 0 && n > 0) {
      const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      setEmiAmount(emi.toFixed(2));
    }
  }, [principalAmount, interestRate, tenureMonths]);

  // Auto-calculate Outstanding Amount based on EMIs paid since start date
  useEffect(() => {
    if (!principalAmount || !startDate || !emiAmount || !interestRate) return;
    
    const p = parseFloat(principalAmount) || 0;
    const emi = parseFloat(emiAmount) || 0;
    const monthlyRate = (parseFloat(interestRate) || 0) / 12 / 100;
    
    if (p <= 0 || emi <= 0) return;
    
    const start = new Date(startDate);
    const today = new Date();
    const monthsDiff = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    const emiPaid = Math.max(0, monthsDiff);
    
    if (emiPaid === 0) {
      setOutstandingAmount(p.toFixed(2));
      return;
    }
    
    let balance = p;
    for (let i = 0; i < emiPaid && balance > 0; i++) {
      const interestForMonth = balance * monthlyRate;
      const principalForMonth = emi - interestForMonth;
      balance = Math.max(0, balance - principalForMonth);
    }
    
    setOutstandingAmount(balance.toFixed(2));
  }, [principalAmount, startDate, emiAmount, interestRate]);

  // Auto-calculate End Date based on start date and tenure (only if not manually set)
  useEffect(() => {
    if (!endDateManuallySet && startDate && tenureMonths) {
      const start = new Date(startDate);
      const tenure = parseInt(tenureMonths) || 0;
      if (tenure > 0) {
        start.setMonth(start.getMonth() + tenure);
        setEndDate(start.toISOString().split('T')[0]);
      }
    }
    // Reset end date if tenure is cleared
    if (!tenureMonths && !endDateManuallySet) {
      setEndDate("");
    }
  }, [startDate, tenureMonths, endDateManuallySet]);

  // Handle manual end date change
  const handleEndDateChange = (date) => {
    setEndDate(date);
    setEndDateManuallySet(true);
  };

  // Reset manual override when tenure changes
  const handleTenureChange = (e) => {
    const value = formatAmountInput(e.target.value);
    setTenureMonths(value);
    setEndDateManuallySet(false); // Allow auto-calculation again
  };

  const handleAmountChange = (setter) => (e) => {
    const value = formatAmountInput(e.target.value);
    setter(value);
  };

  // Navigate to add asset page while preserving loan form state
  const handleAddAsset = () => {
    const formData = {
      loanType,
      loanName,
      lenderName,
      principalAmount,
      outstandingAmount,
      interestRate,
      emiAmount,
      emiFrequency,
      tenureMonths,
      startDate,
      endDate,
      hasLinkedAsset: true,
      linkedAccountId,
      autoCreateExpense
    };
    
    // Navigate to asset form with return state
    navigate('/asset', {
      state: {
        returnTo: id ? `/loan/${id}` : '/loan',
        loanFormData: formData,
        fromLoanFlow: true
      }
    });
  };

  // Real-time validation for specific fields
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'principalAmount':
        const principalError = validatePositiveAmount(value, "Principal amount");
        if (principalError) newErrors.principalAmount = principalError;
        else delete newErrors.principalAmount;
        // Also validate outstanding if principal changes
        if (outstandingAmount) {
          const outstandingError = validateLoanOutstanding(outstandingAmount, value);
          if (outstandingError) newErrors.outstandingAmount = outstandingError;
          else if (!validatePositiveAmount(outstandingAmount)) delete newErrors.outstandingAmount;
        }
        break;
      case 'outstandingAmount':
        const outstandingValidation = validateLoanOutstanding(value, principalAmount);
        if (outstandingValidation) newErrors.outstandingAmount = outstandingValidation;
        else delete newErrors.outstandingAmount;
        break;
      case 'endDate':
        if (startDate && value) {
          const dateError = validateDateRange(startDate, value, "Start Date", "End Date");
          if (dateError) newErrors.endDate = dateError;
          else delete newErrors.endDate;
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
  };

  const validate = () => {
    const newErrors = {};

    // Loan Type validation
    if (!loanType) {
      newErrors.loanType = "Please select a loan type.";
    }

    // Loan Name validation
    const nameError = validateTextField(loanName, "Loan name", 100);
    if (nameError) newErrors.loanName = nameError;

    // Principal Amount validation
    const principalError = validatePositiveAmount(principalAmount, "Principal amount");
    if (principalError) newErrors.principalAmount = principalError;

    // Outstanding Amount validation
    if (!outstandingAmount || parseFloat(outstandingAmount) < 0) {
      newErrors.outstandingAmount = "Outstanding amount cannot be negative.";
    } else {
      const outstandingError = validateLoanOutstanding(outstandingAmount, principalAmount);
      if (outstandingError) newErrors.outstandingAmount = outstandingError;
    }

    // Interest Rate validation
    const rateError = validatePositiveAmount(interestRate, "Interest rate");
    if (rateError) newErrors.interestRate = rateError;

    // EMI Amount validation
    const emiError = validatePositiveAmount(emiAmount, "EMI amount");
    if (emiError) newErrors.emiAmount = emiError;

    // Start Date validation
    if (!startDate) {
      newErrors.startDate = "Start date is required.";
    }

    // End Date validation (must be after start date)
    if (startDate && endDate) {
      const dateError = validateDateRange(startDate, endDate, "Start Date", "End Date");
      if (dateError) newErrors.endDate = dateError;
    }

    setErrors(newErrors);
    
    // Scroll to first error
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(newErrors);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (id) {
      setShowUpdateConfirm(true);
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true);
    setShowUpdateConfirm(false);
    
    try {
      const payload = {
        loanType,
        loanName,
        lenderName: lenderName || null,
        principalAmount: parseFloat(principalAmount),
        outstandingAmount: parseFloat(outstandingAmount),
        interestRate: parseFloat(interestRate),
        emiAmount: parseFloat(emiAmount),
        emiFrequency,
        tenureMonths: parseInt(tenureMonths) || null,
        startDate,
        endDate: endDate || null,
        linkedAssetId: linkedAssetId || null,
        linkedAccountId: linkedAccountId || null,
        autoCreateExpense,
      };

      let savedLoanId = id;
      
      if (id) {
        await axios.put(`${backendUrl}/api/loans/${id}`, payload);
      } else {
        const response = await axios.post(`${backendUrl}/api/loans`, payload);
        savedLoanId = response.data.id;
      }
      
      // If we came from asset form, return there with the new loan ID
      if (location.state?.returnTo && location.state?.assetFormData) {
        navigate(location.state.returnTo, {
          state: {
            assetFormData: location.state.assetFormData,
            newLoanId: savedLoanId
          }
        });
      } else {
        navigate("/my-loans");
      }
    } catch (error) {
      console.error("Error saving loan:", error);
      setErrors({ submit: "Failed to save. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setIsSubmitting(true);
    setShowDeleteConfirm(false);
    
    try {
      await axios.delete(`${backendUrl}/api/loans/${id}`);
      navigate("/my-loans");
    } catch (error) {
      console.error("Error deleting loan:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="loan-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A]"
          onClick={() => {
            if (location.state?.returnTo && location.state?.assetFormData) {
              navigate(location.state.returnTo, {
                state: { assetFormData: location.state.assetFormData }
              });
            } else {
              navigate("/my-loans");
            }
          }}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#334155]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Loan" : "Add Loan"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Loan Type */}
            <div className="w-full">
              <label htmlFor="loanType" className="block text-sm font-medium text-[#334155] mb-2">
                Loan Type
              </label>
              <select
                id="loanType"
                value={loanType}
                onChange={(e) => setLoanType(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="loan-type-select"
              >
                <option value="">Select Loan Type</option>
                {loanTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.loanType && <p className="text-sm text-red-500 mt-1">{errors.loanType}</p>}
            </div>

            {/* Loan Name */}
            <div className="w-full">
              <label htmlFor="loanName" className="block text-sm font-medium text-[#334155] mb-2">
                Loan Name
              </label>
              <input
                id="loanName"
                type="text"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder="e.g., HDFC Home Loan, SBI Car Loan"
                maxLength={50}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="loan-name-input"
              />
              {errors.loanName && <p className="text-sm text-red-500 mt-1">{errors.loanName}</p>}
            </div>

            {/* Lender Name */}
            <div className="w-full">
              <label htmlFor="lenderName" className="block text-sm font-medium text-[#334155] mb-2">
                Lender Name <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <input
                id="lenderName"
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                placeholder="e.g., HDFC Bank, SBI"
                maxLength={50}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="lender-name-input"
              />
            </div>

            {/* Principal Amount */}
            <div className="w-full">
              <label htmlFor="principalAmount" className="block text-sm font-medium text-[#334155] mb-2">
                Principal Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="principalAmount"
                  type="text"
                  value={principalAmount}
                  onChange={handleAmountChange(setPrincipalAmount)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="principal-amount-input"
                />
              </div>
              {parseFloat(principalAmount) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="principal-amount-words">
                  {numberToWords(parseFloat(principalAmount))}
                </p>
              )}
              {errors.principalAmount && <p className="text-sm text-red-500 mt-1">{errors.principalAmount}</p>}
            </div>

            {/* Outstanding Amount */}
            <div className="w-full">
              <label htmlFor="outstandingAmount" className="block text-sm font-medium text-[#334155] mb-2">
                Current Outstanding Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="outstandingAmount"
                  type="text"
                  value={outstandingAmount}
                  onChange={handleAmountChange(setOutstandingAmount)}
                  placeholder="Auto-calculated or enter manually"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="outstanding-amount-input"
                />
              </div>
              {parseFloat(outstandingAmount) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="outstanding-amount-words">
                  {numberToWords(parseFloat(outstandingAmount))}
                </p>
              )}
              {errors.outstandingAmount && <p className="text-sm text-red-500 mt-1">{errors.outstandingAmount}</p>}
              <p className="text-xs text-[#334155]/60 mt-1">This affects your Net Worth calculation</p>
            </div>

            {/* Interest Rate */}
            <div className="w-full">
              <label htmlFor="interestRate" className="block text-sm font-medium text-[#334155] mb-2">
                Interest Rate (% per annum)
              </label>
              <div className="relative">
                <input
                  id="interestRate"
                  type="text"
                  value={interestRate}
                  onChange={handleAmountChange(setInterestRate)}
                  placeholder="e.g., 8.5"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 pr-10 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="interest-rate-input"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#334155]/60">%</span>
              </div>
              {errors.interestRate && <p className="text-sm text-red-500 mt-1">{errors.interestRate}</p>}
            </div>

            {/* Tenure */}
            <div className="w-full">
              <label htmlFor="tenureMonths" className="block text-sm font-medium text-[#334155] mb-2">
                Tenure (Months) <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <input
                id="tenureMonths"
                type="text"
                value={tenureMonths}
                onChange={handleTenureChange}
                placeholder="e.g., 240 for 20 years"
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="tenure-input"
              />
              {tenureMonths && parseInt(tenureMonths) > 0 && (
                <p className="text-xs text-[#334155]/60 mt-1">
                  {Math.floor(parseInt(tenureMonths) / 12)} years {parseInt(tenureMonths) % 12} months
                </p>
              )}
            </div>

            {/* EMI Amount */}
            <div className="w-full">
              <label htmlFor="emiAmount" className="block text-sm font-medium text-[#334155] mb-2">
                EMI Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="emiAmount"
                  type="text"
                  value={emiAmount}
                  onChange={handleAmountChange(setEmiAmount)}
                  placeholder="Auto-calculated"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="emi-amount-input"
                />
              </div>
              {parseFloat(emiAmount) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="emi-amount-words">
                  {numberToWords(parseFloat(emiAmount))}
                </p>
              )}
              {errors.emiAmount && <p className="text-sm text-red-500 mt-1">{errors.emiAmount}</p>}
            </div>

            {/* EMI Frequency */}
            <div className="w-full">
              <label htmlFor="emiFrequency" className="block text-sm font-medium text-[#334155] mb-2">
                EMI Frequency
              </label>
              <select
                id="emiFrequency"
                value={emiFrequency}
                onChange={(e) => setEmiFrequency(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="emi-frequency-select"
              >
                {emiFrequencyOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Loan Start Date
              </label>
              <RestrictedDatePicker
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  // Reset end date if it's before the new start date
                  if (endDate && date > endDate) {
                    setEndDate("");
                  }
                }}
                maxDate={today}
                placeholder="Select start date"
                error={!!errors.startDate}
                testId="start-date-input"
              />
              {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
            </div>

            {/* End Date */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Loan End Date <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <RestrictedDatePicker
                value={endDate}
                onChange={handleEndDateChange}
                minDate={startDate || undefined}
                placeholder="Select end date"
                error={!!errors.endDate}
                testId="end-date-input"
              />
              {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>}
              <p className="text-xs text-[#334155]/60 mt-1">
                {endDateManuallySet ? "Manually set (override)" : "Auto-calculated from start date + tenure"}
              </p>
            </div>

            {/* Linked Asset Toggle */}
            <div className="w-full rounded-xl border border-[#334155] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#334155]">
                    Is This Loan For An Asset?
                  </label>
                  <p className="text-xs text-[#334155]/60 mt-0.5">E.g., Home loan, Vehicle loan</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHasLinkedAsset(!hasLinkedAsset);
                    if (hasLinkedAsset) setLinkedAssetId("");
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    hasLinkedAsset ? "bg-[#14B8A6]" : "bg-[#334155]"
                  }`}
                  data-testid="has-linked-asset-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[#1E293B] transition-transform ${
                      hasLinkedAsset ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              
              {/* Asset Dropdown - shown when toggle is ON */}
              {hasLinkedAsset && assets.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#334155]">
                  <label htmlFor="linkedAsset" className="block text-sm font-medium text-[#334155] mb-2">
                    Select Linked Asset
                  </label>
                  <select
                    id="linkedAsset"
                    value={linkedAssetId}
                    onChange={(e) => setLinkedAssetId(e.target.value)}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="linked-asset-select"
                  >
                    <option value="">Select Asset</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>{asset.assetName} - {asset.assetType}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[#334155]/60 mt-1">Link to Property, Vehicle, or other financed asset</p>
                </div>
              )}
            </div>

            {/* Reverse-Linked Assets Display (Assets that have this loan) */}
            {id && reverseLinkedAssets.length > 0 && (
              <div className="w-full rounded-xl border border-[#E0F2FE] bg-[#F0F9FF] p-4" data-testid="reverse-linked-assets">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-[#0EA5E9]" />
                  <span className="text-sm font-semibold text-[#0EA5E9]">Assets Financed by This Loan</span>
                </div>
                <div className="space-y-2">
                  {reverseLinkedAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => navigate(`/asset/${asset.id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1E293B] border border-[#E0F2FE] hover:border-[#0EA5E9] transition-colors text-left"
                      data-testid={`reverse-linked-asset-${asset.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {asset.assetType?.includes("Property") ? (
                          <Building2 className="h-5 w-5 text-[#0EA5E9]" />
                        ) : (
                          <Home className="h-5 w-5 text-[#0EA5E9]" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-[#334155]">{asset.assetName}</p>
                          <p className="text-xs text-[#334155]/60">{asset.assetType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#14B8A6]">₹ {formatAmount(asset.currentValue)}</span>
                        <ExternalLink className="h-4 w-4 text-[#0EA5E9]" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Account */}
            {accounts.length > 0 && (
              <div className="w-full">
                <label htmlFor="linkedAccount" className="block text-sm font-medium text-[#334155] mb-2">
                  EMI Debit Account <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="linkedAccount"
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="linked-account-select"
                >
                  <option value="">Select Account (Optional)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.accountType}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Auto Create EMI Expense */}
            <div className="w-full rounded-xl border border-[#334155] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#334155]">
                    Auto Create EMI Expense
                  </label>
                  <p className="text-xs text-[#334155]/60 mt-0.5">Automatically add EMI to your expense list</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCreateExpense(!autoCreateExpense)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoCreateExpense ? "bg-[#14B8A6]" : "bg-[#334155]"
                  }`}
                  data-testid="auto-expense-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[#1E293B] transition-transform ${
                      autoCreateExpense ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {errors.submit && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{errors.submit}</div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-16 left-0 right-0 border-t border-[#334155] bg-[#1E293B]/95 backdrop-blur-sm px-6 py-4 z-40">
        <div className="mx-auto max-w-[620px]">
          {id ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-[#1E293B] px-6 py-4 text-red-500 font-semibold transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                data-testid="delete-button"
              >
                <Trash2 className="h-5 w-5" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#14B8A6] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#0D9488] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="update-button"
              >
                {isSubmitting ? "Updating..." : "Update Loan"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#14B8A6] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#0D9488] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
              data-testid="save-button"
            >
              {isSubmitting ? "Saving..." : "Save Loan"}
            </button>
          )}
        </div>
      </div>

      {/* Update Confirmation Dialog */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#334155] mb-3">Confirm Changes</h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to update this loan?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">
                Cancel
              </button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#14B8A6] px-4 py-3 text-white font-medium">
                Yes, Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Loan?</h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to delete "{loanName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default LoanIncome;
