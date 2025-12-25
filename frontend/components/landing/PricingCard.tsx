import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  name: string;
  description: string;
  price: string;
  period?: string;
  icon?: LucideIcon;
  features: string[];
  cta: string;
  ctaLink: string;
  popular?: boolean;
  gradient?: string;
}

export function PricingCard({
  name,
  description,
  price,
  period = "/month",
  icon: Icon,
  features,
  cta,
  ctaLink,
  popular = false,
  gradient = "from-cyan-500/10 to-blue-500/10",
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "card-premium hover-lift h-full flex flex-col relative",
        popular && "ring-2 ring-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
      )}
    >
      {/* Popular Badge */}
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="btn-premium px-4 py-1.5 text-xs font-bold">
            <span>MOST POPULAR</span>
          </div>
        </div>
      )}

      {/* Gradient Background on Hover */}
      <div className={`absolute inset-0 bg-linear-to-br ${gradient} opacity-0 hover:opacity-50 transition-opacity duration-500 rounded-xl pointer-events-none`} />

      {/* Content */}
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="text-center pb-6 border-b border-foreground/10">
          {Icon && (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 mb-4">
              <Icon className="h-6 w-6 text-cyan-400" />
            </div>
          )}
          <h3 className="text-2xl font-bold mb-2">{name}</h3>
          <p className="text-sm text-foreground/60">{description}</p>
        </div>

        {/* Price */}
        <div className="py-8 text-center">
          <div className="flex items-end justify-center gap-1">
            <span className="text-5xl font-bold gradient-text mono">{price}</span>
            {price !== "Custom" && period && (
              <span className="text-foreground/50 mb-2 text-sm mono">/{period.replace("per ", "")}</span>
            )}
          </div>
          {period && price === "Custom" && (
            <p className="text-sm text-foreground/50 mt-2 mono">{period}</p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 flex-1 mb-8">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 shrink-0">
                <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <Check className="h-3 w-3 text-cyan-400" />
                </div>
              </div>
              <span className="text-foreground/80 leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Link href={ctaLink} className={cn(
          "block w-full text-center",
          popular ? "btn-premium" : "glass hover-glow border border-foreground/20 rounded-xl py-3 px-6 font-semibold transition-all"
        )}>
          <span>{cta}</span>
        </Link>
      </div>
    </div>
  );
}
