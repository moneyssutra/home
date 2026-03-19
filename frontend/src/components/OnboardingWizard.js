import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, ArrowRight, Check, X, Plus, Trash2, SkipForward,
  Wallet, Receipt, Building2, CreditCard, TrendingUp, Landmark,
  Shield, ChevronRight, Loader2
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const STEPS = [
  { id: 1, name: "Income", icon: Wallet, color: "#10B981", fields: [
    { name: "Salary", type: "Salary", category: "salary" },
    { name: "Business Income", type: "Business", category: "business" },
    { name: "Freelance / Side Income", type: "Freelance", category: "other" },
    { name: "Rental Income", type: "Rental", category: "rental" },
  ]},
  { id: 2, name: "Expenses", icon: Receipt, color: "#EF4444", fields: [
    { name: "Rent / Housing", category: "Housing" },
    { name: "Food & Groceries", category: "Food" },
    { name: "Transport / Fuel", category: "Transport" },
    { name: "Utilities (Electric, Water, Gas)", category: "Utilities" },
    { name: "Phone / Internet", category: "Utilities" },
    { name: "Other Expenses", category: "Other" },
  ]},
  { id: 3, name: "Assets", icon: Building2, color: "#3B82F6", fields: [
    { name: "Savings Account", assetType: "bank_balance", subType: "Savings" },
    { name: "Current / Checking Account", assetType: "bank_balance", subType: "Current" },
    { name: "Fixed Deposit", assetType: "fixed_deposit" },
    { name: "Gold / Jewellery", assetType: "gold" },
    { name: "Property Value", assetType: "property" },
  ]},
  { id: 4, name: "Liabilities", icon: CreditCard, color: "#F59E0B", fields: [
    { name: "Home Loan", loanType: "Home", liabilityType: "loan" },
    { name: "Personal Loan", loanType: "Personal", liabilityType: "loan" },
    { name: "Car Loan", loanType: "Vehicle", liabilityType: "loan" },
    { name: "Education Loan", loanType: "Education", liabilityType: "loan" },
    { name: "Credit Card Outstanding", liabilityType: "credit_card" },
  ]},
  { id: 5, name: "Investments", icon: TrendingUp, color: "#8B5CF6", fields: [
    { name: "SIP / Mutual Funds", investmentType: "mutual-fund", category: "Mutual Fund" },
    { name: "Stocks", investmentType: "stocks", category: "Stocks" },
    { name: "PPF / NPS", investmentType: "ppf", category: "PPF" },
    { name: "Loan Given", investmentType: "loan-given", category: "Loan Given" },
  ]},
];

