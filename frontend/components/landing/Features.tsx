import { Image, Video, Music, Sparkles, Zap, Infinity } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

const features = [
  {
    icon: Image,
    title: "Image Generation",
    description:
      "Create photorealistic images from text using FLUX.2 dev, the most advanced open-source image model.",
    features: [
      "4MP resolution output",
      "Photorealistic or artistic",
      "20s warm / 45s cold start",
      "Advanced prompt control",
      "LoRA fine-tuning support",
    ],
    highlight: "Most Popular",
    gradient: "from-cyan-500/20 to-blue-500/20",
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/10",
  },
  {
    icon: Video,
    title: "Video Generation",
    description:
      "Generate cinematic video clips from text prompts or animate your images with Mochi & CogVideoX.",
    features: [
      "Text-to-video (Mochi)",
      "Image-to-video (CogVideoX)",
      "5.4s @ 30fps, 480p",
      "Smooth motion synthesis",
      "Temporal consistency",
    ],
    gradient: "from-magenta-500/20 to-purple-500/20",
    iconColor: "text-magenta-400",
    iconBg: "bg-magenta-500/10",
  },
  {
    icon: Music,
    title: "Audio Generation",
    description:
      "Compose royalty-free music and sound effects with MusicGen. Perfect soundtracks in seconds.",
    features: [
      "Up to 30s audio clips",
      "Multiple genres & moods",
      "32kHz professional quality",
      "Royalty-free commercial",
      "Instant soundtrack creation",
    ],
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
  },
];

const capabilities = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Generate professional content in under 45 seconds with GPU acceleration",
  },
  {
    icon: Infinity,
    title: "Unlimited Creativity",
    description: "No restrictions on style, subject matter, or artistic direction",
  },
  {
    icon: Sparkles,
    title: "Production Ready",
    description: "High-resolution outputs ready for professional use and commercial projects",
  },
];

export function Features() {
  return (
    <section className="relative px-4 py-32 sm:px-6 lg:px-8" id="features">
      {/* Background Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm mb-6 mono">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Three Powerful Engines</span>
          </div>
          <h2 className="text-5xl sm:text-6xl font-bold mb-6">
            <span className="gradient-text">Everything</span> You Need
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-foreground/70 leading-relaxed">
            Professional-grade AI generation tools powered by cutting-edge models.
            Create images, videos, and audio without limits.
          </p>
        </div>

        {/* Main Feature Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
          {features.map((feature, index) => (
            <div key={feature.title} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>

        {/* Capabilities Section */}
        <div className="mt-24">
          <div className="card-premium hover-lift p-8 sm:p-12">
            <h3 className="text-2xl font-bold text-center mb-12 gradient-text">
              Why Choose Our Platform
            </h3>
            <div className="grid gap-8 md:grid-cols-3">
              {capabilities.map((capability) => (
                <div key={capability.title} className="text-center group">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${features[0].gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <capability.icon className="h-8 w-8 text-cyan-400" />
                  </div>
                  <h4 className="text-lg font-bold mb-2">{capability.title}</h4>
                  <p className="text-sm text-foreground/60">{capability.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
