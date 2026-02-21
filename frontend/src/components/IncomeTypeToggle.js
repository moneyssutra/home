import { cn } from "@/lib/utils";

/**
 * Fixed/Variable Toggle Component for Income Forms
 * 
 * Props:
 * - value: "fixed" | "variable"
 * - onChange: (value: "fixed" | "variable") => void
 * - disabled: boolean
 * - testId: string
 */
const IncomeTypeToggle = ({ value = "fixed", onChange, disabled = false, testId = "income-type-toggle" }) => {
  const isVariable = value === "variable";
  
  return (
    <div className="w-full" data-testid={testId}>
      <label className="block text-sm font-medium text-[#334155] mb-2">
        Income Type
      </label>
      <div className="flex rounded-xl overflow-hidden border border-[#334155] bg-[#1E293B]">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("fixed")}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium transition-all duration-200",
            !isVariable
              ? "bg-[#00D09C] text-white"
              : "bg-transparent text-[#334155] hover:bg-[#334155]/10"
          )}
          data-testid={`${testId}-fixed`}
        >
          Fixed
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("variable")}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium transition-all duration-200",
            isVariable
              ? "bg-[#00D09C] text-white"
              : "bg-transparent text-[#334155] hover:bg-[#334155]/10"
          )}
          data-testid={`${testId}-variable`}
        >
          Variable
        </button>
      </div>
      <p className="mt-1.5 text-xs text-[#334155]/50">
        {isVariable 
          ? "You'll receive reminders to log actual amounts"
          : "Amount remains consistent each period"
        }
      </p>
    </div>
  );
};

export default IncomeTypeToggle;
