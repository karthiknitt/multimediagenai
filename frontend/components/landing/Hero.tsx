import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Play, Zap, Film } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 pt-24 pb-20 sm:px-6 lg:px-8">
      {/* Animated Gradient Orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="orb-gradient orb-cyan" />
        <div className="orb-gradient orb-magenta" />
      </div>

      {/* Mesh Gradient Background */}
      <div className="pointer-events-none absolute inset-0 mesh-gradient opacity-50" />

      <div className="relative mx-auto max-w-7xl w-full">
        <div className="text-center">
          {/* Animated Badge */}
          <div className="mb-8 inline-flex items-center gap-2.5 glass rounded-full px-5 py-2 text-sm font-medium mono animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-foreground/90">Powered by Z-Image · Wan2.2 · ACE-Step · Qwen3-TTS</span>
          </div>

          {/* Main Headline with Dramatic Typography */}
          <h1 className="display-title mb-6 animate-fade-in-up stagger-1">
            CREATE ANYTHING
            <br />
            <span className="relative inline-block">
              WITH AI
              <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-magenta-500 rounded-full"></span>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-8 max-w-3xl text-xl sm:text-2xl text-foreground/80 leading-relaxed font-light animate-fade-in-up stagger-2">
            Professional-grade{" "}
            <span className="gradient-text font-semibold">images</span>,{" "}
            <span className="gradient-text font-semibold">videos</span>, and{" "}
            <span className="gradient-text font-semibold">audio</span>{" "}
            generated in seconds. No experience needed.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 animate-fade-in-up stagger-3">
            <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              <span className="mono">20-45s generation</span>
            </div>
            <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2">
              <Film className="h-4 w-4 text-magenta-400" />
              <span className="mono">Up to 4K quality</span>
            </div>
            <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="mono">Commercial rights</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up stagger-4">
            <Link href="/signup" className="btn-premium">
              <span className="flex items-center gap-2 text-base font-semibold">
                <Sparkles className="h-5 w-5" />
                Start Creating Free
              </span>
            </Link>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="glass hover-glow border-foreground/20 text-base font-semibold min-w-44"
            >
              <Link href="#showcase" className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                View Showcase
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-foreground/60 mono">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              <span>10 free daily</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              <span>Unlimited Pro</span>
            </div>
          </div>
        </div>

        {/* Premium Demo Showcase */}
        <div
          id="showcase"
          className="mx-auto mt-20 max-w-6xl"
        >
          <div className="card-premium hover-lift p-0 overflow-hidden">
            {/* Grid of sample outputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5 bg-background/20">
              {/* Image Example */}
              <div className="aspect-square bg-gradient-to-br from-cyan-500/10 to-blue-500/10 relative group overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="h-8 w-8 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">AI Images</h3>
                    <p className="text-sm text-foreground/60">Z-Image Turbo · Up to 4MP</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Video Example */}
              <div className="aspect-square bg-gradient-to-br from-magenta-500/10 to-purple-500/10 relative group overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-magenta-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Film className="h-8 w-8 text-magenta-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">AI Videos</h3>
                    <p className="text-sm text-foreground/60">Wan2.2 · 5s @ 16fps</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Audio Example */}
              <div className="aspect-square bg-gradient-to-br from-blue-500/10 to-cyan-500/10 relative group overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">AI Audio</h3>
                    <p className="text-sm text-foreground/60">ACE-Step · 48kHz stereo</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-3 gap-4 glass rounded-2xl p-6">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mono">45s</div>
              <div className="text-sm text-foreground/60 mt-1">Avg. Generation</div>
            </div>
            <div className="text-center border-l border-r border-foreground/10">
              <div className="text-3xl font-bold gradient-text mono">4K</div>
              <div className="text-sm text-foreground/60 mt-1">Max Resolution</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mono">∞</div>
              <div className="text-sm text-foreground/60 mt-1">Creative Control</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
