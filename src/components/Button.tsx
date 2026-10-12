"use client";

import { ButtonHTMLAttributes, forwardRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ButtonVariant = "filled" | "tinted" | "plain";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "filled", className, children, disabled, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();
    const [isPressed, setIsPressed] = useState(false);

    const baseStyles =
      "inline-flex items-center justify-center rounded-pill px-6 py-3 text-body font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

    const variantStyles = {
      filled:
        "bg-system-blue text-white disabled:hover:opacity-40 hover-lift-filled",
      tinted:
        "bg-system-blue/10 text-system-blue dark:bg-system-blue/20 hover-tint",
      plain:
        "text-system-blue disabled:hover:opacity-40 hover-tint",
    };

    const pressedStyle = !shouldReduceMotion && isPressed && !disabled
      ? { transform: "scale(0.96)", opacity: 0.88 }
      : isPressed && !disabled
      ? { opacity: 0.88 }
      : undefined;

    return (
      <button
        ref={ref}
        {...props}
        className={cn(
          baseStyles,
          variantStyles[variant],
          "transition-all duration-200 ease-out",
          className
        )}
        style={{
          ...(variant === "filled"
            ? { boxShadow: "var(--shadow-button-filled)" }
            : {}),
          ...pressedStyle,
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        disabled={disabled}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
