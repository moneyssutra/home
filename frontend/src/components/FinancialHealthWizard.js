import React, { useState, useEffect } from "react";
import axios from "axios";
import { ChevronRight, ChevronLeft, Wallet, Receipt, PiggyBank, CreditCard, Shield, TrendingUp, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import API_BASE from '../utils/apiConfig';

const API = API_BASE;

const STEPS = [
  { id: "income", title: "Monthly Income", icon: Wallet, description: "Your total monthly earnings" },
  { id: "expenses", title: "Monthly Expenses", icon: Receipt, description: "What you spend each month" },
  { id: "savings", title: "Savings & Liquidity", icon: PiggyBank, description: "Accessible cash & savings" },
  { id: "debt", title: "Debts & Loans", icon: CreditCard, description: "Outstanding obligations" },
  { id: "insurance", title: "Insurance Cover", icon: Shield, description: "Your safety net" },
  { id: "investments", title: "Investments", icon: TrendingUp, description: "Your wealth building" },
];

const Field = ({ label, hint, value, onChange, prefix = "₹", placeholder = "0" }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</label>
    {hint && <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: "var(--bg-page)", border: "1px solid var(--border-light)" }}>
      {prefix && <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>{prefix}</span>}
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm font-medium"
        style={{ color: "var(--text-primary)" }}
        data-testid={`wizard-field-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  </div>
);

export default function FinancialHealthWizard({ onComplete, existingData }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    monthlyIncome: 0,
    otherIncome: 0,
    monthlyExpenses: 0,
    essentialExpenses: 0,
    liquidSavings: 0,
    emergencyFund: 0,
    totalLoans: 0,
    totalEmi: 0,
    creditCardLimit: 0,
    creditCardOutstanding: 0,
    lifeInsuranceCover: 0,
    healthInsuranceCover: 0,
    totalInvestments: 0,
    equityInvestments: 0,
    retirementFunds: 0,
  });

  useEffect(() => {
    if (existingData && Object.keys(existingData).length > 0) {
      setData(prev => ({ ...prev, ...existingData }));
    }
  }, [existingData]);

  const update = (key) => (val) => setData(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/financial-health/wizard`, data, { withCredentials: true });
      toast.success("Financial profile saved! Recalculating your score...");
      onComplete?.();
    } catch (err) {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (v) => {
    if (!v) return "₹0";
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toLocaleString("en-IN")}`;
  };

  const StepContent = () => {
    switch (step) {
      case 0: return (
        <>
          <Field label="Monthly Salary (take-home)" hint="After tax deductions" value={data.monthlyIncome} onChange={update('monthlyIncome')} />
          <Field label="Other Monthly Income" hint="Rent, freelance, dividends, etc." value={data.otherIncome} onChange={update('otherIncome')} />
          <div className="p-3 rounded-xl mt-2" style={{ backgroundColor: "var(--bg-page)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Monthly Income</p>
            <p className="text-lg font-bold" style={{ color: "var(--accent-primary)" }}>{formatAmount(data.monthlyIncome + data.otherIncome)}</p>
          </div>
        </>
      );
      case 1: return (
        <>
          <Field label="Total Monthly Expenses" hint="Everything you spend in a month" value={data.monthlyExpenses} onChange={update('monthlyExpenses')} />
          <Field label="Essential Expenses" hint="Rent, utilities, groceries, EMIs, insurance premiums" value={data.essentialExpenses} onChange={update('essentialExpenses')} />
          {data.monthlyIncome + data.otherIncome > 0 && (
            <div className="p-3 rounded-xl mt-2" style={{ backgroundColor: "var(--bg-page)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Monthly Savings</p>
              <p className="text-lg font-bold" style={{ color: (data.monthlyIncome + data.otherIncome - data.monthlyExpenses) >= 0 ? "var(--accent-primary)" : "#EF4444" }}>
                {formatAmount(data.monthlyIncome + data.otherIncome - data.monthlyExpenses)}
              </p>
            </div>
          )}
        </>
      );
      case 2: return (
        <>
          <Field label="Liquid Savings" hint="Savings account + liquid FDs + cash" value={data.liquidSavings} onChange={update('liquidSavings')} />
          <Field label="Emergency Fund" hint="Money set aside specifically for emergencies" value={data.emergencyFund} onChange={update('emergencyFund')} />
          {data.essentialExpenses > 0 && (
            <div className="p-3 rounded-xl mt-2" style={{ backgroundColor: "var(--bg-page)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Emergency Runway</p>
              <p className="text-lg font-bold" style={{ color: "var(--accent-primary)" }}>
                {Math.round((data.liquidSavings + data.emergencyFund) / data.essentialExpenses)} months
              </p>
            </div>
          )}
        </>
      );
      case 3: return (
        <>
          <Field label="Total Outstanding Loans" hint="Home loan + car loan + personal loan + education loan" value={data.totalLoans} onChange={update('totalLoans')} />
          <Field label="Total Monthly EMIs" hint="Sum of all EMI payments per month" value={data.totalEmi} onChange={update('totalEmi')} />
          <Field label="Credit Card Limit" hint="Combined limit across all cards" value={data.creditCardLimit} onChange={update('creditCardLimit')} />
          <Field label="Credit Card Outstanding" hint="Current unpaid balance" value={data.creditCardOutstanding} onChange={update('creditCardOutstanding')} />
        </>
      );
      case 4: return (
        <>
          <Field label="Life Insurance Cover" hint="Total sum assured (term + endowment)" value={data.lifeInsuranceCover} onChange={update('lifeInsuranceCover')} />
          <Field label="Health Insurance Cover" hint="Total health cover for family" value={data.healthInsuranceCover} onChange={update('healthInsuranceCover')} />
          {data.monthlyIncome > 0 && (
            <div className="p-3 rounded-xl mt-2" style={{ backgroundColor: "var(--bg-page)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Life Cover Ratio</p>
              <p className="text-lg font-bold" style={{ color: data.lifeInsuranceCover >= data.monthlyIncome * 120 ? "var(--accent-primary)" : "#F59E0B" }}>
                {data.monthlyIncome > 0 ? `${Math.round(data.lifeInsuranceCover / (data.monthlyIncome * 12))}x annual income` : "N/A"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Recommended: 10-15x annual income</p>
            </div>
          )}
        </>
      );
      case 5: return (
        <>
          <Field label="Total Investments" hint="Mutual funds + stocks + FD + PPF + NPS + gold + real estate" value={data.totalInvestments} onChange={update('totalInvestments')} />
          <Field label="Equity Investments" hint="Stocks + equity mutual funds" value={data.equityInvestments} onChange={update('equityInvestments')} />
          <Field label="Retirement Funds" hint="EPF + PPF + NPS" value={data.retirementFunds} onChange={update('retirementFunds')} />
        </>
      );
      default: return null;
    }
  };

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="financial-health-wizard">
      {/* Progress bar */}
      <div className="flex gap-1 p-3">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= step ? "var(--accent-primary)" : "var(--bg-page)" }} />
        ))}
      </div>

      {/* Step header */}
      <div className="px-5 pb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--accent-primary-soft)" }}>
          <Icon className="h-5 w-5" style={{ color: "var(--accent-primary)" }} />
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Step {step + 1} of {STEPS.length}</p>
          <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{currentStep.title}</h3>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{currentStep.description}</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="px-5 py-4">
        <StepContent />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-5 pb-5">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
          style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-page)" }}
          data-testid="wizard-prev-btn"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {isLast ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: "var(--accent-primary)" }}
            data-testid="wizard-save-btn"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving..." : "Calculate My Score"}
          </button>
        ) : (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ backgroundColor: "var(--accent-primary)" }}
            data-testid="wizard-next-btn"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
