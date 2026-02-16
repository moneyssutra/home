import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, Trash2, AlertCircle, CalendarDays, ChevronDown, Gift, Award, TrendingUp, Wallet, RefreshCw, Banknote, Sparkles, ArrowLeftRight, ReceiptText, CheckCircle } from "lucide-react";
import axios from "axios";
import BackButton from "@/components/BackButton";
import AmountInput from "@/components/AmountInput";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const OtherIncomeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const conditionalRef = useRef(null);
  const [showAddSheet, setShowAddSheet] = useState(false);

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
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  useEffect(() => {
    if (isEdit) {
      fetchIncome();
    }
  }, [id]);

  useEffect(() => {
    if (conditionalRef.current && formData.frequency) {
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
        notes: data.notes || "",
        isReceived: data.isReceived || false,
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
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.incomeName.trim()) {
      setError("Please enter income name");
      return;
    }
    if (!formData.category) {
      setError("Please select a category");
      return;
    }
    if (formData.category === "Other" && !formData.customCategory.trim()) {
      setError("Please enter custom category name");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
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
        notes: formData.notes.trim() || null,
        isReceived: formData.isReceived,
      };

      if (isEdit) {
        await axios.put(`${backendUrl}/api/other-income/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/other-income`, payload);
      }
      navigate("/my-income");
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
      navigate("/my-income");
    } catch (error) {
      console.error("Error deleting income:", error);
      setError("Failed to delete. Please try again.");
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

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

  return (
    <div className="min-h-screen honeycomb-bg pb-32" data-testid="other-income-form">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#6D28D9] px-6 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <BackButton fallbackPath="/my-income" className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            {isEdit ? "Edit Entry" : "Add Other Income"}
          </h1>
        </div>
        <p className="text-white/60 text-sm ml-11">
          Track non-recurring income like gifts, bonuses, and refunds
        </p>
      </header>

      {/* Form */}
      <div className="px-6 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm" data-testid="error-message">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Income Name */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-2">
              Income Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.incomeName}
              onChange={(e) => handleChange("incomeName", e.target.value)}
              placeholder="e.g., Birthday Gift, Annual Bonus"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none transition-all"
              data-testid="income-name-input"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = formData.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleChange("category", cat.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                      isSelected ? cat.color + " border-current" : "bg-[#1E293B] border-transparent hover:border-gray-200"
                    )}
                    data-testid={`category-${cat.value.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium text-center leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Category Input (when "Other" selected) */}
          {formData.category === "Other" && (
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Custom Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customCategory}
                onChange={(e) => handleChange("customCategory", e.target.value)}
                placeholder="Enter custom category"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none transition-all"
                data-testid="custom-category-input"
              />
            </div>
          )}

          {/* Amount */}
          <AmountInput
            label="Amount"
            value={formData.amount}
            onChange={(value) => handleChange("amount", value)}
            required
            testId="amount-input"
          />

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-2">
              Frequency <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.frequency}
                onChange={(e) => handleChange("frequency", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none transition-all appearance-none bg-[#1E293B]"
                data-testid="frequency-select"
              >
                {frequencies.map((freq) => (
                  <option key={freq} value={freq}>{freq}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Conditional Fields Based on Frequency */}
          <div ref={conditionalRef}>
            {/* One-Time / Irregular: Date Picker */}
            {(formData.frequency === "One-Time" || formData.frequency === "Irregular") && (
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Date Received
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12 rounded-xl border-gray-200",
                        !formData.dateReceived && "text-muted-foreground"
                      )}
                      data-testid="date-received-picker"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {formData.dateReceived ? format(formData.dateReceived, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dateReceived}
                      onSelect={(date) => handleChange("dateReceived", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Monthly: Day of Month */}
            {formData.frequency === "Monthly" && (
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Day of Month
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12 rounded-xl border-gray-200",
                        !formData.selectedDate && "text-muted-foreground"
                      )}
                      data-testid="monthly-date-picker"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {formData.selectedDate ? `${formData.selectedDate}${getOrdinal(formData.selectedDate)} of every month` : "Select day"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.selectedDate ? new Date(2024, 0, parseInt(formData.selectedDate)) : undefined}
                      onSelect={(date) => date && handleChange("selectedDate", String(date.getDate()))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Quarterly: Quarter + Day */}
            {formData.frequency === "Quarterly" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Quarter
                  </label>
                  <div className="relative">
                    <select
                      value={formData.selectedQuarter}
                      onChange={(e) => handleChange("selectedQuarter", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none transition-all appearance-none bg-[#1E293B]"
                      data-testid="quarter-select"
                    >
                      <option value="">Select quarter</option>
                      {quarters.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Day of Quarter Start Month
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-12 rounded-xl border-gray-200",
                          !formData.selectedDate && "text-muted-foreground"
                        )}
                        data-testid="quarterly-date-picker"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {formData.selectedDate ? `${formData.selectedDate}${getOrdinal(formData.selectedDate)}` : "Select day"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.selectedDate ? new Date(2024, 0, parseInt(formData.selectedDate)) : undefined}
                        onSelect={(date) => date && handleChange("selectedDate", String(date.getDate()))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Yearly: Month + Day */}
            {formData.frequency === "Yearly" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Month
                  </label>
                  <div className="relative">
                    <select
                      value={formData.selectedMonth}
                      onChange={(e) => handleChange("selectedMonth", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none transition-all appearance-none bg-[#1E293B]"
                      data-testid="month-select"
                    >
                      <option value="">Select month</option>
                      {months.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Day of Month
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-12 rounded-xl border-gray-200",
                          !formData.selectedDate && "text-muted-foreground"
                        )}
                        data-testid="yearly-date-picker"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {formData.selectedDate ? `${formData.selectedDate}${getOrdinal(formData.selectedDate)}` : "Select day"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.selectedDate ? new Date(2024, 0, parseInt(formData.selectedDate)) : undefined}
                        onSelect={(date) => date && handleChange("selectedDate", String(date.getDate()))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          {/* Is Received Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#1E293B]">
            <div className="flex items-center gap-3">
              <CheckCircle className={cn("h-5 w-5", formData.isReceived ? "text-emerald-500" : "text-gray-400")} />
              <div>
                <p className="font-medium text-[#334155]">Already Received?</p>
                <p className="text-xs text-[#334155]/50">Mark if you've already received this income</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleChange("isReceived", !formData.isReceived)}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                formData.isReceived ? "bg-emerald-500" : "bg-gray-300"
              )}
              data-testid="is-received-toggle"
            >
              <span
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-[#1E293B] shadow transition-transform",
                  formData.isReceived ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add any additional details..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none transition-all resize-none"
              data-testid="notes-input"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {isEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                data-testid="delete-btn"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#7C3AED] text-white font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
              data-testid="save-btn"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {isEdit ? "Update" : "Save"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" data-testid="delete-modal">
          <div className="bg-[#1E293B] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[#334155] mb-2">Delete Entry?</h3>
            <p className="text-[#334155]/60 text-sm mb-6">
              This will permanently delete this income entry. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[#334155] font-medium hover:bg-[#1E293B] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                data-testid="confirm-delete-btn"
              >
                {saving ? "Deleting..." : "Delete"}
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

export default OtherIncomeForm;
