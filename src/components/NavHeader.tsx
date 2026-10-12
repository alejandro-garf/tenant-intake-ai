"use client";

import { HTMLAttributes, forwardRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface NavHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
}

export const NavHeader = forwardRef<HTMLDivElement, NavHeaderProps>(
  ({ title, className, ...props }, ref) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
      const handleScroll = () => {
        // Collapse when scrolled past 50px
        setIsCollapsed(window.scrollY > 50);
      };

      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
      <div
        ref={ref}
        className={cn(
          "sticky top-0 z-50 material-chrome border-b transition-ios pt-safe",
          isCollapsed ? "border-separator" : "border-transparent",
          className
        )}
        style={{
          borderBottomWidth: isCollapsed ? '0.5px' : '0px',
        }}
        {...props}
      >
        <div
          className={cn(
            "px-gutter pb-3 transition-ios",
            isCollapsed ? "pt-2" : "pt-8"
          )}
        >
          <h1
            className={cn(
              "font-bold transition-ios",
              isCollapsed
                ? "text-headline text-center"
                : "text-large-title"
            )}
            style={{
              letterSpacing: isCollapsed ? '-0.2px' : '-0.4px',
            }}
          >
            {title}
          </h1>
        </div>
      </div>
    );
  }
);

NavHeader.displayName = "NavHeader";
