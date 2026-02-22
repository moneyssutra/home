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

  // Handle click to trigger native time picker
  const handleContainerClick = (e) => {
    if (disabled) return;
    
    // Prevent double-triggering if clicking directly on input
    if (e.target === inputRef.current) return;
    
    // Use the modern showPicker API if available
    if (inputRef.current && typeof inputRef.current.showPicker === "function") {
      try {
        inputRef.current.showPicker();
      } catch (err) {
        // Fallback: just focus the input
        inputRef.current.focus();
        inputRef.current.click();
      }
    } else if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.click();
    }
  };

  // Handle direct input click
  const handleInputClick = (e) => {
    if (disabled) return;
    
    // Use showPicker API for better mobile experience
    if (inputRef.current && typeof inputRef.current.showPicker === "function") {
      try {
        inputRef.current.showPicker();
      } catch (err) {
        // showPicker might fail in some contexts, that's ok
        console.log("showPicker not available");
      }
    }
  };

  return (
    <div className="w-full" data-testid={testId}>
      <label className="block text-sm font-medium text-[#334155] mb-2">
        Set Reminder Time
      </label>
      
      {/* Clickable container */}
      <div 
        className="relative cursor-pointer"
        onClick={handleContainerClick}
      >
        {/* Clock icon */}
        <Clock 
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#64748B] pointer-events-none" 
          style={{ zIndex: 1 }}
        />
        
        {/* Native time input - fully visible and interactive */}
        <input
          ref={inputRef}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={handleInputClick}
          disabled={disabled}
          className="w-full rounded-xl border border-[#CBD5E1] bg-white pl-12 pr-12 py-3.5 
            text-[#1E293B] font-medium text-base
            focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 
            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
            cursor-pointer transition-colors"
          style={{
            /* Reset native appearance but keep time picker functional */
            WebkitAppearance: "none",
            MozAppearance: "textfield",
            /* Ensure good visibility */
            backgroundColor: "#ffffff",
            color: "#1E293B",
            /* Light color scheme for picker */
            colorScheme: "light",
            /* Prevent iOS zoom on focus */
            fontSize: "16px",
            /* Ensure touch target size */
            minHeight: "52px",
            /* High z-index for the picker popup */
            position: "relative",
            zIndex: 10,
          }}
          data-testid={`${testId}-input`}
        />
        
        {/* Dropdown arrow icon */}
        <div 
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <svg className="h-5 w-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      <p className="mt-1.5 text-xs text-[#64748B]">
        You'll receive a reminder at this time on due dates
      </p>
      
      {/* Additional CSS for webkit time input styling */}
      <style>{`
        input[type="time"]::-webkit-calendar-picker-indicator {
          background: transparent;
          cursor: pointer;
          position: absolute;
          right: 0;
          top: 0;
          width: 100%;
          height: 100%;
          z-index: 20;
        }
        
        input[type="time"]::-webkit-datetime-edit {
          padding-left: 0;
        }
        
        input[type="time"]::-webkit-datetime-edit-fields-wrapper {
          padding: 0;
        }
      `}</style>
    </div>
  );
};

export default ReminderTimePicker;
