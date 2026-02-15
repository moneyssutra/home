import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import axios from "axios";

const BasicSetup = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [riskAppetite, setRiskAppetite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const goals = [
    { id: "grow-wealth", label: "Grow Wealth" },
    { id: "debt-free", label: "Become Debt Free" },
    { id: "track-expenses", label: "Track Expenses" },
    { id: "passive-income", label: "Build Passive Income" },
  ];

  const riskOptions = [
    { id: "safe", label: "Safe", description: "Low risk, stable returns" },
    { id: "balanced", label: "Balanced", description: "Moderate risk & returns" },
    { id: "aggressive", label: "Aggressive", description: "High risk, high returns" },
  ];

  const toggleGoal = (goalId) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleIncomeChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setMonthlyIncome(value);
  };

  const validate = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = "Name is required";
    if (!monthlyIncome || parseFloat(monthlyIncome) <= 0) newErrors.monthlyIncome = "Enter valid income";
    if (selectedGoals.length === 0) newErrors.goals = "Select at least one goal";
    if (!riskAppetite) newErrors.riskAppetite = "Select risk appetite";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await axios.post(`${backendUrl}/api/profile/basic`, {
        fullName: fullName.trim(),
        monthlyIncome: parseFloat(monthlyIncome),
        primaryGoals: selectedGoals,
        riskAppetite,
      });
      navigate("/");
    } catch (error) {
      console.error("Error saving profile:", error);
      setErrors({ submit: "Failed to save. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E2E8F0] via-[#134E3E] to-[#E2E8F0]" data-testid="basic-setup-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-4">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E293B]/10 text-white transition-colors hover:bg-[#1E293B]/20"
          onClick={() => navigate("/welcome")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-white/60 text-xs">Step 1 of 1</p>
          <h1 className="text-xl font-semibold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Basic Setup
          </h1>
        </div>
        <div className="w-10" />
      </header>

      {/* Form */}
      <div className="px-6 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3.5 rounded-xl bg-[#1E293B]/10 border border-white/20 text-white placeholder-white/40 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
              data-testid="fullname-input"
            />
            {errors.fullName && <p className="text-rose-400 text-xs mt-1">{errors.fullName}</p>}
          </div>

          {/* Monthly Income */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Monthly Income
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 font-medium">₹</span>
              <input
                type="text"
                value={monthlyIncome}
                onChange={handleIncomeChange}
                placeholder="0"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-[#1E293B]/10 border border-white/20 text-white placeholder-white/40 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="income-input"
              />
            </div>
            {errors.monthlyIncome && <p className="text-rose-400 text-xs mt-1">{errors.monthlyIncome}</p>}
          </div>

          {/* Primary Goals */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-3">
              Primary Goals <span className="text-white/40">(Select multiple)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {goals.map((goal) => {
                const isSelected = selectedGoals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className={`relative px-4 py-3 rounded-xl text-sm font-medium text-left transition-all ${
                      isSelected
                        ? "bg-[#14B8A6] text-white"
                        : "bg-[#1E293B]/10 text-white/80 hover:bg-[#1E293B]/15"
                    }`}
                    data-testid={`goal-${goal.id}`}
                  >
                    {goal.label}
                    {isSelected && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                    )}
                  </button>
                );
              })}
            </div>
            {errors.goals && <p className="text-rose-400 text-xs mt-1">{errors.goals}</p>}
          </div>

          {/* Risk Appetite */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-3">
              Risk Appetite
            </label>
            <div className="grid grid-cols-3 gap-3">
              {riskOptions.map((option) => {
                const isSelected = riskAppetite === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRiskAppetite(option.id)}
                    className={`px-3 py-4 rounded-xl text-center transition-all ${
                      isSelected
                        ? "bg-[#14B8A6] text-white"
                        : "bg-[#1E293B]/10 text-white/80 hover:bg-[#1E293B]/15"
                    }`}
                    data-testid={`risk-${option.id}`}
                  >
                    <span className="block text-sm font-semibold mb-0.5">{option.label}</span>
                    <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-white/50"}`}>
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.riskAppetite && <p className="text-rose-400 text-xs mt-1">{errors.riskAppetite}</p>}
          </div>

          {errors.submit && (
            <div className="rounded-xl bg-rose-500/20 border border-rose-500/30 p-4 text-sm text-rose-300">
              {errors.submit}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Button */}
      <div className="fixed bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-[#E2E8F0] via-[#E2E8F0] to-transparent">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full max-w-md mx-auto block py-4 rounded-2xl bg-gradient-to-r from-[#14B8A6] to-[#10B981] text-white text-lg font-semibold shadow-lg shadow-[#14B8A6]/30 transition-all hover:shadow-xl disabled:opacity-50"
          data-testid="save-continue-button"
        >
          {isSubmitting ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
};

export default BasicSetup;
