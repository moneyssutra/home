import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, Trash2, AlertCircle, CalendarDays, ChevronDown, Gift, Award, TrendingUp, Wallet, RefreshCw, Banknote, Sparkles, ArrowLeftRight, ReceiptText, CheckCircle, PlusCircle, ChevronRight, X, Check } from "lucide-react";
import axios from "axios";
import { mutate } from "swr";
import WizardShell from "@/components/WizardShell";
import { fireConfetti } from "@/lib/confetti";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ValidationMessage } from "@/components/ValidationMessage";
import { 
  validatePositiveAmount, 
  validateTextField,
  scrollToFirstError
} from "@/lib/validations";
import TransactionHistoryPanel from "@/components/TransactionHistoryPanel";
import IncomeAmountModal from "@/components/IncomeAmountModal";
import { 
  recordIncomeTransaction, 
  getIncomeTransactionHistory,
  deleteIncomeTransaction,
  updateIncomeTransaction,
  dismissRelatedNotifications
} from "@/utils/transactionApi";
import { toast } from "sonner";

const OtherIncomeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const conditionalRef = useRef(null);

  const [formData, setFormData] = useState({
    incomeName: "",
    category: "",
    customCategory: "",
    amount: "",
    frequency: "One-Time",
    dateReceived: null,
    selectedDay: "",
    selectedDate: "",
    selectedMonth: "",
    selectedQuarter: "",
    selectedHalf: "",
    notes: "",
    isReceived: false,
    startDate: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Income Amount Modal
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const categories = [
    { value: "Gift", label: "Gift", icon: Gift, color: "bg-pink-500/10 text-pink-500 border-pink-500/30" },
    { value: "Bonus", label: "Bonus", icon: Award, color: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
    { value: "Incentive", label: "Incentive", icon: Sparkles, color: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
    { value: "Capital Gain", label: "Capital Gain", icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
    { value: "Asset Sale", label: "Asset Sale", icon: Banknote, color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
    { value: "Tax Refund", label: "Tax Refund", icon: RefreshCw, color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30" },
    { value: "Cashback / Reward", label: "Cashback / Reward", icon: Wallet, color: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
    { value: "Reimbursement", label: "Reimbursement", icon: ArrowLeftRight, color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30" },
    { value: "Freelance / Side Work", label: "Freelance / Side Work", icon: ReceiptText, color: "bg-teal-500/10 text-teal-500 border-teal-500/30" },
    { value: "Windfall", label: "Windfall", icon: Sparkles, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
    { value: "Refund", label: "Refund", icon: RefreshCw, color: "bg-green-500/10 text-green-500 border-green-500/30" },
    { value: "Miscellaneous", label: "Miscellaneous", icon: Wallet, color: "bg-slate-500/10 text-slate-500 border-slate-500/30" },
    { value: "Other", label: "Other (Custom)", icon: Wallet, color: "bg-[#1E293B]0/10 text-slate-400 border-gray-500/30" },
  ];

  const frequencies = ["One-Time", "Daily", "Weekly", "Monthly", "Quarterly", "Half-Yearly", "Yearly", "Irregular"];

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const quarters = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"];
  const halves = [
    { id: "H1", label: "Jan–Jun" },
    { id: "H2", label: "Jul–Dec" },
  ];

  const hasMounted = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Delay setting mounted flag so the frequency useEffect skips on initial render
    const timer = setTimeout(() => { hasMounted.current = true; }, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isEdit) {
      fetchIncome();
    }
  }, [id]);

  useEffect(() => {
    if (hasMounted.current && conditionalRef.current && formData.frequency) {
      setTimeout(() => {
        conditionalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [formData.frequency]);

  const fetchIncome = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/other-income/${id}`);
      const data = response.data;
      setFormData({
        incomeName: data.incomeName || "",
        category: data.category || "",
        customCategory: data.customCategory || "",
        amount: data.amount || "",
        frequency: data.frequency || "One-Time",
        dateReceived: data.dateReceived ? new Date(data.dateReceived) : null,
        selectedDay: data.selectedDay || "",
        selectedDate: data.selectedDate || "",
        selectedMonth: data.selectedMonth || "",
        selectedQuarter: data.selectedQuarter || "",
        selectedHalf: data.selectedHalf || "",
        notes: data.notes || "",
        isReceived: data.isReceived || false,
        startDate: data.startDate || "",
      });
    } catch (error) {
      console.error("Error fetching income:", error);
      setError("Failed to load income details");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
    setErrors({});
  };

  const handleSubmit = async () => {
    const newErrors = {};
    
    // Income Name validation
    const nameError = validateTextField(formData.incomeName, "Income name", 100);
    if (nameError) newErrors.incomeName = nameError;
    
    // Category validation
    if (!formData.category) {
      newErrors.category = "Please select a category.";
    }
    
    // Custom Category validation (for "Other")
    if (formData.category === "Other") {
      const customError = validateTextField(formData.customCategory, "Custom category name", 50);
      if (customError) newErrors.customCategory = customError;
    }
    
    // Amount validation
    const amountError = validatePositiveAmount(formData.amount, "Amount");
    if (amountError) newErrors.amount = amountError;
    
    // Set errors and show first one
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      setError(firstError);
      scrollToFirstError(newErrors);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        incomeName: formData.incomeName.trim(),
        category: formData.category,
        customCategory: formData.category === "Other" ? formData.customCategory.trim() : null,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        dateReceived: formData.dateReceived ? formData.dateReceived.toISOString().split("T")[0] : null,
        selectedDay: formData.selectedDay || null,
        selectedDate: formData.selectedDate || null,
        selectedMonth: formData.selectedMonth || null,
        selectedQuarter: formData.selectedQuarter || null,
        selectedHalf: formData.selectedHalf || null,
        notes: formData.notes.trim() || null,
        isReceived: formData.isReceived,
        startDate: formData.startDate || null,
      };

      if (isEdit) {
        await axios.put(`${backendUrl}/api/other-income/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/other-income`, payload);
      }
      
      // Invalidate SWR cache
      await mutate((key) => typeof key === 'string' && key.includes('/api/other-income'), undefined, { revalidate: true });
      
      fireConfetti();
      setTimeout(() => navigate("/my-other-income"), 400);
    } catch (error) {
      console.error("Error saving income:", error);
      setError("Failed to save income. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await axios.delete(`${backendUrl}/api/other-income/${id}`);
      await mutate((key) => typeof key === 'string' && key.includes('/api/other-income'), undefined, { revalidate: true });
      navigate("/my-other-income");
    } catch (error) {
      console.error("Error deleting income:", error);
      setError("Failed to delete. Please try again.");
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  // ─── WIZARD STEP MANAGEMENT ───
  const TOTAL_STEPS = 3;
  const [step, setStep] = useState(1);

  const validateStep = (s) => {
    if (s === 1) {
      if (!formData.incomeName.trim()) { setError("Please enter income name."); return false; }
      if (!formData.category) { setError("Please select a category."); return false; }
      if (formData.category === "Other" && !formData.customCategory.trim()) { setError("Please enter custom category."); return false; }
    }
    if (s === 2) {
      if (!formData.amount || parseFloat(formData.amount) <= 0) { setError("Please enter a valid amount."); return false; }
      if (!formData.frequency) { setError("Please select a frequency."); return false; }
    }
    if (s === 3) {
      // Schedule fields validated by existing validate logic on save
    }
    setError("");
    return true;
  };

  const handleNext = () => { if (validateStep(step)) setStep(Math.min(step + 1, TOTAL_STEPS)); };
  const handlePrev = () => { setError(""); setStep(Math.max(step - 1, 1)); };

  const getOrdinal = (n) => {
    const num = parseInt(n);
    if (num > 3 && num < 21) return "th";
    switch (num % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen honeycomb-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#7C3AED]/30 border-t-[#7C3AED] rounded-full animate-spin" />
      </div>
    );
  }

  // ─── STEP CONTENT ───
  const step1Content = (
    <div className="space-y-6" data-testid="step-1-details">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Income Details</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>What kind of income is this?</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Income Name</label>
        <input type="text" value={formData.incomeName} onChange={(e) => handleChange("incomeName", e.target.value)}
          placeholder="e.g., Birthday Gift, Annual Bonus"
          className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="income-name-input" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Category</label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = formData.category === cat.value;
            return (
              <button key={cat.value} type="button" onClick={() => handleChange("category", cat.value)}
                className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                  isSelected ? cat.color + " border-current" : "border-transparent hover:border-gray-200"
                )}
                style={!isSelected ? { backgroundColor: "var(--bg-subtle)" } : {}}
                data-testid={`category-${cat.value.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium text-center leading-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {formData.category === "Other" && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Custom Category Name</label>
          <input type="text" value={formData.customCategory} onChange={(e) => handleChange("customCategory", e.target.value)}
            placeholder="Enter custom category"
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="custom-category-input" />
        </div>
      )}
    </div>
  );

  const step2Content = (
    <div className="space-y-6" data-testid="step-2-amount">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>How much & how often?</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Set the amount and frequency</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-primary)" }}>₹</span>
          <input type="text" value={formData.amount}
            onChange={(e) => handleChange("amount", e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0"
            className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="amount-input" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Frequency</label>
        <div className="grid grid-cols-2 gap-2">
          {frequencies.map((freq) => (
            <button key={freq} type="button" onClick={() => handleChange("frequency", freq)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] ${formData.frequency === freq ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] ring-1 ring-[#7C3AED]/30" : ""}`}
              style={formData.frequency !== freq ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
              data-testid={`freq-${freq.toLowerCase().replace(/\s+/g, '-')}`}>{freq}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <div className="flex items-center gap-3">
          <CheckCircle className={cn("h-5 w-5", formData.isReceived ? "text-emerald-500" : "text-gray-400")} />
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>Already Received?</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Mark if you've already received this income</p>
          </div>
        </div>
        <button type="button" onClick={() => handleChange("isReceived", !formData.isReceived)}
          className={cn("w-12 h-7 rounded-full transition-colors relative", formData.isReceived ? "bg-emerald-500" : "bg-gray-300")}
          data-testid="is-received-toggle">
          <span className={cn("absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform", formData.isReceived ? "translate-x-6" : "translate-x-1")} />
        </button>
      </div>
    </div>
  );

  const step3Content = (
    <div className="space-y-6" data-testid="step-3-schedule">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Schedule & Notes</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Additional details</p>
      </div>
      <div ref={conditionalRef}>
        {(formData.frequency === "One-Time" || formData.frequency === "Irregular") && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Date Received</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-12 rounded-xl", !formData.dateReceived && "text-muted-foreground")} data-testid="date-received-picker">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {formData.dateReceived ? format(formData.dateReceived, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComp mode="single" selected={formData.dateReceived} onSelect={(date) => handleChange("dateReceived", date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        )}
        {formData.frequency === "Weekly" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Day of Week</label>
            <div className="grid grid-cols-2 gap-2">
              {days.map((day) => (
                <button key={day} type="button" onClick={() => handleChange("selectedDay", day)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${formData.selectedDay === day ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : ""}`}
                  style={formData.selectedDay !== day ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
                  data-testid={`weekly-day-${day.toLowerCase()}`}>{day}</button>
              ))}
            </div>
          </div>
        )}
        {formData.frequency === "Monthly" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Day of Month</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-12 rounded-xl", !formData.selectedDate && "text-muted-foreground")} data-testid="monthly-date-picker">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {formData.selectedDate ? `${formData.selectedDate}${getOrdinal(formData.selectedDate)} of every month` : "Select day"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComp mode="single" selected={formData.selectedDate ? new Date(2024, 0, parseInt(formData.selectedDate)) : undefined}
                  onSelect={(date) => date && handleChange("selectedDate", String(date.getDate()))} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        )}
        {formData.frequency === "Quarterly" && (
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Quarter</label>
              <div className="grid grid-cols-2 gap-2">
                {quarters.map((q) => (
                  <button key={q} type="button" onClick={() => handleChange("selectedQuarter", q)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${formData.selectedQuarter === q ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : ""}`}
                    style={formData.selectedQuarter !== q ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
                    data-testid={`quarter-${q.replace(/\s/g, '-')}`}>{q}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Day of Quarter Start Month</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-12 rounded-xl", !formData.selectedDate && "text-muted-foreground")} data-testid="quarterly-date-picker">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formData.selectedDate ? `${formData.selectedDate}${getOrdinal(formData.selectedDate)}` : "Select day"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComp mode="single" selected={formData.selectedDate ? new Date(2024, 0, parseInt(formData.selectedDate)) : undefined}
                    onSelect={(date) => date && handleChange("selectedDate", String(date.getDate()))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
        {formData.frequency === "Half-Yearly" && (
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Half</label>
              <div className="grid grid-cols-2 gap-2">
                {halves.map((h) => (
                  <button key={h.id} type="button" onClick={() => handleChange("selectedHalf", h.label)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${formData.selectedHalf === h.label ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : ""}`}
                    style={formData.selectedHalf !== h.label ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
                    data-testid={`half-${h.id}`}>{h.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Day of Month</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-12 rounded-xl", !formData.selectedDate && "text-muted-foreground")} data-testid="half-yearly-date-picker">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formData.selectedDate ? `${formData.selectedDate}${getOrdinal(formData.selectedDate)}` : "Select day"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComp mode="single" selected={formData.selectedDate ? new Date(2024, 0, parseInt(formData.selectedDate)) : undefined}
                    onSelect={(date) => date && handleChange("selectedDate", String(date.getDate()))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
        {formData.frequency === "Yearly" && (
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Month</label>
              <div className="grid grid-cols-3 gap-2">
                {months.map((m) => (
                  <button key={m} type="button" onClick={() => handleChange("selectedMonth", m)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all active:scale-[0.97] ${formData.selectedMonth === m ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : ""}`}
                    style={formData.selectedMonth !== m ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
                    data-testid={`month-${m.toLowerCase().slice(0,3)}`}>{m.slice(0, 3)}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Day of Month</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-12 rounded-xl", !formData.selectedDate && "text-muted-foreground")} data-testid="yearly-date-picker">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formData.selectedDate ? `${formData.selectedDate}${getOrdinal(formData.selectedDate)}` : "Select day"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComp mode="single" selected={formData.selectedDate ? new Date(2024, 0, parseInt(formData.selectedDate)) : undefined}
                    onSelect={(date) => date && handleChange("selectedDate", String(date.getDate()))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Start Date <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span></label>
        <input type="date" value={formData.startDate} onChange={(e) => handleChange("startDate", e.target.value)}
          className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="start-date-input" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Notes (Optional)</label>
        <textarea value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Add any additional details..." rows={3}
          className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 resize-none"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="notes-input" />
      </div>
    </div>
  );

  const editModeContent = (
    <div className="space-y-8" data-testid="other-income-edit-all-fields">
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#7C3AED]/10 flex items-center justify-center text-xs font-bold text-[#7C3AED]">1</span>Details</h3>{step1Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#7C3AED]/10 flex items-center justify-center text-xs font-bold text-[#7C3AED]">2</span>Amount</h3>{step2Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#7C3AED]/10 flex items-center justify-center text-xs font-bold text-[#7C3AED]">3</span>Schedule</h3>{step3Content}</div>
    </div>
  );

  const ledgerContent = isEdit ? (
    <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: "#7C3AED08", border: "1px solid #7C3AED20" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>Income Ledger</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Track your earnings</p>
        </div>
        <button type="button" onClick={() => setShowIncomeModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#7C3AED] text-white text-xs font-medium" data-testid="add-todays-income-btn">
          <PlusCircle className="h-3.5 w-3.5" /> Add Income
        </button>
      </div>
      <TransactionHistoryPanel key={transactionRefreshKey} entityId={id} entityType="income"
        fetchHistory={getIncomeTransactionHistory} deleteTransaction={deleteIncomeTransaction}
        onTransactionDeleted={() => setTransactionRefreshKey(k => k + 1)}
        onEditTransaction={(txn) => { setEditingTransaction(txn); setShowRecordModal(true); }} />
    </div>
  ) : null;

  const errorContent = error ? <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm mt-4"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div> : null;

  const dialogContent = (
    <>
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" data-testid="delete-modal">
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>Delete Entry?</h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>This will permanently delete this income entry. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border font-medium" style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}>Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50" data-testid="confirm-delete-btn">{saving ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
      <IncomeAmountModal isOpen={showIncomeModal || showRecordModal}
        onClose={() => { setShowIncomeModal(false); setShowRecordModal(false); setEditingTransaction(null); }}
        entityId={id} entityName={formData.incomeName} expectedAmount={parseFloat(formData.amount) || 0}
        editingTransaction={editingTransaction}
        onSubmit={async (data) => { await recordIncomeTransaction(data); await dismissRelatedNotifications(id); setTransactionRefreshKey(k => k + 1); }}
        onUpdate={async (data) => { await updateIncomeTransaction(data.transactionId, { amount: data.amount, transactionDate: data.transactionDate }); setTransactionRefreshKey(k => k + 1); }} />
    </>
  );

  return (
    <WizardShell
      title={isEdit ? "Edit Other Income" : "Add Other Income"}
      step={step} totalSteps={TOTAL_STEPS}
      onNext={handleNext} onPrev={handlePrev} onSave={handleSubmit}
      onDelete={isEdit ? () => setShowDeleteConfirm(true) : undefined}
      isEdit={isEdit} isSubmitting={saving} accentColor="#7C3AED"
      editModeContent={editModeContent} ledgerContent={ledgerContent}
      errorContent={errorContent} dialogContent={dialogContent}
      onClose={() => navigate(-1)}
    >
      {step === 1 && step1Content}
      {step === 2 && step2Content}
      {step === 3 && step3Content}
    </WizardShell>
  );
};

export default OtherIncomeForm;