function StepForm({ step, items, setItems }) {
  const addItem = () => {
    setItems([...items, { name: "", amount: "", ...step.fields[0] }]);
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const selectPreset = (preset) => {
    const exists = items.find(i => i.name === preset.name);
    if (!exists) {
      setItems([...items, { ...preset, amount: "" }]);
    }
  };

  const activePresets = step.fields.filter(f => !items.find(i => i.name === f.name));

  return (
    <div className="space-y-4" data-testid={`onboarding-step-${step.id}`}>
      {/* Quick-add presets */}
      {activePresets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activePresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => selectPreset(preset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
              style={{ backgroundColor: `${step.color}15`, color: step.color, border: `1px solid ${step.color}30` }}
              data-testid={`preset-${preset.name.replace(/\s/g, '-').toLowerCase()}`}
            >
              <Plus className="h-3 w-3" /> {preset.name}
            </button>
          ))}
        </div>
      )}

      {/* Item list */}
      {items.length === 0 ? (
        <div className="text-center py-8">
          <step.icon className="h-10 w-10 mx-auto mb-2" style={{ color: step.color, opacity: 0.3 }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Tap a category above to add, or use the button below
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-xl p-3 flex gap-3 items-start" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div className="flex-1 space-y-2">
                <input
                  value={item.name}
                  onChange={(e) => updateItem(idx, "name", e.target.value)}
                  placeholder="Name"
                  className="w-full bg-transparent text-sm font-medium outline-none"
                  style={{ color: "var(--text-primary)" }}
                  data-testid={`item-name-${idx}`}
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>₹</span>
                  <input
                    value={item.amount}
                    onChange={(e) => updateItem(idx, "amount", e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder={step.id === 4 ? "Outstanding amount" : "Monthly amount (approx)"}
                    type="text"
                    inputMode="numeric"
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: "var(--text-primary)" }}
                    data-testid={`item-amount-${idx}`}
                  />
                </div>
                {step.id === 4 && item.liabilityType === "loan" && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>EMI: ₹</span>
                    <input
                      value={item.emi || ""}
                      onChange={(e) => updateItem(idx, "emi", e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="Monthly EMI"
                      type="text"
                      inputMode="numeric"
                      className="w-full bg-transparent text-xs outline-none"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>
                )}
              </div>
              <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addItem}
        className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        style={{ border: `1px dashed ${step.color}40`, color: step.color }}
        data-testid="add-custom-item"
      >
        <Plus className="h-4 w-4" /> Add Custom Item
      </button>
    </div>
  );
}

function ReviewStep({ allData, steps }) {
  return (
    <div className="space-y-4" data-testid="onboarding-review">
      {steps.map((step) => {
        const items = allData[step.id] || [];
        const total = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
        if (items.length === 0) return null;
        return (
          <div key={step.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: `${step.color}10` }}>
              <div className="flex items-center gap-2">
                <step.icon className="h-4 w-4" style={{ color: step.color }} />
                <span className="text-sm font-bold" style={{ color: step.color }}>{step.name}</span>
              </div>
              <span className="text-sm font-bold" style={{ color: step.color }}>
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between px-4 py-2 text-xs">
                  <span style={{ color: "var(--text-primary)" }}>{item.name}</span>
                  <span style={{ color: "var(--text-secondary)" }}>₹{parseFloat(item.amount || 0).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OnboardingWizard({ onComplete, onDismiss, isModal = false }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0); // 0 = entry, 1-5 = steps, 6 = review
  const [stepData, setStepData] = useState({ 1: [], 2: [], 3: [], 4: [], 5: [] });
  const [saving, setSaving] = useState(false);
  const [resumeLoaded, setResumeLoaded] = useState(false);

  // Load saved progress
  useEffect(() => {
    if (!resumeLoaded) {
      axios.get(`${API}/api/onboarding/progress`, { withCredentials: true })
        .then(res => {
          if (res.data?.currentStep && !res.data?.completed) {
            setCurrentStep(res.data.currentStep + 1); // Resume from next step
          }
        })
        .catch(() => {})
        .finally(() => setResumeLoaded(true));
    }
  }, [resumeLoaded]);

  const handleStartManual = async () => {
    try {
      await axios.post(`${API}/api/onboarding/save-step`, { step: 0, data: {}, skipped: false }, { withCredentials: true });
    } catch {}
    setCurrentStep(1);
  };

  const handleNext = async () => {
    if (currentStep >= 1 && currentStep <= 5) {
      setSaving(true);
      const items = stepData[currentStep] || [];
      const validItems = items.filter(i => i.name && i.amount);
      try {
        await axios.post(`${API}/api/onboarding/save-step`, {
          step: currentStep,
          data: { items: validItems },
          skipped: validItems.length === 0,
        }, { withCredentials: true });
      } catch {}
      setSaving(false);
    }
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/onboarding/save-step`, {
        step: currentStep, data: {}, skipped: true,
      }, { withCredentials: true });
    } catch {}
    setSaving(false);
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/onboarding/complete`, {}, { withCredentials: true });
    } catch {}
    setSaving(false);
    if (onComplete) onComplete();
    else navigate("/home");
  };

  const handleDismiss = async () => {
    try {
      await axios.post(`${API}/api/onboarding/dismiss`, {}, { withCredentials: true });
    } catch {}
    if (onDismiss) onDismiss();
  };

  const step = STEPS[currentStep - 1];
  const progress = currentStep > 0 ? Math.min((currentStep / 6) * 100, 100) : 0;

  // Entry screen
  if (currentStep === 0) {
    return (
      <div className="flex flex-col px-5 pt-12 pb-6" data-testid="onboarding-entry">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Setup Your Financial Profile</h2>
          {!isModal && <button onClick={handleDismiss} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }} data-testid="onboarding-dismiss-btn"><X className="h-5 w-5" /></button>}
        </div>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Get accurate insights by completing your financial data
        </p>

        {/* Option A: Finvu */}
        <button
          className="w-full p-4 rounded-2xl mb-4 text-left transition-all active:scale-[0.98] opacity-60"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)" }}
          disabled
          data-testid="finvu-connect-btn"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Landmark className="h-6 w-6 text-white" />
              <div>
                <p className="text-white font-bold text-sm">Connect Bank Account</p>
                <p className="text-white/70 text-xs">Securely fetch via Account Aggregator</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-white/20 text-white font-medium">Coming Soon</span>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <Shield className="h-3 w-3 text-white/60" />
            <span className="text-[10px] text-white/60">Your data is secure and shared only with your consent</span>
          </div>
        </button>

        {/* Option B: Manual */}
        <button
          onClick={handleStartManual}
          className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
          data-testid="manual-onboarding-btn"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Add Manually</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Enter your data step-by-step</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
          </div>
        </button>
      </div>
    );
  }

  // Review screen
  if (currentStep === 6) {
    const hasData = Object.values(stepData).some(arr => arr.some(i => i.name && i.amount));
    return (
      <div className="px-5 py-6" data-testid="onboarding-review-screen">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setCurrentStep(5)} className="p-2 rounded-xl" style={{ backgroundColor: "var(--bg-card)" }}><ArrowLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} /></button>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Review & Confirm</h2>
        </div>
        {hasData ? (
          <ReviewStep allData={stepData} steps={STEPS} />
        ) : (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No data entered. You can always add data later from the main app.</p>
          </div>
        )}
        <button
          onClick={handleComplete}
          disabled={saving}
          className="w-full mt-6 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}
          data-testid="confirm-onboarding-btn"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {hasData ? "Confirm & Save" : "Complete Setup"}
        </button>
      </div>
    );
  }

  // Step screens (1-5)
  return (
    <div className="px-5 py-6" data-testid={`onboarding-step-screen-${currentStep}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => setCurrentStep(prev => Math.max(prev - 1, 0))} className="p-2 rounded-xl" style={{ backgroundColor: "var(--bg-card)" }}>
          <ArrowLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <step.icon className="h-4 w-4" style={{ color: step.color }} />
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Step {currentStep}/5: {step.name}
            </h2>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-6" style={{ backgroundColor: "var(--border-light)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: step.color }} />
      </div>

      {/* Step form */}
      <StepForm
        step={step}
        items={stepData[currentStep]}
        setItems={(items) => setStepData(prev => ({ ...prev, [currentStep]: items }))}
      />

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSkip}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
          style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
          data-testid="skip-step-btn"
        >
          <SkipForward className="h-4 w-4" /> Skip
        </button>
        <button
          onClick={handleNext}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}CC 100%)` }}
          data-testid="next-step-btn"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{currentStep === 5 ? "Review" : "Next"} <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  );
}
