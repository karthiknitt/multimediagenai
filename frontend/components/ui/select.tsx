"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  label?: string;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      defaultValue,
      options,
      onChange,
      placeholder = "Select an option",
      disabled = false,
      className,
      id,
      name,
      required,
      label,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(defaultValue || "");
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const listboxId = React.useId();

    const currentValue = value ?? internalValue;
    const selectedOption = options.find((opt) => opt.value === currentValue);

    const handleSelect = (optionValue: string) => {
      setInternalValue(optionValue);
      onChange?.(optionValue);
      setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(!isOpen);
      } else if (e.key === "ArrowDown" && isOpen) {
        e.preventDefault();
        const currentIndex = options.findIndex((opt) => opt.value === currentValue);
        const nextIndex = Math.min(currentIndex + 1, options.length - 1);
        if (!options[nextIndex].disabled) {
          handleSelect(options[nextIndex].value);
        }
      } else if (e.key === "ArrowUp" && isOpen) {
        e.preventDefault();
        const currentIndex = options.findIndex((opt) => opt.value === currentValue);
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (!options[prevIndex].disabled) {
          handleSelect(options[prevIndex].value);
        }
      }
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div ref={dropdownRef} className={cn("relative w-full", className)}>
        {name && (
          <input type="hidden" name={name} value={currentValue} required={required} />
        )}

        <button
          ref={ref}
          type="button"
          id={id}
          aria-expanded={isOpen ? "true" : "false"}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-label={label || placeholder}
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className={cn(!selectedOption && "text-muted-foreground")}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
          />
        </button>

        {isOpen && (
          <div
            id={listboxId}
            role="listbox"
            aria-label={label || placeholder}
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === currentValue ? "true" : "false"}
                disabled={option.disabled}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  option.value === currentValue && "bg-accent text-accent-foreground",
                  option.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                {option.value === currentValue && (
                  <Check className="absolute left-2 h-4 w-4" />
                )}
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
export type { SelectOption };
