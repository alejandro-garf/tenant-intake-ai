"use client";

import { ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string | ReactNode;
  confirmText?: string;
  confirmVariant?: "filled" | "destructive";
  cancelText?: string;
  onConfirm?: () => void;
}

/**
 * iOS-style alert dialog with backdrop and spring animations.
 * Confirmation flows for destructive actions.
 */
export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmText = "OK",
  confirmVariant = "filled",
  cancelText = "Cancel",
  onConfirm,
}: AlertDialogProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Lock scroll when dialog is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Dialog */}
          <motion.div
            className={cn(
              "relative w-full max-w-[270px] rounded-ios-sheet bg-secondary-grouped-background shadow-elevated overflow-hidden",
              "dark:bg-elevated-surface"
            )}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 1.1 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1 }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.9 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.2 }
                : {
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }
            }
          >
            {/* Content */}
            <div className="px-4 pt-5 pb-4 text-center">
              <h3 className="text-headline font-semibold text-label mb-1">
                {title}
              </h3>
              {message && (
                <div className="text-subhead text-secondary-label">
                  {message}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-separator">
              {onConfirm ? (
                <div className="grid grid-cols-2">
                  <button
                    onClick={handleCancel}
                    className={cn(
                      "px-4 py-3 text-body font-normal text-system-blue",
                      "hover:bg-system-blue/5 active:bg-system-blue/10",
                      "transition-colors duration-100",
                      "border-r border-separator"
                    )}
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={cn(
                      "px-4 py-3 text-body font-semibold",
                      confirmVariant === "destructive"
                        ? "text-system-red hover:bg-system-red/5 active:bg-system-red/10"
                        : "text-system-blue hover:bg-system-blue/5 active:bg-system-blue/10",
                      "transition-colors duration-100"
                    )}
                  >
                    {confirmText}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCancel}
                  className={cn(
                    "w-full px-4 py-3 text-body font-semibold text-system-blue",
                    "hover:bg-system-blue/5 active:bg-system-blue/10",
                    "transition-colors duration-100"
                  )}
                >
                  {confirmText}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
