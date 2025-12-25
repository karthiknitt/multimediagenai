"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "error";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      showLabel = false,
      size = "md",
      variant = "default",
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const roundedPercentage = Math.round(percentage);

    const sizeClasses = {
      sm: "h-1.5",
      md: "h-2.5",
      lg: "h-4",
    };

    const variantClasses = {
      default: "bg-primary",
      success: "bg-green-500",
      warning: "bg-yellow-500",
      error: "bg-destructive",
    };

    // Generate accessible label text
    const labelText = `${roundedPercentage} percent complete`;

    return (
      <div className={cn("w-full", className)} {...props}>
        <progress
          ref={ref as React.Ref<HTMLProgressElement>}
          value={value}
          max={max}
          aria-label={labelText}
          className="sr-only"
        >
          {roundedPercentage}%
        </progress>
        <div
          aria-hidden="true"
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-secondary",
            sizeClasses[size]
          )}
        >
          <div
            data-progress={roundedPercentage}
            className={cn(
              "h-full transition-all duration-300 ease-out",
              variantClasses[variant],
              roundedPercentage === 0 && "w-0",
              roundedPercentage > 0 && roundedPercentage < 10 && "w-[5%]",
              roundedPercentage >= 10 && roundedPercentage < 20 && "w-[15%]",
              roundedPercentage >= 20 && roundedPercentage < 30 && "w-[25%]",
              roundedPercentage >= 30 && roundedPercentage < 40 && "w-[35%]",
              roundedPercentage >= 40 && roundedPercentage < 50 && "w-[45%]",
              roundedPercentage >= 50 && roundedPercentage < 60 && "w-[55%]",
              roundedPercentage >= 60 && roundedPercentage < 70 && "w-[65%]",
              roundedPercentage >= 70 && roundedPercentage < 80 && "w-[75%]",
              roundedPercentage >= 80 && roundedPercentage < 90 && "w-[85%]",
              roundedPercentage >= 90 && roundedPercentage < 100 && "w-[95%]",
              roundedPercentage === 100 && "w-full"
            )}
          />
        </div>
        {showLabel && (
          <div className="mt-1 text-right text-sm text-muted-foreground">
            {roundedPercentage}%
          </div>
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
