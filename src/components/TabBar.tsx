"use client";

import { HTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabBarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const TabBar = forwardRef<HTMLDivElement, TabBarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t material-chrome pb-safe",
          className
        )}
        style={{
          borderTopWidth: '0.5px',
          borderTopColor: 'var(--material-separator)',
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabBar.displayName = "TabBar";

export interface TabItemProps extends HTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export const TabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  ({ icon, label, active = false, onClick, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center px-4 py-2 transition-ios cursor-pointer",
          active ? "text-system-blue" : "text-secondary-label",
          className
        )}
        onClick={onClick}
        {...props}
      >
        <div className="h-7 w-7 mb-1">{icon}</div>
        <span className="text-caption font-medium">{label}</span>
      </button>
    );
  }
);

TabItem.displayName = "TabItem";
