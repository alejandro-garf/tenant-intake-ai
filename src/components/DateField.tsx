"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface DateFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className={cn("space-y-1", className)}>
        <label className="block text-subhead text-secondary-label px-4">
          {label}
        </label>
        <div className="mx-gutter">
          <input
            ref={ref}
            type="date"
            className={cn(
              "w-full rounded-ios bg-secondary-grouped-background px-4 py-3 text-body text-label",
              "border border-separator transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-system-blue focus:border-system-blue",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "cursor-pointer",
              error &&
                "border-system-red focus:ring-system-red focus:border-system-red"
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-footnote text-system-red px-4 pt-1">{error}</p>
        )}
      </div>
    );
  }
);

DateField.displayName = "DateField";
