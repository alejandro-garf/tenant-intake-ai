"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SelectFieldProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className={cn("space-y-1", className)}>
        <label className="block text-subhead text-secondary-label px-4">
          {label}
        </label>
        <div className="mx-gutter">
          <select
            ref={ref}
            className={cn(
              "w-full rounded-ios bg-secondary-grouped-background px-4 py-3 text-body text-label",
              "border border-separator transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-system-blue focus:border-system-blue",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "cursor-pointer appearance-none bg-right",
              error &&
                "border-system-red focus:ring-system-red focus:border-system-red"
            )}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238e8e93'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
              backgroundSize: "1.5rem",
              paddingRight: "2.5rem",
            }}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
);

SelectField.displayName = "SelectField";
