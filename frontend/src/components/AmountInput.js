import { numberToWords } from "@/lib/formatters";

const AmountInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "0",
  required = false,
  className = "",
  testId = "amount-input"
}) => {
  const handleChange = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, "");
    // Only allow one decimal point
    const parts = val.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    onChange(val);
  };

  const numValue = parseFloat(value) || 0;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#334155] mb-2">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]/60 font-medium">₹</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#334155] bg-[#1E293B] text-[#334155] placeholder-[#334155]/40 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 transition-all"
          data-testid={testId}
        />
      </div>
      {numValue > 0 && (
        <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid={`${testId}-words`}>
          {numberToWords(numValue)}
        </p>
      )}
    </div>
  );
};

export default AmountInput;
