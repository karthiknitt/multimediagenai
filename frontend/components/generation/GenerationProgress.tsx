"use client";

import { AlertCircle, Clock, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message?: string;
  estimatedTimeRemaining?: string;
  onCancel?: () => void;
  error?: string;
  className?: string;
}

const statusMessages = {
  pending: "Waiting to start...",
  processing: "Generating...",
  completed: "Complete!",
  failed: "Generation failed",
};

const statusIcons = {
  pending: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
  processing: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
  completed: null,
  failed: <AlertCircle className="h-5 w-5 text-destructive" />,
};

export function GenerationProgress({
  status,
  progress,
  message,
  estimatedTimeRemaining,
  onCancel,
  error,
  className,
}: GenerationProgressProps) {
  const isActive = status === "pending" || status === "processing";
  const displayProgress = status === "completed" ? 100 : progress;

  return (
    <Card
      className={cn(
        "transition-all",
        status === "failed" && "border-destructive/50 bg-destructive/5",
        className,
      )}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {statusIcons[status]}
              <span className="text-sm font-medium">{message || statusMessages[status]}</span>
            </div>
            {isActive && onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <Progress
            value={displayProgress}
            variant={status === "failed" ? "error" : status === "completed" ? "success" : "default"}
            showLabel
            size="lg"
          />

          {/* Time remaining */}
          {isActive && estimatedTimeRemaining && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Estimated time remaining: {estimatedTimeRemaining}</span>
            </div>
          )}

          {/* Error message */}
          {status === "failed" && error && (
            <div className="mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
