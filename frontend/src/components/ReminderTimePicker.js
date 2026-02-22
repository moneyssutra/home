import { useRef } from "react";
import { Clock } from "lucide-react";

/**
 * Reminder Time Picker Component
 * Mobile-optimized with native time picker support
 * 
 * Props:
 * - value: string (HH:MM format)
 * - onChange: (time: string) => void
 * - disabled: boolean
 * - testId: string
 */
const ReminderTimePicker = ({ value = "19:00", onChange, disabled = false, testId = "reminder-time-picker" }) => {
  const inputRef = useRef(null);

  // Format time for display (12-hour format)
  const formatTimeDisplay = (time24) => {
    if (!time24) return "7:00 PM";
    const [hours, minutes] = time24.split(":").map(Number);
    const hour12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Handle click to trigger native time picker
  const handleClick = () => {
    if (disabled) return;
    
    // Use the modern showPicker API if available
    if (inputRef.current && typeof inputRef.current.showPicker === "function") {
      try {
        inputRef.current.showPicker();
      } catch (e) {
        // Fallback: just focus the input
        inputRef.current.focus();
      }
    } else if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="w-full" data-testid={testId}>
      <label className="block text-sm font-medium text-[#334155] mb-2">
        Set Reminder Time
      </label>
      
      {/* Clickable display container */}
      <div 
        className="relative cursor-pointer"
        onClick={handleClick}
      >
        {/* Clock icon */}
        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#64748B] pointer-events-none z-10" />
        
        {/* Native time input - positioned for accessibility but styled for visibility */}
        <input
          ref={inputRef}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          readOnly={false}
          className="w-full rounded-xl border border-[#CBD5E1] bg-white pl-12 pr-4 py-3.5 text-[#1E293B] font-medium
            focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 
            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
            cursor-pointer transition-colors"
          style={{
            /* Force native picker visibility on mobile */
            WebkitAppearance: "none",
            MozAppearance: "none",
            appearance: "none",
            /* Ensure input is fully visible */
            colorScheme: "light",
            /* High z-index for picker */
            position: "relative",
            zIndex: 20,
            /* Explicit sizing */
            minHeight: "48px",
            fontSize: "16px", /* Prevents iOS zoom */
          }}
          data-testid={`${testId}-input`}
        />
        
        {/* Custom display overlay showing formatted time */}
        <div 
          className="absolute inset-0 flex items-center pl-12 pr-10 pointer-events-none rounded-xl"
          style={{ zIndex: 5 }}
        >
          <span className="text-[#1E293B] font-medium" style={{ fontSize: "16px" }}>
            {formatTimeDisplay(value)}
          </span>
        </div>
        
        {/* Dropdown arrow icon */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <svg className="h-5 w-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      <p className="mt-1.5 text-xs text-[#64748B]">
        You'll receive a reminder at this time on due dates
      </p>
    </div>
  );
};

export default ReminderTimePicker;
