"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, onChange, disabled, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      onChange?.(e);
    };

    return (
      <label
        className={cn(
          "relative inline-flex h-8 w-[51px] cursor-pointer items-center rounded-pill transition-ios",
          checked ? "bg-system-green" : "bg-fill",
          disabled && "cursor-not-allowed opacity-40",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={!!checked}
          disabled={!!disabled}
          onChange={handleChange}
          {...props}
        />
        <motion.span
          className="absolute h-7 w-7 rounded-full shadow-md"
          style={{ backgroundColor: 'var(--control-surface)' }}
          animate={{
            x: checked ? 23 : 1,
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }
          }
        />
      </label>
    );
  }
);

Switch.displayName = "Switch";
