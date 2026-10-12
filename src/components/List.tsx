"use client";

import { HTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const List = forwardRef<HTMLDivElement, ListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mx-gutter rounded-ios-card bg-secondary-grouped-background overflow-hidden shadow-card card-highlight",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

List.displayName = "List";

export interface RowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editText?: string;
  deleteText?: string;
  // Legacy props for backwards compatibility (clickable rows without actions)
  onClick?: () => void;
  chevron?: boolean;
}

export const Row = forwardRef<HTMLDivElement, RowProps>(
  ({ className, children, onEdit, onDelete, editText = "Edit", deleteText = "Delete", onClick, chevron = false, ...props }, ref) => {
    const hasActions = Boolean(onEdit || onDelete);
    const isClickable = Boolean(onClick);

    const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.();
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.();
    };

    // Row with edit/delete actions
    if (hasActions) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-center gap-3 border-b border-separator px-4 py-3 last:border-b-0",
            className
          )}
          {...props}
        >
          {/* Content - takes available space, truncates if needed */}
          <div className="flex-1 min-w-0 text-body text-label">{children}</div>

          {/* Action buttons - always visible, never wrap */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 text-footnote font-semibold text-system-blue rounded-md transition-colors hover:bg-system-blue/10 active:bg-system-blue/20"
                aria-label={editText}
              >
                {editText}
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-footnote font-semibold text-system-red rounded-md transition-colors hover:bg-system-red/10 active:bg-system-red/20"
                aria-label={deleteText}
              >
                {deleteText}
              </button>
            )}
          </div>
        </div>
      );
    }

    // Clickable row (legacy support for onClick + chevron)
    if (isClickable) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-center justify-between border-b border-separator px-4 py-3 last:border-b-0 cursor-pointer hover-row transition-all duration-200 ease-out",
            className
          )}
          onClick={onClick}
          role="button"
          tabIndex={0}
          {...props}
        >
          <div className="flex-1 text-body text-label">{children}</div>
          {chevron && (
            <svg
              className="h-5 w-5 text-tertiary-label ml-2 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </div>
      );
    }

    // Static row
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between border-b border-separator px-4 py-3 last:border-b-0",
          className
        )}
        {...props}
      >
        <div className="flex-1 text-body text-label">{children}</div>
      </div>
    );
  }
);

Row.displayName = "Row";
