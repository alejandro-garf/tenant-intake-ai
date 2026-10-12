"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  label: string;
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (isoDate: string) => void;
  error?: string;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

/**
 * iOS-style date picker with three dropdowns: month, day, year.
 * Enforces valid date constraints and prevents impossible dates.
 * Output is always a valid ISO date string (YYYY-MM-DD).
 */
export function DatePicker({
  label,
  value,
  onChange,
  error,
  minYear = 1900,
  maxYear,
  className,
}: DatePickerProps) {
  // Enforce current year as maximum if not specified, computed at render time
  const currentYear = new Date().getFullYear();
  const effectiveMaxYear = maxYear !== undefined ? Math.min(maxYear, currentYear) : currentYear;

  // Parse the ISO date value (YYYY-MM-DD format)
  const parsedDate = useMemo(() => {
    if (!value) return { year: "", month: "", day: "" };

    // Parse directly from the ISO string format (YYYY-MM-DD)
    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = value.match(isoRegex);

    if (!match) return { year: "", month: "", day: "" };

    return {
      year: match[1] ?? "",
      month: match[2] ?? "",
      day: match[3] ?? "",
    };
  }, [value]);

  // Generate year options (descending, most recent first)
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let year = effectiveMaxYear; year >= minYear; year--) {
      years.push(year);
    }
    return years;
  }, [minYear, effectiveMaxYear]);

  // Month options
  const monthOptions = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Calculate days in month (accounting for leap years)
  const daysInMonth = useMemo(() => {
    if (!parsedDate.year || !parsedDate.month) return 31;
    const year = parseInt(parsedDate.year);
    const month = parseInt(parsedDate.month);
    return new Date(year, month, 0).getDate();
  }, [parsedDate.year, parsedDate.month]);

  // Generate day options based on selected month/year
  const dayOptions = useMemo(() => {
    const days: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  }, [daysInMonth]);

  const handleMonthChange = (newMonth: string) => {
    if (!newMonth) {
      onChange("");
      return;
    }

    const year = parsedDate.year || effectiveMaxYear.toString();
    const day = parsedDate.day || "01";

    // Validate day doesn't exceed days in new month
    const maxDays = new Date(parseInt(year), parseInt(newMonth), 0).getDate();
    const validDay = Math.min(parseInt(day), maxDays)
      .toString()
      .padStart(2, "0");

    onChange(`${year}-${newMonth}-${validDay}`);
  };

  const handleDayChange = (newDay: string) => {
    if (!newDay) {
      onChange("");
      return;
    }

    const year = parsedDate.year || effectiveMaxYear.toString();
    const month = parsedDate.month || "01";

    onChange(`${year}-${month}-${newDay.padStart(2, "0")}`);
  };

  const handleYearChange = (newYear: string) => {
    if (!newYear) {
      onChange("");
      return;
    }

    const month = parsedDate.month || "01";
    const day = parsedDate.day || "01";

    // Validate day doesn't exceed days in new month/year (leap year)
    const maxDays = new Date(parseInt(newYear), parseInt(month), 0).getDate();
    const validDay = Math.min(parseInt(day), maxDays)
      .toString()
      .padStart(2, "0");

    onChange(`${newYear}-${month}-${validDay}`);
  };

  return (
    <div className={cn("space-y-1", className)}>
      <label className="block text-subhead text-secondary-label px-4">
        {label}
      </label>
      <div className="mx-gutter grid grid-cols-3 gap-2">
        {/* Month */}
        <select
          value={parsedDate.month}
          onChange={(e) => handleMonthChange(e.target.value)}
          className={cn(
            "w-full rounded-ios bg-secondary-grouped-background px-3 py-3 text-body text-label",
            "border border-separator transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-system-blue focus:border-system-blue",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "cursor-pointer appearance-none",
            error &&
              "border-system-red focus:ring-system-red focus:border-system-red"
          )}
        >
          <option value="">Month</option>
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>

        {/* Day */}
        <select
          value={parsedDate.day}
          onChange={(e) => handleDayChange(e.target.value)}
          className={cn(
            "w-full rounded-ios bg-secondary-grouped-background px-3 py-3 text-body text-label",
            "border border-separator transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-system-blue focus:border-system-blue",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "cursor-pointer appearance-none",
            error &&
              "border-system-red focus:ring-system-red focus:border-system-red"
          )}
        >
          <option value="">Day</option>
          {dayOptions.map((day) => (
            <option key={day} value={day.toString().padStart(2, "0")}>
              {day}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          value={parsedDate.year}
          onChange={(e) => handleYearChange(e.target.value)}
          className={cn(
            "w-full rounded-ios bg-secondary-grouped-background px-3 py-3 text-body text-label",
            "border border-separator transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-system-blue focus:border-system-blue",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "cursor-pointer appearance-none",
            error &&
              "border-system-red focus:ring-system-red focus:border-system-red"
          )}
        >
          <option value="">Year</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="text-footnote text-system-red px-4 pt-1">{error}</p>
      )}
    </div>
  );
}
