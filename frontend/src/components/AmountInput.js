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
        <label className="block text-sm font-medium text-[#0B3D2E] mb-2">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E]/60 font-medium">₹</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-[#0B3D2E] placeholder-[#0B3D2E]/40 focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 transition-all"
          data-testid={testId}
        />
      </div>
      {numValue > 0 && (
        <p className="mt-1.5 text-xs text-[#0B3D2E]/50 italic" data-testid={`${testId}-words`}>
          {numberToWords(numValue)}
        </p>
      )}
    </div>
  );
};

export default AmountInput;
