import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: string;
  iconColor?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  gradient = "from-foreground/5 to-foreground/10",
  iconColor = "text-foreground/60",
  className,
}: StatsCardProps) {
  return (
    <div className={cn("card-premium hover-lift group relative overflow-hidden", className)}>
      {/* Gradient background */}
      <div className={cn(
        "absolute inset-0 bg-linear-to-br opacity-50 group-hover:opacity-70 transition-opacity",
        gradient
      )} />

      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground/60 mb-1 uppercase tracking-wider">
              {title}
            </p>
            <div className="text-3xl font-bold mono gradient-text">{value}</div>
          </div>
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5 group-hover:scale-110 transition-transform",
            iconColor
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>

        {(description || trend) && (
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            {trend && (
              <span
                className={cn(
                  "font-semibold mono",
                  trend.isPositive ? "text-cyan-400" : "text-red-400"
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
