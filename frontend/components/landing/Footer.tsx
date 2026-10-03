"use client";

import { ArrowRight, Heart, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FaGithub, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { Input } from "@/components/ui/input";

const navigation = {
  product: [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Gallery", href: "/gallery" },
    { name: "API Docs", href: "/docs/api" },
  ],
  resources: [
    { name: "Documentation", href: "/docs" },
    { name: "Tutorials", href: "/tutorials" },
    { name: "Blog", href: "/blog" },
    { name: "Changelog", href: "/changelog" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Careers", href: "/careers" },
    { name: "Contact", href: "/contact" },
    { name: "Press Kit", href: "/press" },
  ],
  legal: [
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Cookies", href: "/cookies" },
    { name: "Acceptable Use", href: "/acceptable-use" },
  ],
};

const social = [
  { name: "GitHub", href: "https://github.com", icon: FaGithub },
  { name: "X", href: "https://x.com", icon: FaXTwitter },
  { name: "LinkedIn", href: "https://linkedin.com", icon: FaLinkedinIn },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="relative border-t border-foreground/10 overflow-hidden">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.01)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />

      {/* Gradient Orb */}
      <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-cyan-500/5 to-magenta-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand and Newsletter - Takes up more space */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/10 to-magenta-500/10 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-cyan-400" />
              </div>
              <span className="text-2xl font-bold gradient-text">AI Video Gen</span>
            </Link>
            <p className="text-foreground/60 leading-relaxed mb-8 max-w-sm">
              Professional AI generation for images, videos, and audio. Powered by Z-Image, Wan2.2,
              ACE-Step, and Qwen3-TTS.
            </p>

            {/* Newsletter */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Mail className="h-5 w-5 text-cyan-400" />
                Newsletter
              </h3>
              <p className="text-sm text-foreground/60 mb-4">
                Weekly tips, updates, and AI generation tutorials.
              </p>
              {subscribed ? (
                <div className="glass-strong rounded-xl p-4 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/10 mb-2">
                    <Heart className="h-6 w-6 text-cyan-400" />
                  </div>
                  <p className="text-sm font-semibold text-cyan-400">Thanks for subscribing!</p>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-premium flex-1 text-sm"
                    aria-label="Email for newsletter"
                  />
                  <button
                    type="submit"
                    className="glass hover-glow border border-cyan-400/30 rounded-xl p-3 transition-all hover:bg-cyan-500/10"
                    aria-label="Subscribe"
                  >
                    <ArrowRight className="h-4 w-4 text-cyan-400" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            <div>
              <h3 className="text-sm font-bold mb-4 gradient-text">Product</h3>
              <ul className="space-y-3">
                {navigation.product.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-foreground/60 hover:text-cyan-400 transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-4 gradient-text">Resources</h3>
              <ul className="space-y-3">
                {navigation.resources.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-foreground/60 hover:text-cyan-400 transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-4 gradient-text">Company</h3>
              <ul className="space-y-3">
                {navigation.company.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-foreground/60 hover:text-cyan-400 transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-4 gradient-text">Legal</h3>
              <ul className="space-y-3">
                {navigation.legal.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-foreground/60 hover:text-cyan-400 transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-16 pt-8 border-t border-foreground/10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <p className="text-sm text-foreground/50 mono">
              © {new Date().getFullYear()} AI Video Gen. Crafted with AI.
            </p>

            {/* Social Links */}
            <div className="flex gap-4">
              {social.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass hover-glow rounded-lg p-2.5 transition-all border border-foreground/10 hover:border-cyan-400/30"
                  aria-label={item.name}
                >
                  <item.icon className="h-4 w-4 text-foreground/60 hover:text-cyan-400 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
