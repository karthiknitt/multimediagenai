"use client";

import { Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "Showcase", href: "#showcase" },
  { name: "Docs", href: "/docs" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-foreground/10">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-magenta-500/10 group-hover:scale-110 transition-transform">
              <Sparkles className="h-6 w-6 text-cyan-400" />
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:inline-block">
              AI Video Gen
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-foreground/70 hover:text-cyan-400 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex text-foreground/70 hover:text-cyan-400 hover:bg-cyan-500/10"
            >
              <Link href="/login">Sign In</Link>
            </Button>
            <Link href="/signup" className="btn-premium !py-2 !px-4 text-sm">
              <span>Get Started</span>
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden glass hover-glow rounded-lg p-2 border border-foreground/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 animate-fade-in-up">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-4 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="border-t border-foreground/10 pt-2 mt-2">
              <Link
                href="/login"
                className="block px-4 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
