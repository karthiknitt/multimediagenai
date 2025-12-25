"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Wand2, RotateCcw } from "lucide-react";
import { PromptTemplates } from "./PromptTemplates";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  label?: string;
  showTemplates?: boolean;
  showEnhance?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function PromptInput({
  value,
  onChange,
  maxLength = 2000,
  placeholder = "Describe the image you want to generate...",
  label = "Prompt",
  showTemplates = true,
  showEnhance = true,
  disabled = false,
  className,
  autoFocus = false,
}: PromptInputProps) {
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.9;
  const isOverLimit = characterCount > maxLength;

  // Autofocus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleTemplateSelect = (template: string) => {
    onChange(template);
    setShowTemplateDropdown(false);
    // Focus back on textarea after template selection
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleEnhance = async () => {
    if (!value || value.length < 10) return;

    try {
      // For now, we'll use a client-side enhancement by adding artistic descriptors
      // In production, this would call an AI endpoint
      const enhancements = [
        "highly detailed",
        "professional quality",
        "8K resolution",
        "studio lighting",
        "photorealistic",
        "award-winning",
      ];

      // Add random enhancements that aren't already in the prompt
      const enhancedPrompt = value.trim();
      const availableEnhancements = enhancements.filter(
        e => !enhancedPrompt.toLowerCase().includes(e.toLowerCase())
      );

      if (availableEnhancements.length > 0) {
        const randomEnhancements = availableEnhancements
          .sort(() => 0.5 - Math.random())
          .slice(0, 2)
          .join(", ");
        onChange(`${enhancedPrompt}, ${randomEnhancements}`);
      }

      // TODO: Replace with actual AI enhancement API call
      // const response = await fetch('/api/enhance-prompt', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ prompt: value }),
      // });
      // const data = await response.json();
      // onChange(data.enhancedPrompt);
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
    }
  };

  const handleClear = () => {
    onChange("");
    // Focus back on textarea after clearing
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to clear
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleClear();
      }
      // Ctrl/Cmd + E to enhance (when implemented)
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && value.length > 10) {
        e.preventDefault();
        handleEnhance();
      }
      // Escape to close template dropdown
      if (e.key === 'Escape' && showTemplateDropdown) {
        setShowTemplateDropdown(false);
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value, showTemplateDropdown]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor="prompt" className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {showTemplates && (
            <div className="relative">
              <button
                type="button"
                className="glass hover-glow border border-foreground/10 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                disabled={disabled}
                aria-label="Select prompt template"
                aria-expanded={showTemplateDropdown ? "true" : "false"}
                aria-haspopup="menu"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Templates
              </button>
              {showTemplateDropdown && (
                <PromptTemplates
                  onSelect={handleTemplateSelect}
                  onClose={() => setShowTemplateDropdown(false)}
                />
              )}
            </div>
          )}
          {showEnhance && value.length > 10 && (
            <button
              type="button"
              className="glass hover-glow border border-foreground/10 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magenta-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={handleEnhance}
              disabled={disabled}
              aria-label="Enhance prompt with AI (Ctrl+E)"
            >
              <Wand2 className="h-3.5 w-3.5 text-magenta-400" />
              Enhance
            </button>
          )}
          {value.length > 0 && (
            <button
              type="button"
              className="glass hover-glow border border-foreground/10 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={handleClear}
              disabled={disabled}
              aria-label="Clear prompt (Ctrl+K)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        id="prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={5}
        className={cn(
          "input-premium w-full resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isOverLimit && "border-red-500/50 focus-visible:ring-red-500/30"
        )}
        aria-describedby="prompt-counter"
        aria-label={label}
        aria-invalid={isOverLimit}
        autoComplete="off"
        spellCheck="true"
      />

      <div
        id="prompt-counter"
        className={cn(
          "flex justify-end text-xs mono font-semibold",
          isOverLimit
            ? "text-red-400"
            : isNearLimit
              ? "text-yellow-400"
              : "text-foreground/50"
        )}
      >
        {characterCount.toLocaleString()} / {maxLength.toLocaleString()} characters
      </div>
    </div>
  );
}
