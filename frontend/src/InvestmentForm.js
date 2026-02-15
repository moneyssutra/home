import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Info } from "lucide-react";
import axios from "axios";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";

const InvestmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Form fields
  const [investmentCategory, setInvestmentCategory] = useState("");
  const [investmentMode, setInvestmentMode] = useState("");
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [notes, setNotes] = useState("");
  
  // Dynamic fields based on category/mode
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [returnRate, setReturnRate] = useState("");
  const [compoundingType, setCompoundingType] = useState("Simple");
  const [compoundingFrequency, setCompoundingFrequency] = useState("");
  const [payoutFrequency, setPayoutFrequency] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [expectedMaturityValue, setExpectedMaturityValue] = useState("");
  const [lockInPeriod, setLockInPeriod] = useState("");
  
  // Accounts for linking
  const [accounts, setAccounts] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  
  // Calendar popover states
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [maturityCalendarOpen, setMaturityCalendarOpen] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const categoryOptions = [
    "Fixed Deposit (FD)",
    "Recurring Deposit (RD)",
    "Stocks",
    "Mutual Fund",
    "ETF",
    "Bonds",
    "Sovereign Gold Bond (SGB)",
    "Digital Gold",
    "Digital Silver",
    "P2P Lending",
    "SWP",
    "ULIP",
    "Crypto",
    "Other"
  ];

  const modeOptions = [
    { value: "Income Generating", label: "Income Generating" },
    { value: "Growth Only", label: "Growth Only" },
    { value: "Growth with Maturity", label: "Growth with Maturity" }
  ];

  const compoundingFrequencyOptions = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];
  const payoutFrequencyOptions = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];

  // Auto-suggest mode based on category
  useEffect(() => {
    if (!investmentMode && investmentCategory) {
      if (investmentCategory === "Sovereign Gold Bond (SGB)") {
        setInvestmentMode("Income Generating");
      } else if (["Digital Gold", "Digital Silver", "Stocks", "Mutual Fund", "ETF", "Crypto"].includes(investmentCategory)) {
        setInvestmentMode("Growth Only");
      } else if (["Fixed Deposit (FD)", "Recurring Deposit (RD)", "Bonds"].includes(investmentCategory)) {
        setInvestmentMode("Growth with Maturity");
      }
    }
  }, [investmentCategory]);

  // Fetch accounts and investment data
  useEffect(() => {
    fetchAccounts();
    if (id) {
      fetchInvestmentData();
    }
  }, [id]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchInvestmentData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/investments/${id}`);
      const data = response.data;
      
      setInvestmentCategory(data.investmentCategory || "");
      setInvestmentMode(data.investmentMode || "");
      setName(data.name || "");
      setPrincipal(data.principal?.toString() || "");
      setCurrentValue(data.currentValue?.toString() || "");
      setStartDate(data.startDate || "");
      setLinkedAccountId(data.linkedAccountId || "");
      setNotes(data.notes || "");
      setQuantity(data.quantity?.toString() || "");
      setUnitPrice(data.unitPrice?.toString() || "");
      setCurrentPrice(data.currentPrice?.toString() || "");
      setReturnRate(data.returnRate?.toString() || "");
      setCompoundingType(data.compoundingType || "Simple");
      setCompoundingFrequency(data.compoundingFrequency || "");
      setPayoutFrequency(data.payoutFrequency || "");
      setMaturityDate(data.maturityDate || "");
      setExpectedMaturityValue(data.expectedMaturityValue?.toString() || "");
      setLockInPeriod(data.lockInPeriod?.toString() || "");
    } catch (error) {
      console.error("Error fetching investment data:", error);
      setErrors({ submit: "Failed to load investment data" });
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

    if (!investmentCategory) {
      newErrors.investmentCategory = "Please select investment category";
    }

    if (!investmentMode) {
      newErrors.investmentMode = "Please select investment mode";
    }

    if (!name.trim()) {
      newErrors.name = "Investment name is required";
    }

    if (!principal || parseFloat(principal) <= 0) {
      newErrors.principal = "Principal amount is required";
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
        investmentCategory,
        investmentMode,
        name,
        principal: parseFloat(principal),
        currentValue: currentValue ? parseFloat(currentValue) : parseFloat(principal),
        startDate,
        linkedAccountId: linkedAccountId || null,
        notes: notes || null,
        quantity: quantity ? parseFloat(quantity) : null,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        currentPrice: currentPrice ? parseFloat(currentPrice) : null,
        returnRate: returnRate ? parseFloat(returnRate) : null,
        compoundingType: compoundingType || null,
        compoundingFrequency: compoundingFrequency || null,
        payoutFrequency: payoutFrequency || null,
        maturityDate: maturityDate || null,
        expectedMaturityValue: expectedMaturityValue ? parseFloat(expectedMaturityValue) : null,
        lockInPeriod: lockInPeriod ? parseInt(lockInPeriod) : null,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/investments/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/investments`, payload);
      }
      
      navigate("/my-investments");
    } catch (error) {
      console.error("Error saving investment:", error);
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
      await axios.delete(`${backendUrl}/api/investments/${id}`);
      navigate("/my-investments");
    } catch (error) {
      console.error("Error deleting investment:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDigitalMetal = ["Digital Gold", "Digital Silver"].includes(investmentCategory);
  const isSGB = investmentCategory === "Sovereign Gold Bond (SGB)";
  const isIncomeGenerating = investmentMode === "Income Generating";
  const isGrowthWithMaturity = investmentMode === "Growth with Maturity";

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="investment-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9]"
          onClick={() => navigate("/my-investments")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Investment" : "Add Investment"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Investment Category */}
            <div className="w-full">
              <label htmlFor="investmentCategory" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Investment Category
              </label>
              <select
                id="investmentCategory"
                value={investmentCategory}
                onChange={(e) => { setInvestmentCategory(e.target.value); setInvestmentMode(""); }}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="category-select"
              >
                <option value="">Select Category</option>
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.investmentCategory && <p className="text-sm text-red-500 mt-1">{errors.investmentCategory}</p>}
            </div>

            {/* Investment Mode */}
            <div className="w-full">
              <label htmlFor="investmentMode" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Investment Mode
              </label>
              <select
                id="investmentMode"
                value={investmentMode}
                onChange={(e) => setInvestmentMode(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="mode-select"
              >
                <option value="">Select Mode</option>
                {modeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.investmentMode && <p className="text-sm text-red-500 mt-1">{errors.investmentMode}</p>}
            </div>

            {/* Investment Name */}
            <div className="w-full">
              <label htmlFor="name" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Investment Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., SBI FD 2025, HDFC MF Growth"
                maxLength={100}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="name-input"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Principal / Invested Amount */}
            <div className="w-full">
              <label htmlFor="principal" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Principal / Invested Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="principal"
                  type="text"
                  value={principal}
                  onChange={handleAmountChange(setPrincipal)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="principal-input"
                />
              </div>
              {parseFloat(principal) > 0 && (
                <p className="mt-1.5 text-xs text-[#0B3D2E]/50 italic" data-testid="principal-words">
                  {numberToWords(parseFloat(principal))}
                </p>
              )}
              {errors.principal && <p className="text-sm text-red-500 mt-1">{errors.principal}</p>}
            </div>

            {/* Start Date */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Start Date
              </label>
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-left text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="start-date-input"
                  >
                    <span className={startDate ? "text-[#0B3D2E]" : "text-[#94A3B8]"}>
                      {startDate ? format(new Date(startDate), "PPP") : "Select start date"}
                    </span>
                    <CalendarIcon className="h-5 w-5 text-[#94A3B8]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(format(date, "yyyy-MM-dd"));
                      }
                      setStartCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
            </div>

            {/* Digital Gold/Silver Specific Fields */}
            {isDigitalMetal && (
              <>
                <div className="w-full">
                  <label htmlFor="quantity" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Quantity (grams)
                  </label>
                  <input
                    id="quantity"
                    type="text"
                    value={quantity}
                    onChange={handleAmountChange(setQuantity)}
                    placeholder="e.g., 10.5"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="quantity-input"
                  />
                </div>
                <div className="w-full">
                  <label htmlFor="unitPrice" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Purchase Price per gram
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                    <input
                      id="unitPrice"
                      type="text"
                      value={unitPrice}
                      onChange={handleAmountChange(setUnitPrice)}
                      placeholder="0"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="unit-price-input"
                    />
                  </div>
                </div>
              </>
            )}

            {/* SGB Specific Fields */}
            {isSGB && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                <Info className="h-4 w-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#92400E]">
                  SGBs pay 2.5% interest semi-annually and have an 8-year maturity period.
                </p>
              </div>
            )}

            {/* Income Generating Mode Fields */}
            {isIncomeGenerating && (
              <>
                <div className="w-full">
                  <label htmlFor="returnRate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Return Rate (% per annum)
                  </label>
                  <div className="relative">
                    <input
                      id="returnRate"
                      type="text"
                      value={returnRate}
                      onChange={handleAmountChange(setReturnRate)}
                      placeholder="e.g., 7.5"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 pr-10 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="return-rate-input"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B3D2E]/60">%</span>
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-[#0B3D2E] mb-2">Interest Type</label>
                  <div className="flex rounded-lg overflow-hidden border border-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => setCompoundingType("Simple")}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        compoundingType === "Simple" ? "bg-[#0B3D2E] text-white" : "bg-white text-[#0B3D2E]"
                      }`}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompoundingType("Compound")}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        compoundingType === "Compound" ? "bg-[#0B3D2E] text-white" : "bg-white text-[#0B3D2E]"
                      }`}
                    >
                      Compound
                    </button>
                  </div>
                </div>

                {compoundingType === "Compound" && (
                  <div className="w-full">
                    <label htmlFor="compoundingFrequency" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Compounding Frequency
                    </label>
                    <select
                      id="compoundingFrequency"
                      value={compoundingFrequency}
                      onChange={(e) => setCompoundingFrequency(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    >
                      <option value="">Select Frequency</option>
                      {compoundingFrequencyOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="w-full">
                  <label htmlFor="payoutFrequency" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Payout Frequency
                  </label>
                  <select
                    id="payoutFrequency"
                    value={payoutFrequency}
                    onChange={(e) => setPayoutFrequency(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  >
                    <option value="">Select Frequency</option>
                    {payoutFrequencyOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Growth with Maturity Mode Fields */}
            {isGrowthWithMaturity && (
              <>
                <div className="w-full">
                  <label htmlFor="lockInPeriod" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Lock-in Period (months) <span className="text-[#94A3B8] font-normal">(Optional)</span>
                  </label>
                  <input
                    id="lockInPeriod"
                    type="text"
                    value={lockInPeriod}
                    onChange={handleAmountChange(setLockInPeriod)}
                    placeholder="e.g., 36"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="lock-in-input"
                  />
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Maturity Date
                  </label>
                  <Popover open={maturityCalendarOpen} onOpenChange={setMaturityCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-left text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                        data-testid="maturity-date-input"
                      >
                        <span className={maturityDate ? "text-[#0B3D2E]" : "text-[#94A3B8]"}>
                          {maturityDate ? format(new Date(maturityDate), "PPP") : "Select maturity date"}
                        </span>
                        <CalendarIcon className="h-5 w-5 text-[#94A3B8]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white" align="start">
                      <Calendar
                        mode="single"
                        selected={maturityDate ? new Date(maturityDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setMaturityDate(format(date, "yyyy-MM-dd"));
                          }
                          setMaturityCalendarOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="w-full">
                  <label htmlFor="expectedMaturityValue" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Expected Maturity Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                    <input
                      id="expectedMaturityValue"
                      type="text"
                      value={expectedMaturityValue}
                      onChange={handleAmountChange(setExpectedMaturityValue)}
                      placeholder="0"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="maturity-value-input"
                    />
                  </div>
                  {parseFloat(expectedMaturityValue) > 0 && (
                    <p className="mt-1.5 text-xs text-[#0B3D2E]/50 italic" data-testid="maturity-value-words">
                      {numberToWords(parseFloat(expectedMaturityValue))}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Current Value */}
            <div className="w-full">
              <label htmlFor="currentValue" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Current Value <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="currentValue"
                  type="text"
                  value={currentValue}
                  onChange={handleAmountChange(setCurrentValue)}
                  placeholder="Defaults to principal if empty"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="current-value-input"
                />
              </div>
              {parseFloat(currentValue) > 0 && (
                <p className="mt-1.5 text-xs text-[#0B3D2E]/50 italic" data-testid="current-value-words">
                  {numberToWords(parseFloat(currentValue))}
                </p>
              )}
              <p className="text-xs text-[#0B3D2E]/60 mt-1">This feeds into your Net Worth calculation</p>
            </div>

            {/* Linked Account */}
            {accounts.length > 0 && (
              <div className="w-full">
                <label htmlFor="linkedAccount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Linked Account <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="linkedAccount"
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="linked-account-select"
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.accountType}</option>
                  ))}
                </select>
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
                {isSubmitting ? "Updating..." : "Update Investment"}
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
              {isSubmitting ? "Saving..." : "Save Investment"}
            </button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#0B3D2E] mb-3">Confirm Changes</h3>
            <p className="text-[#0B3D2E]/70 mb-6">Are you sure you want to update this investment?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium">Cancel</button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#00D09C] px-4 py-3 text-white font-medium">Yes, Update</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Investment?</h3>
            <p className="text-[#0B3D2E]/70 mb-6">Are you sure you want to delete "{name}"? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium">Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentForm;
