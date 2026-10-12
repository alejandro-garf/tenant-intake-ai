"use client";

import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const shouldReduceMotion = useReducedMotion();

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-label/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[70]",
              "bg-grouped-background rounded-t-[20px] overflow-hidden",
              "max-h-[90vh] flex flex-col",
              "shadow-elevated",
              className
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }
            }
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-tertiary-label" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-gutter py-3 border-b border-separator">
              <button
                onClick={onClose}
                className="text-body text-system-blue font-normal cursor-pointer"
              >
                Cancel
              </button>
              <h2 className="text-headline font-semibold">{title}</h2>
              <div className="w-16" /> {/* Spacer for center alignment */}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-safe">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
