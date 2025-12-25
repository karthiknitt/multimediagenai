"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number) => void;
  showValue?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value,
      defaultValue = 50,
      min = 0,
      max = 100,
      step = 1,
      onValueChange,
      showValue = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const currentValue = value ?? internalValue;
    const percentage = ((currentValue - min) / (max - min)) * 100;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <div className={cn("relative flex w-full items-center gap-4", className)}>
        <div className="relative flex-1">
          <div className="absolute inset-0 flex items-center">
            <div className="h-2 w-full rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={currentValue}
            onChange={handleChange}
            disabled={disabled}
            className={cn(
              "relative z-10 h-5 w-full cursor-pointer appearance-none bg-transparent",
              "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110",
              "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-110",
              disabled && "cursor-not-allowed opacity-50"
            )}
            {...props}
          />
        </div>
        {showValue && (
          <span className="min-w-[3rem] text-right text-sm font-medium tabular-nums">
            {currentValue}
          </span>
        )}
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
