"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  type?: "text" | "email" | "number";
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, className, type = "text", ...props }, ref) => {
    return (
      <div className={cn("space-y-1", className)}>
        <label className="block text-subhead text-secondary-label px-4">
          {label}
        </label>
        <div className="mx-gutter">
          <input
            ref={ref}
            type={type}
            className={cn(
              "w-full rounded-ios bg-secondary-grouped-background px-4 py-3 text-body text-label",
              "border border-separator transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-system-blue focus:border-system-blue",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              error &&
                "border-system-red focus:ring-system-red focus:border-system-red",
              "placeholder:text-tertiary-label"
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

TextField.displayName = "TextField";
