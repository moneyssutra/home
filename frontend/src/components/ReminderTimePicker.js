import { Clock } from "lucide-react";

/**
 * Reminder Time Picker Component
 * 
 * Props:
 * - value: string (HH:MM format)
 * - onChange: (time: string) => void
 * - disabled: boolean
 * - testId: string
 */
const ReminderTimePicker = ({ value = "19:00", onChange, disabled = false, testId = "reminder-time-picker" }) => {
  // Generate time options (every 30 minutes)
  const timeOptions = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute of [0, 30]) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      const time24 = `${h}:${m}`;
      
      // Format for display (12-hour format)
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? "PM" : "AM";
      const display = `${hour12}:${m.padStart(2, "0")} ${ampm}`;
      
      timeOptions.push({ value: time24, label: display });
    }
  }
  
  return (
    <div className="w-full" data-testid={testId}>
      <label className="block text-sm font-medium text-[#334155] mb-2">
        Set Reminder Time
      </label>
      <div className="relative">
        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-12 pr-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 appearance-none cursor-pointer"
          data-testid={`${testId}-select`}
        >
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="h-5 w-5 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-[#334155]/50">
        You'll receive a reminder at this time on due dates
      </p>
    </div>
  );
};

export default ReminderTimePicker;
