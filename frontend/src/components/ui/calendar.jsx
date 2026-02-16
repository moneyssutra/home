import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  selected,
  onSelect,
  defaultMonth,
  ...props
}) {
  // Track the currently displayed month for controlled navigation
  // This ensures dropdown selection properly updates the calendar view
  const [displayMonth, setDisplayMonth] = React.useState(() => {
    if (selected instanceof Date) return selected;
    if (defaultMonth instanceof Date) return defaultMonth;
    return new Date();
  });

  // Update displayed month when selected date changes externally
  React.useEffect(() => {
    if (selected instanceof Date) {
      setDisplayMonth(selected);
    }
  }, [selected]);

  // Handle month change from navigation arrows or dropdown selection
  const handleMonthChange = React.useCallback((newMonth) => {
    if (newMonth instanceof Date) {
      setDisplayMonth(newMonth);
    }
  }, []);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown-buttons"
      fromYear={1950}
      toYear={2050}
      month={displayMonth}
      onMonthChange={handleMonthChange}
      selected={selected}
      onSelect={onSelect}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center gap-1",
        caption_label: "text-sm font-medium hidden",
        caption_dropdowns: "flex gap-2 items-center",
        dropdown: "px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer min-h-[44px] min-w-[80px] touch-manipulation",
        dropdown_month: "mr-1",
        dropdown_year: "",
        vhidden: "hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 bg-transparent p-0 opacity-70 hover:opacity-100 touch-manipulation"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 touch-manipulation"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props} />
  );
}
Calendar.displayName = "Calendar"

export { Calendar }
