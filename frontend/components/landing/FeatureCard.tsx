import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  highlight?: string;
  gradient?: string;
  iconColor?: string;
  iconBg?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  features,
  highlight,
  gradient = "from-cyan-500/20 to-blue-500/20",
  iconColor = "text-cyan-400",
  iconBg = "bg-cyan-500/10",
}: FeatureCardProps) {
  return (
    <div className="card-premium hover-lift group h-full">
      {/* Highlight Badge */}
      {highlight && (
        <div className="absolute -right-2 top-6 z-10">
          <div className="glass rounded-full px-3 py-1 text-xs font-bold mono text-cyan-400 border border-cyan-400/30">
            {highlight}
          </div>
        </div>
      )}

      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl`} />

      {/* Content */}
      <div className="relative">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${iconBg} mb-6 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`h-8 w-8 ${iconColor}`} />
        </div>

        {/* Title & Description */}
        <h3 className="text-2xl font-bold mb-3">{title}</h3>
        <p className="text-foreground/70 leading-relaxed mb-6">
          {description}
        </p>

        {/* Features List */}
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm group/item">
              <div className="mt-0.5 flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover/item:bg-cyan-500/20 transition-colors">
                  <Check className="h-3 w-3 text-cyan-400" />
                </div>
              </div>
              <span className="text-foreground/80 leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
