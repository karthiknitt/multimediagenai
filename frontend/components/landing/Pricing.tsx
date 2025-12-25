import { PricingCard } from "./PricingCard";
import { Sparkles, Crown, Building2 } from "lucide-react";

const plans = [
  {
    name: "Free",
    description: "Perfect for exploring AI generation",
    price: "$0",
    period: "forever",
    icon: Sparkles,
    features: [
      "10 generations daily",
      "All AI models access",
      "1024x1024 resolution",
      "Community support",
      "Basic presets library",
      "Personal use only",
    ],
    cta: "Start Free",
    ctaLink: "/signup",
    gradient: "from-blue-500/10 to-cyan-500/10",
  },
  {
    name: "Pro",
    description: "For serious creators",
    price: "$29",
    period: "per month",
    icon: Crown,
    features: [
      "Unlimited generations",
      "Priority GPU access",
      "Up to 4K resolution",
      "No watermarks",
      "Commercial license",
      "Advanced presets",
      "Priority support",
      "API access (beta)",
    ],
    cta: "Start Pro Trial",
    ctaLink: "/signup?plan=pro",
    popular: true,
    gradient: "from-cyan-500/10 to-magenta-500/10",
  },
  {
    name: "Enterprise",
    description: "Custom solutions at scale",
    price: "Custom",
    period: "contact us",
    icon: Building2,
    features: [
      "Everything in Pro",
      "Dedicated GPU cluster",
      "Custom model training",
      "Team collaboration",
      "SSO & admin controls",
      "SLA guarantee (99.9%)",
      "Dedicated support",
      "Volume discounts",
    ],
    cta: "Contact Sales",
    ctaLink: "/contact",
    gradient: "from-magenta-500/10 to-purple-500/10",
  },
];

export function Pricing() {
  return (
    <section className="relative px-4 py-32 sm:px-6 lg:px-8" id="pricing">
      {/* Ambient Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-magenta-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm mb-6 mono">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Transparent Pricing</span>
          </div>
          <h2 className="text-5xl sm:text-6xl font-bold mb-6">
            Choose Your <span className="gradient-text">Plan</span>
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-foreground/70 leading-relaxed">
            Start free, upgrade anytime. All plans include access to FLUX.2, Mochi, CogVideoX, and MusicGen.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div key={plan.name} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <PricingCard {...plan} />
            </div>
          ))}
        </div>

        {/* Trust Footer */}
        <div className="mt-16 text-center">
          <div className="glass rounded-2xl p-6 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="text-foreground/70">Cancel anytime</span>
              </div>
              <div className="flex items-center justify-center gap-2 border-l-0 sm:border-l border-foreground/10">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="text-foreground/70">No hidden fees</span>
              </div>
              <div className="flex items-center justify-center gap-2 border-l-0 sm:border-l border-foreground/10">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="text-foreground/70">14-day money back</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
