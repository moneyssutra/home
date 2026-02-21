import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2, Plus, TrendingUp } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import IncomeTypeToggle from "@/components/IncomeTypeToggle";
import ReminderTimePicker from "@/components/ReminderTimePicker";
import { ValidationMessage } from "@/components/ValidationMessage";
import { 
  validatePositiveAmount, 
  validateTextField,
  validateNonNegativeAmount,
  scrollToFirstError
} from "@/lib/validations";
import { numberToWords } from "@/lib/formatters";
import { RestrictedDatePicker } from "@/components/ui/date-picker";

const RentalIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  // Refs for auto-scroll
  const dateFieldRef = useRef(null);
  const quarterFieldRef = useRef(null);
  const halfFieldRef = useRef(null);
  const monthFieldRef = useRef(null);
  const customFreqFieldRef = useRef(null);
  const dayFieldRef = useRef(null);
  
  // Asset link
  const [assetId, setAssetId] = useState("");
  const [availableAssets, setAvailableAssets] = useState([]);
  
  // Form fields
  const [propertyName, setPropertyName] = useState("");
  const [renterName, setRenterName] = useState("");
  const [rentalAmount, setRentalAmount] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [frequency, setFrequency] = useState("");
  
  // Date fields
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [customFrequency, setCustomFrequency] = useState("");
  const [customDate, setCustomDate] = useState("");
  
  // Variable income fields
  const [incomeType, setIncomeType] = useState("fixed");
  const [reminderTime, setReminderTime] = useState("19:00");
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingRental, setExistingRental] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  const today = new Date().toISOString().split('T')[0];

  // Fetch assets for linking
  useEffect(() => {
    fetchAssets();
  }, []);

  // Fetch data if editing
  useEffect(() => {
    if (id) {
      fetchRentalData();
    }
  }, [id]);

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/assets`);
      // Show ALL assets - user can link any asset to rental income
      setAvailableAssets(response.data);
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };

  const fetchRentalData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income/${id}`);
      const data = response.data;
      
      setAssetId(data.assetId || "");
      setPropertyName(data.name || "");
      setRenterName(data.tenantName || "");
      setRentalAmount(data.expectedAmount?.toString() || "");
      setSecurityDeposit(data.securityDeposit?.toString() || "");
      setFrequency(data.frequency || "");
      setSelectedDay(data.selectedDay || "");
      setSelectedDate(data.selectedDate || "");
      setSelectedQuarter(data.selectedQuarter || "");
      setSelectedHalf(data.selectedHalf || "");
      setSelectedMonth(data.selectedMonth || "");
      setCustomFrequency(data.customFrequency || "");
      setCustomDate(data.customDate || "");
      // Variable income fields
      setIncomeType(data.incomeType || "fixed");
      setReminderTime(data.reminderTime || "19:00");
    } catch (error) {
      console.error("Error fetching rental data:", error);
      setErrors({ submit: "Failed to load rental data" });
    } finally {
      setLoading(false);
    }
  };

  // When asset is selected, auto-fill property name
  useEffect(() => {
    if (assetId && !id) {
      const selectedAsset = availableAssets.find(a => a.id === assetId);
      if (selectedAsset) {
        setPropertyName(selectedAsset.assetName);
      }
    }
  }, [assetId, availableAssets, id]);

  // Reset date fields when frequency changes and auto-scroll
  useEffect(() => {
    if (!id) {
      setSelectedDay("");
      setSelectedDate("");
      setSelectedQuarter("");
      setSelectedHalf("");
      setSelectedMonth("");
      setCustomFrequency("");
      setCustomDate("");
    }
    
    // Auto-scroll to new fields based on frequency
    if (frequency) {
      setTimeout(() => {
        if (frequency === "Daily" && dayFieldRef.current) {
          dayFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          dayFieldRef.current.focus();
        } else if (frequency === "Monthly" && dateFieldRef.current) {
          dateFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          dateFieldRef.current.focus();
        } else if (frequency === "Quarterly" && quarterFieldRef.current) {
          quarterFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          quarterFieldRef.current.focus();
        } else if (frequency === "Half-Yearly" && halfFieldRef.current) {
          halfFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          halfFieldRef.current.focus();
        } else if (frequency === "Yearly" && monthFieldRef.current) {
          monthFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          monthFieldRef.current.focus();
        } else if (frequency === "Others" && customFreqFieldRef.current) {
          customFreqFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          customFreqFieldRef.current.focus();
        }
      }, 100);
    }
  }, [frequency]);

  // Auto-scroll when quarter/half/month is selected
  useEffect(() => {
    if (selectedQuarter && monthFieldRef.current) {
      setTimeout(() => {
        monthFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        monthFieldRef.current.focus();
      }, 100);
    }
  }, [selectedQuarter]);

  useEffect(() => {
    if (selectedHalf && monthFieldRef.current) {
      setTimeout(() => {
        monthFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        monthFieldRef.current.focus();
      }, 100);
    }
  }, [selectedHalf]);

  useEffect(() => {
    if (selectedMonth && dateFieldRef.current) {
      setTimeout(() => {
        dateFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dateFieldRef.current.focus();
      }, 100);
    }
  }, [selectedMonth]);

  // Calculate rental yield if asset is linked
  const rentalYield = useMemo(() => {
    if (!assetId || !rentalAmount) return null;
    const selectedAsset = availableAssets.find(a => a.id === assetId);
    if (!selectedAsset || !selectedAsset.currentValue) return null;
    
    const annualRent = parseFloat(rentalAmount) * (
      frequency === "Daily" ? 365 :
      frequency === "Monthly" ? 12 :
      frequency === "Quarterly" ? 4 :
      frequency === "Half-Yearly" ? 2 :
      frequency === "Yearly" ? 1 : 12
    );
    
    return (annualRent / selectedAsset.currentValue) * 100;
  }, [assetId, rentalAmount, frequency, availableAssets]);

  const selectedAsset = useMemo(() => {
    return availableAssets.find(a => a.id === assetId);
  }, [assetId, availableAssets]);

  const frequencyOptions = ["Daily", "Monthly", "Quarterly", "Half-Yearly", "Yearly", "Others"];

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const quarters = [
    { id: "Q1", label: "Q1 (Jan–Mar)", months: ["January", "February", "March"] },
    { id: "Q2", label: "Q2 (Apr–Jun)", months: ["April", "May", "June"] },
    { id: "Q3", label: "Q3 (Jul–Sep)", months: ["July", "August", "September"] },
    { id: "Q4", label: "Q4 (Oct–Dec)", months: ["October", "November", "December"] },
  ];

  const halves = [
    { id: "H1", label: "Jan–Jun", months: ["January", "February", "March", "April", "May", "June"] },
    { id: "H2", label: "Jul–Dec", months: ["July", "August", "September", "October", "November", "December"] },
  ];

  const allMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Helper to get month index (0-11) from month name
  const getMonthIndex = (monthName) => {
    return allMonths.indexOf(monthName);
  };

  const quarterMonths = useMemo(() => {
    const quarter = quarters.find(q => q.label === selectedQuarter);
    return quarter ? quarter.months : [];
  }, [selectedQuarter]);

  const halfMonths = useMemo(() => {
    const half = halves.find(h => h.label === selectedHalf);
    return half ? half.months : [];
  }, [selectedHalf]);

  const getDateRangeForMonth = (monthName) => {
    if (!monthName) return { min: "", max: "" };
    const monthIndex = allMonths.indexOf(monthName);
    const year = 2026;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const min = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const max = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${lastDay}`;
    return { min, max };
  };

  const quarterlyDateRange = useMemo(() => getDateRangeForMonth(selectedMonth), [selectedMonth]);
  const halfYearlyDateRange = useMemo(() => getDateRangeForMonth(selectedMonth), [selectedMonth]);

  const handleAmountChange = (setter) => (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setter(value);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const validate = () => {
    const newErrors = {};

    // Property Name validation
    const nameError = validateTextField(propertyName, "Property name", 100);
    if (nameError) newErrors.propertyName = nameError;

    // Rental Amount validation
    const amountError = validatePositiveAmount(rentalAmount, "Rental amount");
    if (amountError) newErrors.rentalAmount = amountError;

    // Security Deposit validation (optional but must be non-negative if provided)
    if (securityDeposit && parseFloat(securityDeposit) < 0) {
      newErrors.securityDeposit = "Security deposit cannot be negative.";
    }

    // Frequency validation
    if (!frequency) {
      newErrors.frequency = "Please select a frequency.";
    }

    // Date validation based on frequency
    if (frequency === "Daily" && !selectedDay) {
      newErrors.selectedDay = "Please select a day.";
    }

    if (frequency === "Monthly" && !selectedDate) {
      newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "Quarterly") {
      if (!selectedQuarter) newErrors.selectedQuarter = "Please select a quarter.";
      if (!selectedMonth) newErrors.selectedMonth = "Please select a month.";
      if (!selectedDate) newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "Half-Yearly") {
      if (!selectedHalf) newErrors.selectedHalf = "Please select a half.";
      if (!selectedMonth) newErrors.selectedMonth = "Please select a month.";
      if (!selectedDate) newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "Yearly") {
      if (!selectedMonth) newErrors.selectedMonth = "Please select a month.";
      if (!selectedDate) newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "Others") {
      if (!customFrequency.trim()) newErrors.customFrequency = "Please enter custom frequency.";
      if (!customDate) newErrors.customDate = "Please select a date.";
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

    // Check for duplicate
    try {
      const response = await axios.get(`${backendUrl}/api/income`);
      const rentals = response.data.filter(item => item.type === "Rental");
      const duplicate = rentals.find(r => r.name.toLowerCase() === propertyName.trim().toLowerCase());
      
      if (duplicate) {
        setExistingRental(duplicate);
        setShowDuplicateDialog(true);
        return;
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
    }

    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true);
    setShowUpdateConfirm(false);
    
    try {
      const payload = {
        type: "Rental",
        name: propertyName,
        assetId: assetId || null,
        tenantName: renterName || null,
        expectedAmount: parseFloat(rentalAmount),
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : null,
        frequency,
        selectedDay: selectedDay || null,
        selectedDate: selectedDate || null,
        selectedQuarter: selectedQuarter || null,
        selectedHalf: selectedHalf || null,
        selectedMonth: selectedMonth || null,
        customFrequency: customFrequency || null,
        customDate: customDate || null,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/income/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/income`, payload);
      }
      
      navigate("/my-income");
    } catch (error) {
      console.error("Error saving rental income:", error);
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
      await axios.delete(`${backendUrl}/api/income/${id}`);
      navigate("/my-income");
    } catch (error) {
      console.error("Error deleting rental:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="rental-income-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A]"
          onClick={() => navigate("/my-income")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#334155]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          Rental Income
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            
            {/* Link to Asset (Optional) */}
            <div className="w-full rounded-xl border border-[#334155] p-4">
              <label htmlFor="assetId" className="block text-sm font-medium text-[#334155] mb-2">
                Link to Asset <span className="text-[#94A3B8] font-normal">(Optional - enables Rental Yield calculation)</span>
              </label>
              
              {availableAssets.length > 0 ? (
                <select
                  id="assetId"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="asset-select"
                >
                  <option value="">Select an Asset (Optional)</option>
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetName} - ₹{formatAmount(asset.currentValue)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-[#334155]/60 mb-2">No assets available. Add an asset first to enable linking.</p>
              )}
              
              <button
                type="button"
                onClick={() => navigate("/asset")}
                className="mt-3 flex items-center gap-2 text-sm text-[#0EA5E9] font-medium hover:text-[#0284C7]"
              >
                <Plus className="h-4 w-4" />
                Add New Asset
              </button>
            </div>

            {/* Rental Yield Display */}
            {rentalYield !== null && selectedAsset && (
              <div className="w-full rounded-xl bg-gradient-to-r from-[#334155] to-[#145A3E] p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-[#14B8A6]" />
                      <p className="text-white/70 text-sm">Rental Yield</p>
                    </div>
                    <p className="text-white text-3xl font-bold">{rentalYield.toFixed(2)}%</p>
                    <p className="text-white/60 text-xs mt-1">Annual return on asset value</p>
                  </div>
                  <div className="text-right text-white/60 text-xs">
                    <p>Asset Value: ₹{formatAmount(selectedAsset.currentValue)}</p>
                    <p className="text-[#14B8A6]">Annual Rent: ₹{formatAmount(parseFloat(rentalAmount || 0) * (frequency === "Daily" ? 365 : frequency === "Monthly" ? 12 : frequency === "Quarterly" ? 4 : frequency === "Half-Yearly" ? 2 : 1))}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Property Name */}
            <div className="w-full">
              <label htmlFor="propertyName" className="block text-sm font-medium text-[#334155] mb-2">
                Property Name
              </label>
              <input
                id="propertyName"
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g., Green Villa – Flat 302"
                maxLength={50}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="property-name-input"
              />
              {errors.propertyName && <p className="text-sm text-red-500 mt-1">{errors.propertyName}</p>}
            </div>

            {/* Renter Name (Optional) */}
            <div className="w-full">
              <label htmlFor="renterName" className="block text-sm font-medium text-[#334155] mb-2">
                Renter Name <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <input
                id="renterName"
                type="text"
                value={renterName}
                onChange={(e) => setRenterName(e.target.value)}
                placeholder="e.g., Rahul Sharma"
                maxLength={50}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="renter-name-input"
              />
            </div>

            {/* Rental Amount & Security Deposit Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Rental Amount */}
              <div className="w-full">
                <label htmlFor="rentalAmount" className="block text-sm font-medium text-[#334155] mb-2">
                  Rental Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                  <input
                    id="rentalAmount"
                    type="text"
                    value={rentalAmount}
                    onChange={handleAmountChange(setRentalAmount)}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="rental-amount-input"
                  />
                </div>
                {parseFloat(rentalAmount) > 0 && (
                  <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="rental-amount-words">
                    {numberToWords(parseFloat(rentalAmount))}
                  </p>
                )}
                {errors.rentalAmount && <p className="text-sm text-red-500 mt-1">{errors.rentalAmount}</p>}
              </div>

              {/* Security Deposit */}
              <div className="w-full">
                <label htmlFor="securityDeposit" className="block text-sm font-medium text-[#334155] mb-2">
                  Security Deposit <span className="text-[#94A3B8] font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                  <input
                    id="securityDeposit"
                    type="text"
                    value={securityDeposit}
                    onChange={handleAmountChange(setSecurityDeposit)}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="security-deposit-input"
                  />
                </div>
                {parseFloat(securityDeposit) > 0 && (
                  <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="security-deposit-words">
                    {numberToWords(parseFloat(securityDeposit))}
                  </p>
                )}
              </div>
            </div>

            {/* Frequency */}
            <div className="w-full">
              <label htmlFor="frequency" className="block text-sm font-medium text-[#334155] mb-2">
                Frequency
              </label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="frequency-select"
              >
                <option value="">Select Frequency</option>
                {frequencyOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.frequency && <p className="text-sm text-red-500 mt-1">{errors.frequency}</p>}
            </div>

            {/* Daily Day Selection */}
            {frequency === "Daily" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="daily-fields">
                <label htmlFor="dailyDay" className="block text-sm font-medium text-[#334155] mb-2">
                  Select Day of Week
                </label>
                <select
                  id="dailyDay"
                  ref={dayFieldRef}
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="day-select"
                >
                  <option value="">Select a Day</option>
                  {daysOfWeek.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                {errors.selectedDay && <p className="text-sm text-red-500 mt-1">{errors.selectedDay}</p>}
              </div>
            )}

            {/* Monthly Date Selection */}
            {frequency === "Monthly" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="monthly-fields">
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Due Date (Day of Month)
                </label>
                <RestrictedDatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  placeholder="Select due date"
                  error={!!errors.selectedDate}
                  testId="date-select"
                />
                {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
              </div>
            )}

            {/* Quarterly Fields */}
            {frequency === "Quarterly" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="quarterly-fields">
                <div className="w-full">
                  <label htmlFor="quarter" className="block text-sm font-medium text-[#334155] mb-2">
                    Select Quarter
                  </label>
                  <select
                    id="quarter"
                    value={selectedQuarter}
                    onChange={(e) => { setSelectedQuarter(e.target.value); setSelectedMonth(""); setSelectedDate(""); }}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="quarter-select"
                  >
                    <option value="">Select Quarter</option>
                    {quarters.map((q) => <option key={q.id} value={q.label}>{q.label}</option>)}
                  </select>
                  {errors.selectedQuarter && <p className="text-sm text-red-500 mt-1">{errors.selectedQuarter}</p>}
                </div>

                {selectedQuarter && (
                  <div className="w-full">
                    <label htmlFor="quarterMonth" className="block text-sm font-medium text-[#334155] mb-2">
                      Select Month
                    </label>
                    <select
                      id="quarterMonth"
                      value={selectedMonth}
                      onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(""); }}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="month-select"
                    >
                      <option value="">Select Month</option>
                      {quarterMonths.map((month) => <option key={month} value={month}>{month}</option>)}
                    </select>
                    {errors.selectedMonth && <p className="text-sm text-red-500 mt-1">{errors.selectedMonth}</p>}
                  </div>
                )}

                {selectedMonth && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <RestrictedDatePicker
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.selectedDate}
                      testId="date-select"
                    />
                    {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Half-Yearly Fields */}
            {frequency === "Half-Yearly" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="half-yearly-fields">
                <div className="w-full">
                  <label htmlFor="half" className="block text-sm font-medium text-[#334155] mb-2">
                    Select Half
                  </label>
                  <select
                    id="half"
                    value={selectedHalf}
                    onChange={(e) => { setSelectedHalf(e.target.value); setSelectedMonth(""); setSelectedDate(""); }}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="half-select"
                  >
                    <option value="">Select Half</option>
                    {halves.map((h) => <option key={h.id} value={h.label}>{h.label}</option>)}
                  </select>
                  {errors.selectedHalf && <p className="text-sm text-red-500 mt-1">{errors.selectedHalf}</p>}
                </div>

                {selectedHalf && (
                  <div className="w-full">
                    <label htmlFor="halfMonth" className="block text-sm font-medium text-[#334155] mb-2">
                      Select Month
                    </label>
                    <select
                      id="halfMonth"
                      value={selectedMonth}
                      onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(""); }}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="month-select"
                    >
                      <option value="">Select Month</option>
                      {halfMonths.map((month) => <option key={month} value={month}>{month}</option>)}
                    </select>
                    {errors.selectedMonth && <p className="text-sm text-red-500 mt-1">{errors.selectedMonth}</p>}
                  </div>
                )}

                {selectedMonth && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <RestrictedDatePicker
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.selectedDate}
                      testId="date-select"
                    />
                    {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Yearly Fields */}
            {frequency === "Yearly" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="yearly-fields">
                <div className="w-full">
                  <label htmlFor="yearlyMonth" className="block text-sm font-medium text-[#334155] mb-2">
                    Select Month
                  </label>
                  <select
                    id="yearlyMonth"
                    value={selectedMonth}
                    onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(""); }}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="month-select"
                  >
                    <option value="">Select Month</option>
                    {allMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {errors.selectedMonth && <p className="text-sm text-red-500 mt-1">{errors.selectedMonth}</p>}
                </div>

                {selectedMonth && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <RestrictedDatePicker
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.selectedDate}
                      testId="date-select"
                    />
                    {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Others Fields */}
            {frequency === "Others" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="others-fields">
                <div className="w-full">
                  <label htmlFor="customFreq" className="block text-sm font-medium text-[#334155] mb-2">
                    Enter Custom Frequency
                  </label>
                  <input
                    id="customFreq"
                    type="text"
                    value={customFrequency}
                    onChange={(e) => setCustomFrequency(e.target.value)}
                    placeholder="e.g., Every 2 months"
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="custom-frequency-input"
                  />
                  {errors.customFrequency && <p className="text-sm text-red-500 mt-1">{errors.customFrequency}</p>}
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Select Date
                  </label>
                  <RestrictedDatePicker
                    value={customDate}
                    onChange={(date) => setCustomDate(date)}
                    placeholder="Select next expected date"
                    error={!!errors.customDate}
                    testId="custom-date-input"
                  />
                  {errors.customDate && <p className="text-sm text-red-500 mt-1">{errors.customDate}</p>}
                </div>
              </div>
            )}

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
                {isSubmitting ? "Updating..." : "Update Rental Income"}
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
              {isSubmitting ? "Saving..." : "Save Rental Income"}
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
              Are you sure you want to update this rental income?
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Rental Income?</h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to delete "{propertyName}"? This action cannot be undone.
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

      {/* Duplicate Rental Dialog */}
      {showDuplicateDialog && existingRental && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#334155] mb-3">Property Already Exists</h3>
            <p className="text-[#334155]/70 mb-6">
              A property with the name "{propertyName}" already exists. Would you like to edit the existing one or create a new one anyway?
            </p>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => { setShowDuplicateDialog(false); navigate(`/rental-income/${existingRental.id}`); }} className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 text-white font-medium">
                Edit Existing Property
              </button>
              <button type="button" onClick={() => { setShowDuplicateDialog(false); performSave(); }} className="w-full rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">
                Create New Anyway
              </button>
              <button type="button" onClick={() => setShowDuplicateDialog(false)} className="w-full rounded-xl bg-[#1E293B] px-4 py-3 text-[#334155]/60 font-medium">
                Cancel
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

export default RentalIncome;
