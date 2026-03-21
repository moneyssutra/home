import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, Link2, Target, AlertCircle, ImagePlus, X, Sparkles, Check } from "lucide-react";
import axios from "axios";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  validatePositiveAmount, 
  validateTextField,
  validateFutureDate,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";

const TOTAL_STEPS = 5;

const GoalForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  
  // Wizard step — edit mode starts at step 4 (Amount/Date) so user sees key fields first
  const [step, setStep] = useState(isEditMode ? 4 : 1);

  // Form fields
  const [goalName, setGoalName] = useState("");
  const [goalType, setGoalType] = useState("");
  const [customTypeName, setCustomTypeName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState(2);
  const [notes, setNotes] = useState("");
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [manualOverride, setManualOverride] = useState(false);
  const [goalImage, setGoalImage] = useState(null);
  const [goalImagePreview, setGoalImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);
  
  // Linked sources
  const [linkedInvestmentIds, setLinkedInvestmentIds] = useState([]);
  const [linkedLoanId, setLinkedLoanId] = useState("");
  const [linkedCreditCardId, setLinkedCreditCardId] = useState("");
  const [linkedAccountIds, setLinkedAccountIds] = useState([]);
  const [linkedInvestments, setLinkedInvestments] = useState([]);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [allocationStatus, setAllocationStatus] = useState({ investments: [], accounts: [] });
  const [allocationDialog, setAllocationDialog] = useState({ open: false, type: null, item: null });
  const [allocationAmount, setAllocationAmount] = useState("");
  
  // Available sources
  const [investments, setInvestments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [targetCalendarOpen, setTargetCalendarOpen] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const goalTypeOptions = [
    { value: "Wealth Creation", label: "Wealth Creation", description: "Save for a big purchase or milestone", icon: "star" },
    { value: "Debt Elimination", label: "Debt Elimination", description: "Pay off loans or credit cards", icon: "trending-down" },
    { value: "Investment Target", label: "Investment Target", description: "Reach a specific investment value", icon: "bar-chart" },
    { value: "Emergency Fund", label: "Emergency Fund", description: "Build a safety net for emergencies", icon: "shield" },
    { value: "Other", label: "Other", description: "Custom goal with your own name", icon: "plus-circle" }
  ];

  const stepLabels = ["Type", "Name", "Image", "Amount", "Details"];

  useEffect(() => {
    fetchSources();
    fetchAllocationStatus();
    if (id) fetchGoalData();
  }, [id]);

  const fetchAllocationStatus = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/goals/allocation-status`);
      setAllocationStatus(response.data);
    } catch (error) {
      console.error("Error fetching allocation status:", error);
    }
  };

  const fetchSources = async () => {
    try {
      const [invRes, loanRes, cardRes, accRes] = await Promise.all([
        axios.get(`${backendUrl}/api/investments`),
        axios.get(`${backendUrl}/api/loans`),
        axios.get(`${backendUrl}/api/credit-cards`),
        axios.get(`${backendUrl}/api/accounts`)
      ]);
      setInvestments(invRes.data);
      setLoans(loanRes.data);
      setCreditCards(cardRes.data);
      setAccounts(accRes.data.filter(a => a.accountType !== 'Credit Card'));
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  };

  const fetchGoalData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/goals/${id}`);
      const data = response.data;
      setGoalName(data.goalName || "");
      setGoalType(data.goalType || "");
      setCustomTypeName(data.customTypeName || "");
      setTargetAmount(data.targetAmount?.toString() || "");
      setCurrentAmount(data.currentAmount?.toString() || "");
      setTargetDate(data.targetDate || "");
      setPriority(data.priority || 2);
      setNotes(data.notes || "");
      setAutoCalculate(data.autoCalculate !== false);
      setManualOverride(data.manualOverride || false);
      if (data.goalImage) {
        setGoalImagePreview(data.goalImage.startsWith("/api") ? `${backendUrl}${data.goalImage}` : data.goalImage);
      }
      setLinkedInvestmentIds(data.linkedInvestmentIds || []);
      setLinkedLoanId(data.linkedLoanId || "");
      setLinkedCreditCardId(data.linkedCreditCardId || "");
      setLinkedAccountIds(data.linkedAccountIds || []);
      const normalizedInvestments = (data.linkedInvestments || []).map(li => ({
        id: li.id, name: li.name || 'Unknown',
        allocatedAmount: li.allocatedAmount || li.currentValue || li.principal || 0
      }));
      setLinkedInvestments(normalizedInvestments);
      const normalizedAccounts = (data.linkedAccounts || []).map(la => ({
        id: la.id, name: la.accountName || la.name || 'Unknown',
        allocatedAmount: la.allocatedAmount || la.currentBalance || 0
      }));
      setLinkedAccounts(normalizedAccounts);
    } catch (error) {
      console.error("Error fetching goal data:", error);
      setErrors({ submit: "Failed to load goal data" });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (setter) => (e) => {
    setter(formatAmountInput(e.target.value));
  };

  // Allocation helpers (unchanged logic)
  const getInvestmentAllocationInfo = (invId) => {
    const invStatus = allocationStatus.investments?.find(i => i.id === invId);
    return invStatus || { totalValue: 0, allocatedAmount: 0, remainingAmount: 0, allocations: [] };
  };
  const getAccountAllocationInfo = (accId) => {
    const accStatus = allocationStatus.accounts?.find(a => a.id === accId);
    return accStatus || { totalBalance: 0, allocatedAmount: 0, remainingAmount: 0, allocations: [] };
  };
  const getLinkedInvestmentAllocation = (invId) => linkedInvestments.find(li => li.id === invId);
  const getLinkedAccountAllocation = (accId) => linkedAccounts.find(la => la.id === accId);

  const handleInvestmentClick = (inv) => {
    const existingAllocation = getLinkedInvestmentAllocation(inv.id);
    const allocInfo = getInvestmentAllocationInfo(inv.id);
    const currentAllocationToThisGoal = existingAllocation?.allocatedAmount || 0;
    const availableAmount = allocInfo.remainingAmount + currentAllocationToThisGoal;
    setAllocationDialog({
      open: true, type: 'investment', item: inv,
      totalValue: inv.currentValue || inv.principal || 0,
      availableAmount, existingAllocation: currentAllocationToThisGoal, allocInfo
    });
    setAllocationAmount(currentAllocationToThisGoal > 0 ? currentAllocationToThisGoal.toString() : "");
  };

  const handleAccountClick = (acc) => {
    const existingAllocation = getLinkedAccountAllocation(acc.id);
    const allocInfo = getAccountAllocationInfo(acc.id);
    const currentAllocationToThisGoal = existingAllocation?.allocatedAmount || 0;
    const availableAmount = allocInfo.remainingAmount + currentAllocationToThisGoal;
    setAllocationDialog({
      open: true, type: 'account', item: acc,
      totalValue: acc.currentBalance || 0,
      availableAmount, existingAllocation: currentAllocationToThisGoal, allocInfo
    });
    setAllocationAmount(currentAllocationToThisGoal > 0 ? currentAllocationToThisGoal.toString() : "");
  };

  const handleSaveAllocation = () => {
    const amount = parseFloat(allocationAmount) || 0;
    if (allocationDialog.type === 'investment') {
      const inv = allocationDialog.item;
      if (amount > 0) {
        setLinkedInvestments(prev => {
          const existing = prev.find(li => li.id === inv.id);
          if (existing) return prev.map(li => li.id === inv.id ? { ...li, allocatedAmount: amount } : li);
          return [...prev, { id: inv.id, allocatedAmount: amount, name: inv.name }];
        });
        setLinkedInvestmentIds(prev => prev.filter(invId => invId !== inv.id));
      } else {
        setLinkedInvestments(prev => prev.filter(li => li.id !== inv.id));
      }
    } else if (allocationDialog.type === 'account') {
      const acc = allocationDialog.item;
      if (amount > 0) {
        setLinkedAccounts(prev => {
          const existing = prev.find(la => la.id === acc.id);
          if (existing) return prev.map(la => la.id === acc.id ? { ...la, allocatedAmount: amount } : la);
          return [...prev, { id: acc.id, allocatedAmount: amount, name: acc.accountName }];
        });
        setLinkedAccountIds(prev => prev.filter(accId => accId !== acc.id));
      } else {
        setLinkedAccounts(prev => prev.filter(la => la.id !== acc.id));
      }
    }
    setAllocationDialog({ open: false, type: null, item: null });
    setAllocationAmount("");
  };

  const handleRemoveAllocation = () => {
    if (allocationDialog.type === 'investment') {
      setLinkedInvestments(prev => prev.filter(li => li.id !== allocationDialog.item.id));
    } else if (allocationDialog.type === 'account') {
      setLinkedAccounts(prev => prev.filter(la => la.id !== allocationDialog.item.id));
    }
    setAllocationDialog({ open: false, type: null, item: null });
    setAllocationAmount("");
  };

  // Clear field errors in real-time
  useEffect(() => { if (goalType && errors.goalType) setErrors(prev => { const n = {...prev}; delete n.goalType; return n; }); }, [goalType]);
  useEffect(() => { if (goalName && errors.goalName) setErrors(prev => { const n = {...prev}; delete n.goalName; return n; }); }, [goalName]);
  useEffect(() => { if (targetAmount && errors.targetAmount) setErrors(prev => { const n = {...prev}; delete n.targetAmount; return n; }); }, [targetAmount]);
  useEffect(() => { if (targetDate && errors.targetDate) setErrors(prev => { const n = {...prev}; delete n.targetDate; return n; }); }, [targetDate]);
  useEffect(() => { if (customTypeName && errors.customTypeName) setErrors(prev => { const n = {...prev}; delete n.customTypeName; return n; }); }, [customTypeName]);

  // Step validation
  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      if (!goalType) newErrors.goalType = "Please select a goal type.";
      if (goalType === "Other") {
        const customNameError = validateTextField(customTypeName, "Custom type name", 50);
        if (customNameError) newErrors.customTypeName = customNameError;
      }
    } else if (s === 2) {
      const nameError = validateTextField(goalName, "Goal name", 100);
      if (nameError) newErrors.goalName = nameError;
    } else if (s === 4) {
      const targetError = validatePositiveAmount(targetAmount, "Target amount");
      if (targetError) newErrors.targetAmount = targetError;
      if (!targetDate) {
        newErrors.targetDate = "Target date is required.";
      } else {
        const futureDateError = validateFutureDate(targetDate, "Target date");
        if (futureDateError) newErrors.targetDate = futureDateError;
      }
    } else if (s === 5) {
      if (manualOverride && currentAmount && parseFloat(currentAmount) < 0) {
        newErrors.currentAmount = "Current amount cannot be negative.";
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep(Math.min(step + 1, TOTAL_STEPS));
  };

  const handlePrev = () => {
    setStep(Math.max(step - 1, 1));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, goalImage: "Image must be under 5MB" }));
      return;
    }
    setGoalImage(file);
    setGoalImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setGoalImage(null);
    setGoalImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const uploadGoalImage = async (goalId) => {
    if (!goalImage) return;
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", goalImage);
      await axios.post(`${backendUrl}/api/goals/${goalId}/upload-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!validateStep(step)) return;
    if (id) { setShowUpdateConfirm(true); return; }
    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true);
    setShowUpdateConfirm(false);
    try {
      const payload = {
        goalName, goalType,
        customTypeName: goalType === "Other" ? customTypeName : null,
        targetAmount: parseFloat(targetAmount),
        currentAmount: manualOverride ? parseFloat(currentAmount || 0) : 0,
        targetDate, linkedInvestmentIds, linkedInvestments,
        linkedLoanId: linkedLoanId || null,
        linkedCreditCardId: linkedCreditCardId || null,
        linkedAccountIds, linkedAccounts, autoCalculate, manualOverride,
        priority, notes: notes || null
      };
      let savedGoalId = id;
      if (id) {
        await axios.put(`${backendUrl}/api/goals/${id}`, payload);
      } else {
        const resp = await axios.post(`${backendUrl}/api/goals`, payload);
        savedGoalId = resp.data?.id;
      }
      if (goalImage && savedGoalId) await uploadGoalImage(savedGoalId);
      navigate("/dream-goals");
    } catch (error) {
      console.error("Error saving goal:", error);
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
      await axios.delete(`${backendUrl}/api/goals/${id}`);
      navigate("/dream-goals");
    } catch (error) {
      console.error("Error deleting goal:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDebtFields = goalType === "Debt Elimination";
  const showInvestmentFields = ["Wealth Creation", "Investment Target", "Emergency Fund", "Other"].includes(goalType);

  /* ─── Step indicator ─── */
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1.5 mb-6" data-testid="step-indicator">
      {stepLabels.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = step === stepNum;
        const isCompleted = step > stepNum;
        return (
          <div key={label} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { if (isCompleted) setStep(stepNum); }}
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#7C3AED] text-white shadow-md shadow-[#7C3AED]/30"
                  : isCompleted
                    ? "bg-[#7C3AED]/20 text-[#7C3AED] cursor-pointer"
                    : "bg-gray-100 text-gray-400"
              }`}
              disabled={!isCompleted}
              data-testid={`step-dot-${stepNum}`}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
            </button>
            {idx < TOTAL_STEPS - 1 && (
              <div className={`w-6 h-0.5 rounded ${isCompleted ? "bg-[#7C3AED]/40" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  /* ─── STEP 1: Goal Type ─── */
  const Step1 = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300" data-testid="wizard-step-1">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>What's your dream?</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Choose the type that best fits your goal</p>
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {goalTypeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setGoalType(option.value);
              setErrors(prev => { const n = {...prev}; delete n.goalType; return n; });
              if (option.value !== "Other") {
                setStep(2);
              }
            }}
            className="flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]"
            style={{
              borderColor: goalType === option.value ? "#7C3AED" : "var(--border-light)",
              backgroundColor: goalType === option.value ? "rgba(124, 58, 237, 0.05)" : "var(--bg-card)",
            }}
            data-testid={`goal-type-${option.value.toLowerCase().replace(/\s/g, "-")}`}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{
              backgroundColor: goalType === option.value ? "#7C3AED" : "var(--bg-subtle)",
            }}>
              <Target className="h-5 w-5" style={{ color: goalType === option.value ? "white" : "var(--text-muted)" }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: goalType === option.value ? "#7C3AED" : "var(--text-primary)" }}>{option.label}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{option.description}</p>
            </div>
            {goalType === option.value && (
              <div className="w-6 h-6 rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
      {errors.goalType && <p className="text-sm text-red-500 mt-1">{errors.goalType}</p>}

      {goalType === "Other" && (
        <div className="animate-in fade-in slide-in-from-top-2 pt-2">
          <label htmlFor="customTypeName" className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            Custom Goal Type Name
          </label>
          <input
            id="customTypeName"
            type="text"
            value={customTypeName}
            onChange={(e) => setCustomTypeName(e.target.value)}
            placeholder="e.g., Vacation, Wedding, Car"
            maxLength={50}
            className="w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-[#7C3AED]/20 outline-none"
            style={{ borderColor: "var(--border-light)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
            data-testid="custom-type-name-input"
          />
          {errors.customTypeName && <p className="text-sm text-red-500 mt-1">{errors.customTypeName}</p>}
        </div>
      )}
    </div>
  );

  /* ─── STEP 2: Goal Name ─── */
  const Step2 = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300" data-testid="wizard-step-2">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Name your dream</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Give your goal a meaningful name</p>
      </div>
      <div>
        <label htmlFor="goalName" className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          Goal Name
        </label>
        <input
          id="goalName"
          type="text"
          value={goalName}
          onChange={(e) => setGoalName(e.target.value)}
          placeholder="e.g., House Down Payment, Pay off Car Loan"
          maxLength={100}
          autoFocus
          className="w-full rounded-xl border px-4 py-3.5 text-base focus:ring-2 focus:ring-[#7C3AED]/20 outline-none"
          style={{ borderColor: "var(--border-light)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
          data-testid="goal-name-input"
        />
        {errors.goalName && <p className="text-sm text-red-500 mt-1">{errors.goalName}</p>}
      </div>
      <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Sparkles className="h-3.5 w-3.5 inline mr-1" style={{ color: "#7C3AED" }} />
          Tip: Be specific! "Goa Trip 2027" is better than "Vacation"
        </p>
      </div>
    </div>
  );

  /* ─── STEP 3: Goal Image ─── */
  const Step3 = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300" data-testid="wizard-step-3">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Visualize your dream</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Upload an image that inspires you (optional)</p>
      </div>
      {goalImagePreview ? (
        <div className="relative rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border-light)" }} data-testid="goal-image-preview">
          <img src={goalImagePreview} alt="Goal" className="w-full h-48 object-cover" />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition"
            data-testid="remove-image-btn"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-12 transition-all hover:border-[#7C3AED]/50"
          style={{ borderColor: "var(--border-light)", color: "var(--text-muted)" }}
          data-testid="upload-image-btn"
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(124, 58, 237, 0.1)" }}>
            <ImagePlus size={28} style={{ color: "#7C3AED" }} />
          </div>
          <div className="text-center">
            <span className="text-sm font-medium block" style={{ color: "var(--text-primary)" }}>Upload a dream image</span>
            <span className="text-xs mt-0.5 block">JPG, PNG up to 5MB</span>
          </div>
        </button>
      )}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageSelect}
        className="hidden"
        data-testid="image-file-input"
      />
      {errors.goalImage && <p className="text-sm text-red-500 mt-1">{errors.goalImage}</p>}
      <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
        Don't worry, we'll pick a default image based on your goal name if you skip this
      </p>
    </div>
  );

  /* ─── STEP 4: Target Amount + Date ─── */
  const Step4 = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300" data-testid="wizard-step-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Set your target</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>How much do you need and by when?</p>
      </div>

      {/* Target Amount */}
      <div>
        <label htmlFor="targetAmount" className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          Target Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold" style={{ color: "var(--text-muted)" }}>₹</span>
          <input
            id="targetAmount"
            type="text"
            value={targetAmount}
            onChange={handleAmountChange(setTargetAmount)}
            placeholder="0"
            autoFocus
            className="w-full rounded-xl border pl-10 pr-4 py-3.5 text-lg font-semibold focus:ring-2 focus:ring-[#7C3AED]/20 outline-none"
            style={{ borderColor: "var(--border-light)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
            data-testid="target-amount-input"
          />
        </div>
        {parseFloat(targetAmount) > 0 && (
          <p className="mt-1 text-xs italic" style={{ color: "var(--text-muted)" }} data-testid="target-amount-words">
            {numberToWords(parseFloat(targetAmount))}
          </p>
        )}
        {errors.targetAmount && <p className="text-sm text-red-500 mt-1">{errors.targetAmount}</p>}
      </div>

      {/* Target Date */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          Target Date
        </label>
        <Popover open={targetCalendarOpen} onOpenChange={setTargetCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors"
              style={{ borderColor: "var(--border-light)", backgroundColor: "var(--bg-card)", color: targetDate ? "var(--text-primary)" : "var(--text-muted)" }}
              data-testid="target-date-input"
            >
              <span>{targetDate ? format(new Date(targetDate), "PPP") : "Select target date"}</span>
              <CalendarIcon className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
            <Calendar
              mode="single"
              selected={targetDate ? new Date(targetDate) : undefined}
              onSelect={(date) => {
                if (date) setTargetDate(format(date, "yyyy-MM-dd"));
                setTargetCalendarOpen(false);
              }}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.targetDate && <p className="text-sm text-red-500 mt-1">{errors.targetDate}</p>}
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Priority</label>
        <div className="flex gap-2">
          {[
            { value: 1, label: "High", activeColor: "#EF4444", activeBg: "#FEE2E2" },
            { value: 2, label: "Medium", activeColor: "#F59E0B", activeBg: "#FEF3C7" },
            { value: 3, label: "Low", activeColor: "#6B7280", activeBg: "#F3F4F6" }
          ].map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className="flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all"
              style={{
                borderColor: priority === p.value ? p.activeColor : "var(--border-light)",
                backgroundColor: priority === p.value ? p.activeBg : "var(--bg-card)",
                color: priority === p.value ? p.activeColor : "var(--text-muted)",
              }}
              data-testid={`priority-${p.label.toLowerCase()}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ─── STEP 5: Link Sources + Notes ─── */
  const Step5 = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300" data-testid="wizard-step-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Final details</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Link financial sources and add notes</p>
      </div>

      {/* Link Sources Section */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(124, 58, 237, 0.04)", border: "1px solid rgba(124, 58, 237, 0.15)" }}>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Link2 className="h-4 w-4" style={{ color: "#7C3AED" }} />
          Link Financial Sources
        </h4>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Link investments, accounts, or debts to automatically track progress
        </p>

        {showDebtFields && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Link Loan</label>
              <select value={linkedLoanId} onChange={(e) => setLinkedLoanId(e.target.value)}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                style={{ borderColor: "var(--border-light)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
                data-testid="linked-loan-select"
              >
                <option value="">Select a loan (optional)</option>
                {loans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.loanName} - ₹{loan.outstandingAmount?.toLocaleString('en-IN')} outstanding
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Link Credit Card</label>
              <select value={linkedCreditCardId} onChange={(e) => setLinkedCreditCardId(e.target.value)}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                style={{ borderColor: "var(--border-light)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
                data-testid="linked-card-select"
              >
                <option value="">Select a credit card (optional)</option>
                {creditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.cardName} - ₹{card.outstandingAmount?.toLocaleString('en-IN')} outstanding
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {showInvestmentFields && (
          <div className="space-y-3">
            {investments.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  Link Investments ({linkedInvestments.length} allocated)
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-lg border" style={{ borderColor: "var(--border-light)", backgroundColor: "var(--bg-card)" }}>
                  {investments.map((inv) => {
                    const allocInfo = getInvestmentAllocationInfo(inv.id);
                    const linkedAlloc = getLinkedInvestmentAllocation(inv.id);
                    const isLinked = !!linkedAlloc;
                    const totalValue = inv.currentValue || inv.principal || 0;
                    const allocatedElsewhere = (allocInfo.allocatedAmount || 0) - (linkedAlloc?.allocatedAmount || 0);
                    const hasOtherAllocations = allocInfo.allocations?.filter(a => a.goalId !== id).length > 0;
                    return (
                      <div key={inv.id} onClick={() => handleInvestmentClick(inv)}
                        className="p-2.5 rounded-lg cursor-pointer transition-all border"
                        style={{
                          borderColor: isLinked ? "rgba(124, 58, 237, 0.3)" : "transparent",
                          backgroundColor: isLinked ? "rgba(124, 58, 237, 0.05)" : "transparent",
                        }}
                        data-testid={`investment-item-${inv.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{inv.name}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {inv.investmentCategory} - ₹{(totalValue || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                          {isLinked && linkedAlloc?.allocatedAmount && (
                            <div className="text-right ml-2">
                              <p className="text-sm font-semibold" style={{ color: "#7C3AED" }}>₹{(linkedAlloc.allocatedAmount || 0).toLocaleString('en-IN')}</p>
                              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>allocated</p>
                            </div>
                          )}
                        </div>
                        {hasOtherAllocations && allocatedElsewhere > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: "#D97706" }}>
                            <AlertCircle className="w-3 h-3" />
                            <span>₹{(allocatedElsewhere || 0).toLocaleString('en-IN')} allocated to other goals</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {accounts.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  Link Accounts ({linkedAccounts.length} allocated)
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-lg border" style={{ borderColor: "var(--border-light)", backgroundColor: "var(--bg-card)" }}>
                  {accounts.map((acc) => {
                    const allocInfo = getAccountAllocationInfo(acc.id);
                    const linkedAlloc = getLinkedAccountAllocation(acc.id);
                    const isLinked = !!linkedAlloc;
                    const totalBalance = acc.currentBalance || 0;
                    const allocatedElsewhere = (allocInfo.allocatedAmount || 0) - (linkedAlloc?.allocatedAmount || 0);
                    const hasOtherAllocations = allocInfo.allocations?.filter(a => a.goalId !== id).length > 0;
                    return (
                      <div key={acc.id} onClick={() => handleAccountClick(acc)}
                        className="p-2.5 rounded-lg cursor-pointer transition-all border"
                        style={{
                          borderColor: isLinked ? "rgba(124, 58, 237, 0.3)" : "transparent",
                          backgroundColor: isLinked ? "rgba(124, 58, 237, 0.05)" : "transparent",
                        }}
                        data-testid={`account-item-${acc.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{acc.accountName}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {acc.accountType} - ₹{(totalBalance || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                          {isLinked && linkedAlloc?.allocatedAmount && (
                            <div className="text-right ml-2">
                              <p className="text-sm font-semibold" style={{ color: "#7C3AED" }}>₹{(linkedAlloc.allocatedAmount || 0).toLocaleString('en-IN')}</p>
                              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>allocated</p>
                            </div>
                          )}
                        </div>
                        {hasOtherAllocations && allocatedElsewhere > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: "#D97706" }}>
                            <AlertCircle className="w-3 h-3" />
                            <span>₹{(allocatedElsewhere || 0).toLocaleString('en-IN')} allocated to other goals</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Override */}
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-light)" }}>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Manual Progress Entry</label>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Override auto-calculation</p>
          </div>
          <button type="button" onClick={() => setManualOverride(!manualOverride)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${manualOverride ? "bg-[#7C3AED]" : "bg-gray-200"}`}
            data-testid="manual-override-toggle"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${manualOverride ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        {manualOverride && (
          <div className="mt-3 animate-in fade-in">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-muted)" }}>₹</span>
              <input type="text" value={currentAmount} onChange={handleAmountChange(setCurrentAmount)} placeholder="0"
                className="w-full rounded-xl border pl-10 pr-4 py-3 outline-none"
                style={{ borderColor: "var(--border-light)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
                data-testid="current-amount-input"
              />
            </div>
            {parseFloat(currentAmount) > 0 && <p className="mt-1 text-xs italic" style={{ color: "var(--text-muted)" }}>{numberToWords(parseFloat(currentAmount))}</p>}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          Notes <span style={{ color: "var(--text-muted)" }}>(Optional)</span>
        </label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this goal..."
          rows={3} maxLength={500}
          className="w-full rounded-xl border px-4 py-3 resize-none outline-none"
          style={{ borderColor: "var(--border-light)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
          data-testid="notes-input"
        />
      </div>

      {errors.submit && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{errors.submit}</div>}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1 />;
      case 2: return <Step2 />;
      case 3: return <Step3 />;
      case 4: return <Step4 />;
      case 5: return <Step5 />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-app)" }} data-testid="goal-form-page">
      {/* Header */}
      <header className="flex items-center px-5 pt-8 pb-4 flex-shrink-0">
        <button type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}
          onClick={() => step > 1 ? handlePrev() : navigate(-1)}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "'Manrope', sans-serif" }}>
          {isEditMode ? "Edit Dream" : "Create Dream"}
        </h1>
        {isEditMode && (
          <button type="button" onClick={() => setShowDeleteConfirm(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: "#FEE2E2", color: "#EF4444" }}
            data-testid="delete-button"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        )}
        {!isEditMode && (
          <button type="button" onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-muted)" }}
            data-testid="close-button"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </header>

      {/* Step Indicator */}
      <div className="px-5">
        <StepIndicator />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto w-full max-w-[540px] px-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div style={{ color: "var(--text-muted)" }}>Loading...</div>
            </div>
          ) : renderStep()}
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 border-t px-4 py-3 z-40" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-light)" }}>
        <div className="mx-auto max-w-[540px] flex gap-3">
          {step > 1 && (
            <button type="button" onClick={handlePrev}
              className="flex items-center justify-center gap-1.5 h-12 px-5 rounded-xl border font-medium text-sm transition-all active:scale-[0.98]"
              style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}
              data-testid="prev-step-btn"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-sm"
              style={{ backgroundColor: "#7C3AED" }}
              data-testid="next-step-btn"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={handleSave} disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
              style={{ backgroundColor: "#7C3AED" }}
              data-testid="save-button"
            >
              {isSubmitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Dream" : "Create Dream")}
            </button>
          )}
        </div>
      </div>

      {/* Update Confirmation Dialog */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Confirm Changes</h3>
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>Are you sure you want to update this goal?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)}
                className="flex-1 rounded-xl border-2 px-4 py-3 font-medium"
                style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}
              >Cancel</button>
              <button type="button" onClick={performSave}
                className="flex-1 rounded-xl px-4 py-3 text-white font-medium"
                style={{ backgroundColor: "#7C3AED" }}
              >Yes, Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Dream?</h3>
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>
              Are you sure you want to delete "{goalName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border-2 px-4 py-3 font-medium"
                style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}
              >Cancel</button>
              <button type="button" onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium"
              >Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Allocation Dialog */}
      <Dialog open={allocationDialog.open} onOpenChange={(open) => !open && setAllocationDialog({ open: false, type: null, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Allocate {allocationDialog.type === 'investment' ? 'Investment' : 'Account'}
            </DialogTitle>
          </DialogHeader>
          {allocationDialog.item && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {allocationDialog.type === 'investment' ? allocationDialog.item.name : allocationDialog.item.accountName}
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Total Value: ₹{allocationDialog.totalValue?.toLocaleString('en-IN')}
                </p>
              </div>
              {allocationDialog.allocInfo?.allocations?.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-amber-800 mb-2">Current Allocations:</p>
                  {allocationDialog.allocInfo.allocations.filter(a => a.goalId !== id).map((alloc, idx) => (
                    <p key={idx} className="text-xs text-amber-700">
                      {alloc.goalName}: ₹{alloc.allocatedAmount?.toLocaleString('en-IN')}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>Available to allocate:</span>
                <span className="font-semibold text-emerald-600">₹{allocationDialog.availableAmount?.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Amount to allocate to this goal</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-muted)" }}>₹</span>
                  <input type="text" value={allocationAmount} onChange={(e) => setAllocationAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none"
                    data-testid="allocation-amount-input"
                  />
                </div>
                {allocationAmount && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{numberToWords(parseFloat(allocationAmount) || 0)}</p>}
                {parseFloat(allocationAmount) > allocationDialog.availableAmount && <p className="text-xs text-red-500 mt-1">Amount exceeds available balance</p>}
              </div>
              <div className="flex gap-2">
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct} type="button"
                    onClick={() => setAllocationAmount(Math.round(allocationDialog.availableAmount * pct / 100).toString())}
                    className="flex-1 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                  >{pct}%</button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 mt-4">
            {allocationDialog.existingAllocation > 0 && (
              <Button type="button" variant="destructive" onClick={handleRemoveAllocation}>Remove</Button>
            )}
            <Button type="button" variant="outline" onClick={() => setAllocationDialog({ open: false, type: null, item: null })}>Cancel</Button>
            <Button type="button" onClick={handleSaveAllocation}
              disabled={parseFloat(allocationAmount) > allocationDialog.availableAmount}
              className="bg-[#7C3AED] hover:bg-[#6D28D9]"
            >{allocationDialog.existingAllocation > 0 ? 'Update' : 'Allocate'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalForm;
