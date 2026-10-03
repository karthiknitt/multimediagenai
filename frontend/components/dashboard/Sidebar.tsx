"use client";

import {
  BarChart3,
  FolderOpen,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Music,
  Settings,
  Sparkles,
  Video,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-cyan-400" },
  { name: "Image Generation", href: "/generate/image", icon: Image, color: "text-cyan-400" },
  { name: "Video Generation", href: "/generate/video", icon: Video, color: "text-magenta-400" },
  { name: "Audio Generation", href: "/generate/audio", icon: Music, color: "text-blue-400" },
  { name: "Gallery", href: "/gallery", icon: FolderOpen, color: "text-foreground/60" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, color: "text-foreground/60" },
  { name: "Settings", href: "/settings", icon: Settings, color: "text-foreground/60" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUserStore();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="fixed left-4 top-4 z-50 lg:hidden glass hover-glow rounded-xl p-2.5 border border-foreground/10"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col glass-strong border-r border-foreground/10 transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-foreground/10 px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="p-2 rounded-xl bg-linear-to-br from-cyan-500/10 to-magenta-500/10 group-hover:scale-110 transition-transform">
              <Sparkles className="h-6 w-6 text-cyan-400" />
            </div>
            <span className="text-xl font-bold gradient-text">AI Video Gen</span>
          </Link>
        </div>

        {/* Quick Stats Badge */}
        <div className="px-6 py-4">
          <div className="glass rounded-xl p-4 border border-cyan-400/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Zap className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-2xl font-bold gradient-text mono">10</div>
                <div className="text-xs text-foreground/60">Daily generations left</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all group relative",
                  isActive
                    ? "glass-strong border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                    : "hover:glass hover:border hover:border-foreground/10",
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-magenta-400 rounded-r-full" />
                )}

                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    isActive ? "bg-cyan-500/20" : "bg-foreground/5 group-hover:bg-foreground/10",
                  )}
                >
                  <item.icon
                    className={cn("h-5 w-5", isActive ? item.color : "text-foreground/60")}
                  />
                </div>

                <span
                  className={cn(isActive ? "text-foreground font-semibold" : "text-foreground/70")}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Upgrade CTA */}
        <div className="px-6 py-4 border-t border-foreground/10">
          <div className="card-premium p-4 text-center">
            <h3 className="text-sm font-bold mb-1 gradient-text">Upgrade to Pro</h3>
            <p className="text-xs text-foreground/60 mb-3">Unlimited generations</p>
            <Link href="/pricing" className="btn-premium !py-2 !px-4 text-xs block">
              <span>Upgrade Now</span>
            </Link>
          </div>
        </div>

        {/* Sign out */}
        <div className="border-t border-foreground/10 p-4">
          <button
            type="button"
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground/60 hover:text-foreground hover:glass hover:border hover:border-foreground/10 transition-all"
            onClick={handleSignOut}
          >
            <div className="p-1.5 rounded-lg bg-foreground/5">
              <LogOut className="h-5 w-5" />
            </div>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
