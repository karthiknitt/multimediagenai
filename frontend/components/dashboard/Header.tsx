"use client";

import { useSession } from "@/lib/auth-client";
import { Bell, Search, User } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 glass-strong border-b border-foreground/10">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Spacer for mobile menu button */}
        <div className="w-10 lg:hidden" />

        {/* Search */}
        <div className="hidden max-w-md flex-1 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40 pointer-events-none" />
            <input
              type="search"
              placeholder="Search generations..."
              className="input-premium w-full pl-10 pr-4"
              aria-label="Search generations"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button
            type="button"
            className="glass hover-glow relative flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 transition-all"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
          </button>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{session?.user?.name || "User"}</p>
              <p className="text-xs text-foreground/60 mono">{session?.user?.email}</p>
            </div>
            <button
              type="button"
              className="glass hover-glow flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 transition-all hover:border-cyan-400/30"
              aria-label="User profile"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500/20 to-magenta-500/20">
                <User className="h-4 w-4 text-cyan-400" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
