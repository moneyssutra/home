import * as React from "react"
import { format, parse, isValid, startOfMonth, endOfMonth, setMonth, setYear } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * RestrictedDatePicker - A date picker that can be locked to a specific month
 * 
 * Props:
 * - value: string (YYYY-MM-DD format) or Date
 * - onChange: (date: string) => void - returns YYYY-MM-DD format
 * - restrictedMonth: number (0-11) - if set, calendar is locked to this month
 * - restrictedYear: number (optional) - year to use with restrictedMonth, defaults to current year
 * - placeholder: string
 * - disabled: boolean
 * - error: boolean - shows error styling
 * - className: string
 * - testId: string
 */
const RestrictedDatePicker = React.forwardRef(({
  value,
  onChange,
  restrictedMonth,
  restrictedYear,
  placeholder = "Select date",
  disabled = false,
  error = false,
  className,
  testId,
  ...props
}, ref) => {
  const [open, setOpen] = React.useState(false);
  
  // Parse value to Date object
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  // Determine the year to use
  const year = restrictedYear || new Date().getFullYear();
  
  // Calculate date bounds when month is restricted
  const { fromDate, toDate, defaultMonth } = React.useMemo(() => {
    if (restrictedMonth === undefined || restrictedMonth === null) {
      return { fromDate: undefined, toDate: undefined, defaultMonth: selectedDate || new Date() };
    }
    
    // Create a date for the restricted month
    let baseDate = new Date(year, restrictedMonth, 1);
    
    return {
      fromDate: startOfMonth(baseDate),
      toDate: endOfMonth(baseDate),
      defaultMonth: baseDate
    };
  }, [restrictedMonth, year, selectedDate]);

  // Handle date selection
  const handleSelect = React.useCallback((date) => {
    if (date) {
      const formatted = format(date, "yyyy-MM-dd");
      onChange(formatted);
    }
    setOpen(false);
  }, [onChange]);

  // Format display value
  const displayValue = React.useMemo(() => {
    if (!selectedDate) return null;
    return format(selectedDate, "PPP"); // e.g., "January 15, 2026"
  }, [selectedDate]);

  // Check if month is restricted
  const isMonthRestricted = restrictedMonth !== undefined && restrictedMonth !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "w-full justify-start text-left font-normal h-auto py-3 px-4 rounded-xl",
            !selectedDate && "text-muted-foreground",
            error && "border-red-500",
            className
          )}
          style={{
            backgroundColor: "#FFFFFF",
            border: error ? "1px solid #EF4444" : "1px solid var(--border-light)",
            color: selectedDate ? "var(--text-primary)" : "var(--text-muted)"
          }}
          {...props}
        >
          <span className="flex-1">{displayValue || placeholder}</span>
          <CalendarIcon className="ml-2 h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={defaultMonth}
          fromDate={fromDate}
          toDate={toDate}
          // Hide outside days when month is restricted
          showOutsideDays={!isMonthRestricted}
          // Disable navigation when month is restricted
          disableNavigation={isMonthRestricted}
          // Hide dropdowns when month is restricted (show only that month)
          captionLayout={isMonthRestricted ? "label" : "dropdown-buttons"}
          initialFocus
          classNames={{
            // Hide nav buttons when restricted
            nav: isMonthRestricted ? "hidden" : "space-x-1 flex items-center",
            // Style for restricted month label
            caption_label: isMonthRestricted ? "text-sm font-medium" : "text-sm font-medium hidden",
            caption_dropdowns: isMonthRestricted ? "hidden" : "flex gap-2 items-center",
          }}
        />
      </PopoverContent>
    </Popover>
  );
});

RestrictedDatePicker.displayName = "RestrictedDatePicker";

export { RestrictedDatePicker };
