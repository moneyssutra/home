import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Info, Link2, Target, AlertCircle } from "lucide-react";
import axios from "axios";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const GoalForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
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
  
  // Linked sources - Legacy (for backward compatibility)
  const [linkedInvestmentIds, setLinkedInvestmentIds] = useState([]);
  const [linkedLoanId, setLinkedLoanId] = useState("");
  const [linkedCreditCardId, setLinkedCreditCardId] = useState("");
  const [linkedAccountIds, setLinkedAccountIds] = useState([]);
  
  // New allocation-based linking
  const [linkedInvestments, setLinkedInvestments] = useState([]); // [{id, allocatedAmount, name}]
  const [linkedAccounts, setLinkedAccounts] = useState([]); // [{id, allocatedAmount, name}]
  const [allocationStatus, setAllocationStatus] = useState({ investments: [], accounts: [] });
  
  // Allocation dialog state
  const [allocationDialog, setAllocationDialog] = useState({ open: false, type: null, item: null });
  const [allocationAmount, setAllocationAmount] = useState("");
  
  // Available sources for linking
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
    { value: "Wealth Creation", label: "Wealth Creation", description: "Save for a big purchase or milestone" },
    { value: "Debt Elimination", label: "Debt Elimination", description: "Pay off loans or credit cards" },
    { value: "Investment Target", label: "Investment Target", description: "Reach a specific investment value" },
    { value: "Emergency Fund", label: "Emergency Fund", description: "Build a safety net for emergencies" },
    { value: "Other", label: "Other", description: "Custom goal with your own name" }
  ];

  useEffect(() => {
    fetchSources();
    fetchAllocationStatus();
    if (id) {
      fetchGoalData();
    }
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
      setLinkedInvestmentIds(data.linkedInvestmentIds || []);
      setLinkedLoanId(data.linkedLoanId || "");
      setLinkedCreditCardId(data.linkedCreditCardId || "");
      setLinkedAccountIds(data.linkedAccountIds || []);
      setLinkedInvestments(data.linkedInvestments || []);
      setLinkedAccounts(data.linkedAccounts || []);
    } catch (error) {
      console.error("Error fetching goal data:", error);
      setErrors({ submit: "Failed to load goal data" });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (setter) => (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setter(value);
  };

  // Get allocation info for an investment
  const getInvestmentAllocationInfo = (invId) => {
    const invStatus = allocationStatus.investments?.find(i => i.id === invId);
    if (!invStatus) return { totalValue: 0, allocatedAmount: 0, remainingAmount: 0, allocations: [] };
    return invStatus;
  };

  // Get allocation info for an account
  const getAccountAllocationInfo = (accId) => {
    const accStatus = allocationStatus.accounts?.find(a => a.id === accId);
    if (!accStatus) return { totalBalance: 0, allocatedAmount: 0, remainingAmount: 0, allocations: [] };
    return accStatus;
  };

  // Check if investment is already linked to this goal
  const getLinkedInvestmentAllocation = (invId) => {
    return linkedInvestments.find(li => li.id === invId);
  };

  // Check if account is already linked to this goal
  const getLinkedAccountAllocation = (accId) => {
    return linkedAccounts.find(la => la.id === accId);
  };

  // Open allocation dialog for investment
  const handleInvestmentClick = (inv) => {
    const existingAllocation = getLinkedInvestmentAllocation(inv.id);
    const allocInfo = getInvestmentAllocationInfo(inv.id);
    
    // Calculate available amount (remaining + what's already allocated to this goal)
    const currentAllocationToThisGoal = existingAllocation?.allocatedAmount || 0;
    const availableAmount = allocInfo.remainingAmount + currentAllocationToThisGoal;
    
    setAllocationDialog({
      open: true,
      type: 'investment',
      item: inv,
      totalValue: inv.currentValue || inv.principal || 0,
      availableAmount,
      existingAllocation: currentAllocationToThisGoal,
      allocInfo
    });
    setAllocationAmount(currentAllocationToThisGoal > 0 ? currentAllocationToThisGoal.toString() : "");
  };

  // Open allocation dialog for account
  const handleAccountClick = (acc) => {
    const existingAllocation = getLinkedAccountAllocation(acc.id);
    const allocInfo = getAccountAllocationInfo(acc.id);
    
    const currentAllocationToThisGoal = existingAllocation?.allocatedAmount || 0;
    const availableAmount = allocInfo.remainingAmount + currentAllocationToThisGoal;
    
    setAllocationDialog({
      open: true,
      type: 'account',
      item: acc,
      totalValue: acc.currentBalance || 0,
      availableAmount,
      existingAllocation: currentAllocationToThisGoal,
      allocInfo
    });
    setAllocationAmount(currentAllocationToThisGoal > 0 ? currentAllocationToThisGoal.toString() : "");
  };

  // Save allocation from dialog
  const handleSaveAllocation = () => {
    const amount = parseFloat(allocationAmount) || 0;
    
    if (allocationDialog.type === 'investment') {
      const inv = allocationDialog.item;
      if (amount > 0) {
        // Add or update allocation
        setLinkedInvestments(prev => {
          const existing = prev.find(li => li.id === inv.id);
          if (existing) {
            return prev.map(li => li.id === inv.id ? { ...li, allocatedAmount: amount } : li);
          }
          return [...prev, { id: inv.id, allocatedAmount: amount, name: inv.name }];
        });
        // Remove from legacy list if present
        setLinkedInvestmentIds(prev => prev.filter(invId => invId !== inv.id));
      } else {
        // Remove allocation
        setLinkedInvestments(prev => prev.filter(li => li.id !== inv.id));
      }
    } else if (allocationDialog.type === 'account') {
      const acc = allocationDialog.item;
      if (amount > 0) {
        setLinkedAccounts(prev => {
          const existing = prev.find(la => la.id === acc.id);
          if (existing) {
            return prev.map(la => la.id === acc.id ? { ...la, allocatedAmount: amount } : la);
          }
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

  // Remove allocation
  const handleRemoveAllocation = () => {
    if (allocationDialog.type === 'investment') {
      setLinkedInvestments(prev => prev.filter(li => li.id !== allocationDialog.item.id));
    } else if (allocationDialog.type === 'account') {
      setLinkedAccounts(prev => prev.filter(la => la.id !== allocationDialog.item.id));
    }
    setAllocationDialog({ open: false, type: null, item: null });
    setAllocationAmount("");
  };

  const toggleInvestment = (invId) => {
    setLinkedInvestmentIds(prev => 
      prev.includes(invId) 
        ? prev.filter(id => id !== invId)
        : [...prev, invId]
    );
  };

  const toggleAccount = (accId) => {
    setLinkedAccountIds(prev => 
      prev.includes(accId) 
        ? prev.filter(id => id !== accId)
        : [...prev, accId]
    );
  };

  const validate = () => {
    const newErrors = {};

    if (!goalName.trim()) {
      newErrors.goalName = "Goal name is required";
    }

    if (!goalType) {
      newErrors.goalType = "Please select a goal type";
    }

    if (goalType === "Other" && !customTypeName.trim()) {
      newErrors.customTypeName = "Please enter a custom type name";
    }

    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      newErrors.targetAmount = "Target amount is required";
    }

    if (!targetDate) {
      newErrors.targetDate = "Target date is required";
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
        goalName,
        goalType,
        customTypeName: goalType === "Other" ? customTypeName : null,
        targetAmount: parseFloat(targetAmount),
        currentAmount: manualOverride ? parseFloat(currentAmount || 0) : 0,
        targetDate,
        linkedInvestmentIds,
        linkedInvestments,
        linkedLoanId: linkedLoanId || null,
        linkedCreditCardId: linkedCreditCardId || null,
        linkedAccountIds,
        linkedAccounts,
        autoCalculate,
        manualOverride,
        priority,
        notes: notes || null
      };

      if (id) {
        await axios.put(`${backendUrl}/api/goals/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/goals`, payload);
      }
      
      navigate("/my-goals");
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
      navigate("/my-goals");
    } catch (error) {
      console.error("Error deleting goal:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDebtFields = goalType === "Debt Elimination";
  const showInvestmentFields = ["Wealth Creation", "Investment Target", "Emergency Fund", "Other"].includes(goalType);

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="goal-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A]"
          onClick={() => navigate("/my-goals")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[28px] font-semibold tracking-tight text-[#334155]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Goal" : "Create Goal"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Goal Type Selection */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[#334155] mb-3">
                Goal Type
              </label>
              <div className="grid grid-cols-1 gap-2">
                {goalTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGoalType(option.value)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      goalType === option.value
                        ? "border-[#7C3AED] bg-[#7C3AED]/5"
                        : "border-gray-200 bg-[#1E293B] hover:border-[#7C3AED]/50"
                    }`}
                    data-testid={`goal-type-${option.value.toLowerCase().replace(" ", "-")}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      goalType === option.value ? "bg-[#7C3AED] text-white" : "bg-[#1E293B] text-slate-400"
                    }`}>
                      <Target className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${goalType === option.value ? "text-[#7C3AED]" : "text-[#334155]"}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-[#334155]/50">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              {errors.goalType && <p className="text-sm text-red-500 mt-2">{errors.goalType}</p>}
            </div>

            {/* Custom Type Name (for Other) */}
            {goalType === "Other" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2">
                <label htmlFor="customTypeName" className="block text-sm font-medium text-[#334155] mb-2">
                  Custom Goal Type Name
                </label>
                <input
                  id="customTypeName"
                  type="text"
                  value={customTypeName}
                  onChange={(e) => setCustomTypeName(e.target.value)}
                  placeholder="e.g., Vacation, Wedding, Car"
                  maxLength={50}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                  data-testid="custom-type-name-input"
                />
                {errors.customTypeName && <p className="text-sm text-red-500 mt-1">{errors.customTypeName}</p>}
              </div>
            )}

            {/* Goal Name */}
            <div className="w-full">
              <label htmlFor="goalName" className="block text-sm font-medium text-[#334155] mb-2">
                Goal Name
              </label>
              <input
                id="goalName"
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g., House Down Payment, Pay off Car Loan"
                maxLength={100}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                data-testid="goal-name-input"
              />
              {errors.goalName && <p className="text-sm text-red-500 mt-1">{errors.goalName}</p>}
            </div>

            {/* Target Amount */}
            <div className="w-full">
              <label htmlFor="targetAmount" className="block text-sm font-medium text-[#334155] mb-2">
                Target Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="targetAmount"
                  type="text"
                  value={targetAmount}
                  onChange={handleAmountChange(setTargetAmount)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                  data-testid="target-amount-input"
                />
              </div>
              {parseFloat(targetAmount) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="target-amount-words">
                  {numberToWords(parseFloat(targetAmount))}
                </p>
              )}
              {errors.targetAmount && <p className="text-sm text-red-500 mt-1">{errors.targetAmount}</p>}
            </div>

            {/* Target Date */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Target Date
              </label>
              <Popover open={targetCalendarOpen} onOpenChange={setTargetCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="date-picker-trigger"
                    data-testid="target-date-input"
                  >
                    <span className={targetDate ? "value" : "placeholder"}>
                      {targetDate ? format(new Date(targetDate), "PPP") : "Select target date"}
                    </span>
                    <CalendarIcon className="h-5 w-5 icon" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate ? new Date(targetDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setTargetDate(format(date, "yyyy-MM-dd"));
                      }
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
            <div className="w-full">
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Priority
              </label>
              <div className="flex gap-2">
                {[
                  { value: 1, label: "High", color: "border-red-500 bg-red-50 text-red-700" },
                  { value: 2, label: "Medium", color: "border-amber-500 bg-amber-50 text-amber-700" },
                  { value: 3, label: "Low", color: "border-gray-400 bg-[#1E293B] text-slate-300" }
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`flex-1 py-2.5 rounded-xl border-2 font-medium transition-all ${
                      priority === p.value ? p.color : "border-gray-200 bg-[#1E293B] text-[#334155]/50"
                    }`}
                    data-testid={`priority-${p.label.toLowerCase()}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Link Sources Section */}
            <div className="w-full p-4 rounded-xl bg-[#F0F4FF] border border-[#7C3AED]/20">
              <h4 className="text-sm font-semibold text-[#334155] mb-3 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-[#7C3AED]" />
                Link Financial Sources
              </h4>
              <p className="text-xs text-[#334155]/60 mb-4">
                Link investments, accounts, or debts to automatically track progress
              </p>

              {/* Debt Fields */}
              {showDebtFields && (
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#334155] mb-2">Link Loan</label>
                    <select
                      value={linkedLoanId}
                      onChange={(e) => setLinkedLoanId(e.target.value)}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#7C3AED] focus:outline-none"
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
                    <label className="block text-sm font-medium text-[#334155] mb-2">Link Credit Card</label>
                    <select
                      value={linkedCreditCardId}
                      onChange={(e) => setLinkedCreditCardId(e.target.value)}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#7C3AED] focus:outline-none"
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

              {/* Investment/Account Fields */}
              {showInvestmentFields && (
                <div className="space-y-4">
                  {/* Investments with Allocation */}
                  {investments.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-[#334155] mb-2">
                        Link Investments ({linkedInvestments.length} allocated)
                      </label>
                      <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-[#1E293B] rounded-lg border border-gray-200">
                        {investments.map((inv) => {
                          const allocInfo = getInvestmentAllocationInfo(inv.id);
                          const linkedAlloc = getLinkedInvestmentAllocation(inv.id);
                          const isLinked = !!linkedAlloc;
                          const totalValue = inv.currentValue || inv.principal || 0;
                          const allocatedElsewhere = (allocInfo.allocatedAmount || 0) - (linkedAlloc?.allocatedAmount || 0);
                          const hasOtherAllocations = allocInfo.allocations?.filter(a => a.goalId !== id).length > 0;
                          
                          return (
                            <div
                              key={inv.id}
                              onClick={() => handleInvestmentClick(inv)}
                              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                isLinked 
                                  ? "bg-[#7C3AED]/10 border-[#7C3AED]/30" 
                                  : "hover:bg-[#1E293B] border-transparent"
                              }`}
                              data-testid={`investment-item-${inv.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#334155] truncate">{inv.name}</p>
                                  <p className="text-xs text-[#334155]/50">
                                    {inv.investmentCategory} • Total: ₹{(totalValue || 0).toLocaleString('en-IN')}
                                  </p>
                                </div>
                                {isLinked && linkedAlloc?.allocatedAmount && (
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-[#7C3AED]">
                                      ₹{(linkedAlloc.allocatedAmount || 0).toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-[10px] text-[#334155]/50">allocated</p>
                                  </div>
                                )}
                              </div>
                              {hasOtherAllocations && allocatedElsewhere > 0 && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
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

                  {/* Accounts with Allocation */}
                  {accounts.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-[#334155] mb-2">
                        Link Accounts ({linkedAccounts.length} allocated)
                      </label>
                      <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-[#1E293B] rounded-lg border border-gray-200">
                        {accounts.map((acc) => {
                          const allocInfo = getAccountAllocationInfo(acc.id);
                          const linkedAlloc = getLinkedAccountAllocation(acc.id);
                          const isLinked = !!linkedAlloc;
                          const totalBalance = acc.currentBalance || 0;
                          const allocatedElsewhere = allocInfo.allocatedAmount - (linkedAlloc?.allocatedAmount || 0);
                          const hasOtherAllocations = allocInfo.allocations?.filter(a => a.goalId !== id).length > 0;
                          
                          return (
                            <div
                              key={acc.id}
                              onClick={() => handleAccountClick(acc)}
                              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                isLinked 
                                  ? "bg-[#7C3AED]/10 border-[#7C3AED]/30" 
                                  : "hover:bg-[#1E293B] border-transparent"
                              }`}
                              data-testid={`account-item-${acc.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#334155] truncate">{acc.accountName}</p>
                                  <p className="text-xs text-[#334155]/50">
                                    {acc.accountType} • Total: ₹{totalBalance.toLocaleString('en-IN')}
                                  </p>
                                </div>
                                {isLinked && (
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-[#7C3AED]">
                                      ₹{linkedAlloc.allocatedAmount.toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-[10px] text-[#334155]/50">allocated</p>
                                  </div>
                                )}
                              </div>
                              {hasOtherAllocations && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>₹{allocatedElsewhere.toLocaleString('en-IN')} allocated to other goals</span>
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

            {/* Manual Override Toggle */}
            <div className="w-full rounded-xl border border-[#334155] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#334155]">
                    Manual Progress Entry
                  </label>
                  <p className="text-xs text-[#334155]/60 mt-0.5">
                    Override auto-calculation and enter progress manually
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManualOverride(!manualOverride)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    manualOverride ? "bg-[#7C3AED]" : "bg-gray-200"
                  }`}
                  data-testid="manual-override-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[#1E293B] transition-transform ${
                      manualOverride ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              
              {manualOverride && (
                <div className="mt-4 animate-in fade-in">
                  <label htmlFor="currentAmount" className="block text-sm font-medium text-[#334155] mb-2">
                    Current Progress Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                    <input
                      id="currentAmount"
                      type="text"
                      value={currentAmount}
                      onChange={handleAmountChange(setCurrentAmount)}
                      placeholder="0"
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#7C3AED] focus:outline-none"
                      data-testid="current-amount-input"
                    />
                  </div>
                  {parseFloat(currentAmount) > 0 && (
                    <p className="mt-1.5 text-xs text-[#334155]/50 italic">
                      {numberToWords(parseFloat(currentAmount))}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="w-full">
              <label htmlFor="notes" className="block text-sm font-medium text-[#334155] mb-2">
                Notes <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this goal..."
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#7C3AED] focus:outline-none resize-none"
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
                className="flex-1 rounded-xl bg-[#7C3AED] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#6D28D9] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
                data-testid="update-button"
              >
                {isSubmitting ? "Updating..." : "Update Goal"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#7C3AED] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#6D28D9] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
              data-testid="save-button"
            >
              {isSubmitting ? "Creating..." : "Create Goal"}
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
              Are you sure you want to update this goal?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">
                Cancel
              </button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#7C3AED] px-4 py-3 text-white font-medium">
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Goal?</h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to delete "{goalName}"? This action cannot be undone.
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
              {/* Item Details */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-[#334155]">
                  {allocationDialog.type === 'investment' 
                    ? allocationDialog.item.name 
                    : allocationDialog.item.accountName}
                </p>
                <p className="text-sm text-[#334155]/60">
                  Total Value: ₹{allocationDialog.totalValue?.toLocaleString('en-IN')}
                </p>
              </div>
              
              {/* Allocation Status */}
              {allocationDialog.allocInfo?.allocations?.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-amber-800 mb-2">Current Allocations:</p>
                  {allocationDialog.allocInfo.allocations
                    .filter(a => a.goalId !== id)
                    .map((alloc, idx) => (
                      <p key={idx} className="text-xs text-amber-700">
                        • {alloc.goalName}: ₹{alloc.allocatedAmount?.toLocaleString('en-IN')}
                      </p>
                    ))}
                </div>
              )}
              
              {/* Available Amount */}
              <div className="flex justify-between text-sm">
                <span className="text-[#334155]/60">Available to allocate:</span>
                <span className="font-semibold text-emerald-600">
                  ₹{allocationDialog.availableAmount?.toLocaleString('en-IN')}
                </span>
              </div>
              
              {/* Allocation Input */}
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Amount to allocate to this goal
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                  <input
                    type="text"
                    value={allocationAmount}
                    onChange={(e) => setAllocationAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none"
                    data-testid="allocation-amount-input"
                  />
                </div>
                {allocationAmount && (
                  <p className="text-xs text-[#334155]/60 mt-1">
                    {numberToWords(parseFloat(allocationAmount) || 0)}
                  </p>
                )}
                {parseFloat(allocationAmount) > allocationDialog.availableAmount && (
                  <p className="text-xs text-red-500 mt-1">
                    Amount exceeds available balance
                  </p>
                )}
              </div>
              
              {/* Quick Allocation Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllocationAmount(Math.round(allocationDialog.availableAmount * 0.25).toString())}
                  className="flex-1 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationAmount(Math.round(allocationDialog.availableAmount * 0.5).toString())}
                  className="flex-1 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationAmount(Math.round(allocationDialog.availableAmount * 0.75).toString())}
                  className="flex-1 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationAmount(allocationDialog.availableAmount.toString())}
                  className="flex-1 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  100%
                </button>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2 mt-4">
            {allocationDialog.existingAllocation > 0 && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemoveAllocation}
              >
                Remove
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setAllocationDialog({ open: false, type: null, item: null })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAllocation}
              disabled={parseFloat(allocationAmount) > allocationDialog.availableAmount}
              className="bg-[#7C3AED] hover:bg-[#6D28D9]"
            >
              {allocationDialog.existingAllocation > 0 ? 'Update' : 'Allocate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default GoalForm;
