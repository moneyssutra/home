import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Plus } from "lucide-react";
import axios from "axios";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";

const AssetForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  // Form fields
  const [assetType, setAssetType] = useState("");
  const [assetName, setAssetName] = useState("");
  const [purchaseValue, setPurchaseValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [depreciationType, setDepreciationType] = useState("");
  const [isFinanced, setIsFinanced] = useState(false);
  const [linkedLoanId, setLinkedLoanId] = useState("");
  const [generatesIncome, setGeneratesIncome] = useState(false);
  const [linkedIncomeId, setLinkedIncomeId] = useState("");
  const [isInsured, setIsInsured] = useState(false);
  const [linkedInsuranceId, setLinkedInsuranceId] = useState("");
  const [assetLocation, setAssetLocation] = useState("");
  const [notes, setNotes] = useState("");
  
  // Income generation fields
  const [renterName, setRenterName] = useState("");
  const [rentalAmount, setRentalAmount] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [rentalFrequency, setRentalFrequency] = useState("Monthly");
  
  // Available data for linking
  const [availableLoans, setAvailableLoans] = useState([]);
  const [availableInsurances, setAvailableInsurances] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  
  // Calendar popover state
  const [purchaseCalendarOpen, setPurchaseCalendarOpen] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const assetTypes = [
    "Residential Property",
    "Commercial Property",
    "Land",
    "Vehicle",
    "Physical Gold",
    "Physical Silver",
    "Diamonds",
    "Business Asset",
    "Equipment / Machinery",
    "Other"
  ];

  const depreciationTypes = [
    { value: "Appreciating", label: "Appreciating (e.g., Property)" },
    { value: "Depreciating", label: "Depreciating (e.g., Vehicle)" },
    { value: "Market Driven", label: "Market Driven (e.g., Gold)" }
  ];

  // Auto-suggest depreciation type based on asset type
  useEffect(() => {
    if (!depreciationType) {
      if (assetType.includes("Property") || assetType === "Land") {
        setDepreciationType("Appreciating");
      } else if (assetType === "Vehicle" || assetType.includes("Equipment")) {
        setDepreciationType("Depreciating");
      } else if (assetType.includes("Gold") || assetType.includes("Silver") || assetType === "Diamonds") {
        setDepreciationType("Market Driven");
      }
    }
  }, [assetType]);

  // Fetch loans for linking
  useEffect(() => {
    fetchLoans();
    fetchInsurances();
  }, []);

  // Restore form state if returning from loan creation
  useEffect(() => {
    if (location.state?.assetFormData) {
      const data = location.state.assetFormData;
      setAssetType(data.assetType || "");
      setAssetName(data.assetName || "");
      setPurchaseValue(data.purchaseValue || "");
      setCurrentValue(data.currentValue || "");
      setPurchaseDate(data.purchaseDate || "");
      setDepreciationType(data.depreciationType || "");
      setIsFinanced(data.isFinanced || false);
      setGeneratesIncome(data.generatesIncome || false);
      setIsInsured(data.isInsured || false);
      setAssetLocation(data.location || "");
      setNotes(data.notes || "");
      setRenterName(data.renterName || "");
      setRentalAmount(data.rentalAmount || "");
      setSecurityDeposit(data.securityDeposit || "");
      setRentalFrequency(data.rentalFrequency || "Monthly");
      
      // If a new loan was just created, set it as linked
      if (location.state?.newLoanId) {
        fetchLoans().then(() => {
          setLinkedLoanId(location.state.newLoanId);
        });
      }
      // If a new insurance was just created, set it as linked
      if (location.state?.newInsuranceId) {
        fetchInsurances().then(() => {
          setLinkedInsuranceId(location.state.newInsuranceId);
          setIsInsured(true);
        });
      }
    }
  }, [location.state]);

  // Fetch asset data if editing
  useEffect(() => {
    if (id) {
      fetchAssetData();
    }
  }, [id]);

  const fetchLoans = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/loans`);
      setAvailableLoans(response.data);
    } catch (error) {
      console.error("Error fetching loans:", error);
    }
  };

  const fetchInsurances = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/insurances`);
      setAvailableInsurances(response.data || []);
    } catch (error) {
      console.error("Error fetching insurances:", error);
      setAvailableInsurances([]);
    }
  };
  
  // Handle adding new insurance - preserves form state
  const handleAddInsurance = () => {
    const formData = {
      assetType,
      assetName,
      purchaseValue,
      currentValue,
      purchaseDate,
      depreciationType,
      isFinanced,
      generatesIncome,
      isInsured: true, // Set to true since they're adding insurance
      location: assetLocation,
      notes,
      renterName,
      rentalAmount,
      securityDeposit,
      rentalFrequency
    };
    
    // Navigate to insurance form with return state
    navigate('/insurance', {
      state: {
        returnTo: '/asset',
        assetFormData: formData
      }
    });
  };

  const fetchAssetData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/assets/${id}`);
      const data = response.data;
      
      setAssetType(data.assetType || "");
      setAssetName(data.assetName || "");
      setPurchaseValue(data.purchaseValue?.toString() || "");
      setCurrentValue(data.currentValue?.toString() || "");
      setPurchaseDate(data.purchaseDate || "");
      setDepreciationType(data.depreciationType || "");
      setIsFinanced(data.isFinanced || false);
      setLinkedLoanId(data.linkedLoanId || "");
      setGeneratesIncome(data.generatesIncome || false);
      setLinkedIncomeId(data.linkedIncomeId || "");
      setIsInsured(data.isInsured || false);
      setLinkedInsuranceId(data.linkedInsuranceId || "");
      setAssetLocation(data.location || "");
      setNotes(data.notes || "");
    } catch (error) {
      console.error("Error fetching asset data:", error);
      setErrors({ submit: "Failed to load asset data" });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (setter) => (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setter(value);
  };

  const validate = () => {
    const newErrors = {};

    if (!assetType) {
      newErrors.assetType = "Please select asset type";
    }

    if (!assetName.trim()) {
      newErrors.assetName = "Asset name is required";
    }

    if (!currentValue || parseFloat(currentValue) < 0) {
      newErrors.currentValue = "Current value is required";
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
        assetType,
        assetName,
        purchaseValue: purchaseValue ? parseFloat(purchaseValue) : null,
        currentValue: parseFloat(currentValue),
        purchaseDate: purchaseDate || null,
        depreciationType: depreciationType || null,
        isFinanced,
        linkedLoanId: isFinanced && linkedLoanId ? linkedLoanId : null,
        generatesIncome,
        linkedIncomeId: generatesIncome && linkedIncomeId ? linkedIncomeId : null,
        isInsured,
        linkedInsuranceId: isInsured && linkedInsuranceId ? linkedInsuranceId : null,
        location: assetLocation || null,
        notes: notes || null,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/assets/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/assets`, payload);
      }
      
      navigate("/my-assets");
    } catch (error) {
      console.error("Error saving asset:", error);
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
      await axios.delete(`${backendUrl}/api/assets/${id}`);
      navigate("/my-assets");
    } catch (error) {
      console.error("Error deleting asset:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPropertyType = assetType.includes("Property") || assetType === "Land";

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="asset-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9]"
          onClick={() => navigate("/my-assets")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Asset" : "Add Asset"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Asset Type */}
            <div className="w-full">
              <label htmlFor="assetType" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Asset Type
              </label>
              <select
                id="assetType"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="asset-type-select"
              >
                <option value="">Select Asset Type</option>
                {assetTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.assetType && <p className="text-sm text-red-500 mt-1">{errors.assetType}</p>}
            </div>

            {/* Asset Name */}
            <div className="w-full">
              <label htmlFor="assetName" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Asset Name
              </label>
              <input
                id="assetName"
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g., Green Villa – Flat 302, Honda City 2020"
                maxLength={100}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="asset-name-input"
              />
              {errors.assetName && <p className="text-sm text-red-500 mt-1">{errors.assetName}</p>}
            </div>

            {/* Purchase Value */}
            <div className="w-full">
              <label htmlFor="purchaseValue" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Purchase Value <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="purchaseValue"
                  type="text"
                  value={purchaseValue}
                  onChange={handleAmountChange(setPurchaseValue)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="purchase-value-input"
                />
              </div>
              {parseFloat(purchaseValue) > 0 && (
                <p className="mt-1.5 text-xs text-[#0B3D2E]/50 italic" data-testid="purchase-value-words">
                  {numberToWords(parseFloat(purchaseValue))}
                </p>
              )}
            </div>

            {/* Current Market Value */}
            <div className="w-full">
              <label htmlFor="currentValue" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Current Market Value
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="currentValue"
                  type="text"
                  value={currentValue}
                  onChange={handleAmountChange(setCurrentValue)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="current-value-input"
                />
              </div>
              {parseFloat(currentValue) > 0 && (
                <p className="mt-1.5 text-xs text-[#0B3D2E]/50 italic" data-testid="current-value-words">
                  {numberToWords(parseFloat(currentValue))}
                </p>
              )}
              {errors.currentValue && <p className="text-sm text-red-500 mt-1">{errors.currentValue}</p>}
              <p className="text-xs text-[#0B3D2E]/60 mt-1">This feeds into your Net Worth calculation</p>
            </div>

            {/* Purchase Date */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Purchase Date <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <Popover open={purchaseCalendarOpen} onOpenChange={setPurchaseCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-left text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="purchase-date-input"
                  >
                    <span className={purchaseDate ? "text-[#0B3D2E]" : "text-[#94A3B8]"}>
                      {purchaseDate ? format(new Date(purchaseDate), "PPP") : "Select purchase date"}
                    </span>
                    <CalendarIcon className="h-5 w-5 text-[#94A3B8]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={purchaseDate ? new Date(purchaseDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setPurchaseDate(format(date, "yyyy-MM-dd"));
                      }
                      setPurchaseCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Depreciation Type */}
            <div className="w-full">
              <label htmlFor="depreciationType" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Value Trend <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <select
                id="depreciationType"
                value={depreciationType}
                onChange={(e) => setDepreciationType(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="depreciation-type-select"
              >
                <option value="">Select Value Trend</option>
                {depreciationTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Is Financed Toggle */}
            <div className="w-full rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#0B3D2E]">
                    Is This Asset Financed?
                  </label>
                  <p className="text-xs text-[#0B3D2E]/60 mt-0.5">Link to a loan for net worth calculation</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFinanced(!isFinanced)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isFinanced ? "bg-[#F59E0B]" : "bg-[#E2E8F0]"
                  }`}
                  data-testid="is-financed-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isFinanced ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {isFinanced && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <label htmlFor="linkedLoan" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Select Linked Loan
                  </label>
                  <select
                    id="linkedLoan"
                    value={linkedLoanId}
                    onChange={(e) => setLinkedLoanId(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="linked-loan-select"
                  >
                    <option value="">Select a Loan</option>
                    {availableLoans.map((loan) => (
                      <option key={loan.id} value={loan.id}>
                        {loan.loanName} - ₹{new Intl.NumberFormat('en-IN').format(loan.outstandingAmount)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => navigate("/loan", { 
                      state: { 
                        returnTo: id ? `/asset/${id}` : '/asset',
                        assetFormData: {
                          assetType,
                          assetName,
                          purchaseValue,
                          currentValue,
                          purchaseDate,
                          depreciationType,
                          isFinanced,
                          generatesIncome,
                          isInsured,
                          location: assetLocation,
                          notes
                        }
                      } 
                    })}
                    className="mt-3 flex items-center gap-2 text-sm text-[#F59E0B] font-medium hover:text-[#D97706]"
                    data-testid="add-loan-link"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Loan
                  </button>
                </div>
              )}
            </div>

            {/* Generates Income Toggle */}
            <div className="w-full rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#0B3D2E]">
                    Does This Asset Generate Income?
                  </label>
                  <p className="text-xs text-[#0B3D2E]/60 mt-0.5">E.g., Rental income from property</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGeneratesIncome(!generatesIncome)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    generatesIncome ? "bg-[#00D09C]" : "bg-[#E2E8F0]"
                  }`}
                  data-testid="generates-income-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      generatesIncome ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              
              {/* Rental Income Fields - shown when toggle is ON */}
              {generatesIncome && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-4">
                  <div>
                    <label htmlFor="renterName" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Renter Name <span className="text-[#0B3D2E]/40">(Optional)</span>
                    </label>
                    <input
                      id="renterName"
                      type="text"
                      value={renterName}
                      onChange={(e) => setRenterName(e.target.value)}
                      placeholder="Enter renter's name"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#0B3D2E]/40 focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="renter-name-input"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="rentalAmount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Rental Amount <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E]/60 font-medium">₹</span>
                      <input
                        id="rentalAmount"
                        type="text"
                        value={rentalAmount}
                        onChange={(e) => setRentalAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-[#0B3D2E] placeholder-[#0B3D2E]/40 focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                        data-testid="rental-amount-input"
                      />
                    </div>
                    {parseFloat(rentalAmount) > 0 && (
                      <p className="mt-1.5 text-xs text-[#0B3D2E]/50 italic" data-testid="rental-amount-words">
                        {numberToWords(parseFloat(rentalAmount))}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="securityDeposit" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Security Deposit <span className="text-[#0B3D2E]/40">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E]/60 font-medium">₹</span>
                      <input
                        id="securityDeposit"
                        type="text"
                        value={securityDeposit}
                        onChange={(e) => setSecurityDeposit(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-[#0B3D2E] placeholder-[#0B3D2E]/40 focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                        data-testid="security-deposit-input"
                      />
                    </div>
                    {parseFloat(securityDeposit) > 0 && (
                      <p className="mt-1.5 text-xs text-[#0B3D2E]/50 italic" data-testid="security-deposit-words">
                        {numberToWords(parseFloat(securityDeposit))}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="rentalFrequency" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Rental Frequency
                    </label>
                    <select
                      id="rentalFrequency"
                      value={rentalFrequency}
                      onChange={(e) => setRentalFrequency(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="rental-frequency-select"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Is Insured Toggle */}
            <div className="w-full rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#0B3D2E]">
                    Is This Asset Insured?
                  </label>
                  <p className="text-xs text-[#0B3D2E]/60 mt-0.5">Link to an insurance policy</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInsured(!isInsured)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isInsured ? "bg-[#6366F1]" : "bg-[#E2E8F0]"
                  }`}
                  data-testid="is-insured-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isInsured ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {isInsured && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="linkedInsurance" className="block text-sm font-medium text-[#0B3D2E]">
                      Select Linked Insurance
                    </label>
                    <button
                      type="button"
                      onClick={handleAddInsurance}
                      className="flex items-center gap-1 text-xs font-medium text-[#6366F1] hover:text-[#4F46E5] transition-colors"
                      data-testid="add-insurance-shortcut"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Insurance
                    </button>
                  </div>
                  {availableInsurances.length > 0 ? (
                    <select
                      id="linkedInsurance"
                      value={linkedInsuranceId}
                      onChange={(e) => setLinkedInsuranceId(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="linked-insurance-select"
                    >
                      <option value="">Select an Insurance</option>
                      {availableInsurances.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.policyName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-[#0B3D2E]/60 bg-[#F8FAF9] rounded-xl px-4 py-3 text-center">
                      No insurance policies found. Click "Add Insurance" to create one.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Location (for Property) */}
            {isPropertyType && (
              <div className="w-full">
                <label htmlFor="assetLocation" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Location <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <input
                  id="assetLocation"
                  type="text"
                  value={assetLocation}
                  onChange={(e) => setAssetLocation(e.target.value)}
                  placeholder="e.g., Mumbai, Andheri West"
                  maxLength={100}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="location-input"
                />
              </div>
            )}

            {/* Notes */}
            <div className="w-full">
              <label htmlFor="notes" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Notes <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 resize-none"
                data-testid="notes-input"
              />
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
                {isSubmitting ? "Updating..." : "Update Asset"}
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
              {isSubmitting ? "Saving..." : "Save Asset"}
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
              Are you sure you want to update this asset?
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Asset?</h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to delete "{assetName}"? This action cannot be undone.
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

export default AssetForm;
