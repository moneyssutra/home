import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Calendar, Trash2, Building2 } from "lucide-react";
import axios from "axios";

const LoanIncome = () => {
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
  
  // Assets and Accounts for linking
  const [assets, setAssets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

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

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/assets`);
      setAssets(response.data);
    } catch (error) {
      console.error("Error fetching assets:", error);
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
      setLinkedAccountId(data.linkedAccountId || "");
      setAutoCreateExpense(data.autoCreateExpense !== false);
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

  // Auto-calculate End Date based on start date and tenure
  useEffect(() => {
    if (startDate && tenureMonths) {
      const start = new Date(startDate);
      const tenure = parseInt(tenureMonths) || 0;
      if (tenure > 0) {
        start.setMonth(start.getMonth() + tenure);
        setEndDate(start.toISOString().split('T')[0]);
      }
    }
  }, [startDate, tenureMonths]);

  const handleAmountChange = (setter) => (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setter(value);
  };

  const validate = () => {
    const newErrors = {};

    if (!loanType) {
      newErrors.loanType = "Please select a loan type";
    }

    if (!loanName.trim()) {
      newErrors.loanName = "Loan name is required";
    }

    if (!principalAmount || parseFloat(principalAmount) <= 0) {
      newErrors.principalAmount = "Principal amount is required";
    }

    if (!outstandingAmount || parseFloat(outstandingAmount) < 0) {
      newErrors.outstandingAmount = "Outstanding amount is required";
    }

    if (!interestRate || parseFloat(interestRate) <= 0) {
      newErrors.interestRate = "Interest rate is required";
    }

    if (!emiAmount || parseFloat(emiAmount) <= 0) {
      newErrors.emiAmount = "EMI amount is required";
    }

    if (!startDate) {
      newErrors.startDate = "Start date is required";
    }

    setErrors(newErrors);
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9]"
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
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Loan" : "Add Loan"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Loan Type */}
            <div className="w-full">
              <label htmlFor="loanType" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Loan Type
              </label>
              <select
                id="loanType"
                value={loanType}
                onChange={(e) => setLoanType(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
              <label htmlFor="loanName" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Loan Name
              </label>
              <input
                id="loanName"
                type="text"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder="e.g., HDFC Home Loan, SBI Car Loan"
                maxLength={50}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="loan-name-input"
              />
              {errors.loanName && <p className="text-sm text-red-500 mt-1">{errors.loanName}</p>}
            </div>

            {/* Lender Name */}
            <div className="w-full">
              <label htmlFor="lenderName" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Lender Name <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <input
                id="lenderName"
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                placeholder="e.g., HDFC Bank, SBI"
                maxLength={50}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="lender-name-input"
              />
            </div>

            {/* Principal Amount */}
            <div className="w-full">
              <label htmlFor="principalAmount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Principal Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="principalAmount"
                  type="text"
                  value={principalAmount}
                  onChange={handleAmountChange(setPrincipalAmount)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="principal-amount-input"
                />
              </div>
              {errors.principalAmount && <p className="text-sm text-red-500 mt-1">{errors.principalAmount}</p>}
            </div>

            {/* Outstanding Amount */}
            <div className="w-full">
              <label htmlFor="outstandingAmount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Current Outstanding Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="outstandingAmount"
                  type="text"
                  value={outstandingAmount}
                  onChange={handleAmountChange(setOutstandingAmount)}
                  placeholder="Auto-calculated or enter manually"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="outstanding-amount-input"
                />
              </div>
              {errors.outstandingAmount && <p className="text-sm text-red-500 mt-1">{errors.outstandingAmount}</p>}
              <p className="text-xs text-[#0B3D2E]/60 mt-1">This affects your Net Worth calculation</p>
            </div>

            {/* Interest Rate */}
            <div className="w-full">
              <label htmlFor="interestRate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Interest Rate (% per annum)
              </label>
              <div className="relative">
                <input
                  id="interestRate"
                  type="text"
                  value={interestRate}
                  onChange={handleAmountChange(setInterestRate)}
                  placeholder="e.g., 8.5"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 pr-10 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="interest-rate-input"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B3D2E]/60">%</span>
              </div>
              {errors.interestRate && <p className="text-sm text-red-500 mt-1">{errors.interestRate}</p>}
            </div>

            {/* Tenure */}
            <div className="w-full">
              <label htmlFor="tenureMonths" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Tenure (Months) <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <input
                id="tenureMonths"
                type="text"
                value={tenureMonths}
                onChange={handleAmountChange(setTenureMonths)}
                placeholder="e.g., 240 for 20 years"
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="tenure-input"
              />
            </div>

            {/* EMI Amount */}
            <div className="w-full">
              <label htmlFor="emiAmount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                EMI Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="emiAmount"
                  type="text"
                  value={emiAmount}
                  onChange={handleAmountChange(setEmiAmount)}
                  placeholder="Auto-calculated"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="emi-amount-input"
                />
              </div>
              {errors.emiAmount && <p className="text-sm text-red-500 mt-1">{errors.emiAmount}</p>}
            </div>

            {/* EMI Frequency */}
            <div className="w-full">
              <label htmlFor="emiFrequency" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                EMI Frequency
              </label>
              <select
                id="emiFrequency"
                value={emiFrequency}
                onChange={(e) => setEmiFrequency(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="emi-frequency-select"
              >
                {emiFrequencyOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="w-full">
              <label htmlFor="startDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Loan Start Date
              </label>
              <label htmlFor="startDate" className="relative block cursor-pointer">
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 cursor-pointer"
                  data-testid="start-date-input"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
              </label>
              {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
            </div>

            {/* End Date */}
            <div className="w-full">
              <label htmlFor="endDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Loan End Date <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <label htmlFor="endDate" className="relative block cursor-pointer">
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 cursor-pointer"
                  data-testid="end-date-input"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
              </label>
              <p className="text-xs text-[#0B3D2E]/60 mt-1">Auto-calculated from start date + tenure</p>
            </div>

            {/* Linked Asset */}
            {assets.length > 0 && (
              <div className="w-full">
                <label htmlFor="linkedAsset" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Linked Asset <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="linkedAsset"
                  value={linkedAssetId}
                  onChange={(e) => setLinkedAssetId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="linked-asset-select"
                >
                  <option value="">Select Asset (Optional)</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.assetName} - {asset.assetType}</option>
                  ))}
                </select>
                <p className="text-xs text-[#0B3D2E]/60 mt-1">Link to Property, Vehicle, or other financed asset</p>
              </div>
            )}

            {/* Linked Account */}
            {accounts.length > 0 && (
              <div className="w-full">
                <label htmlFor="linkedAccount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  EMI Debit Account <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="linkedAccount"
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
            <div className="w-full rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#0B3D2E]">
                    Auto Create EMI Expense
                  </label>
                  <p className="text-xs text-[#0B3D2E]/60 mt-0.5">Automatically add EMI to your expense list</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCreateExpense(!autoCreateExpense)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoCreateExpense ? "bg-[#00D09C]" : "bg-[#E2E8F0]"
                  }`}
                  data-testid="auto-expense-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E2E8F0] bg-white/95 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto max-w-[620px]">
          {id ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-white px-6 py-4 text-red-500 font-semibold transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                data-testid="delete-button"
              >
                <Trash2 className="h-5 w-5" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#00D09C] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#00BA89] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
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
              className="w-full rounded-xl bg-[#00D09C] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#00BA89] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#0B3D2E] mb-3">Confirm Changes</h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to update this loan?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium">
                Cancel
              </button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#00D09C] px-4 py-3 text-white font-medium">
                Yes, Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Loan?</h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to delete "{loanName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanIncome;
